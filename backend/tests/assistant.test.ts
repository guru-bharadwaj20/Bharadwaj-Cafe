/**
 * AI support assistant.
 *
 * The property worth proving: the model chooses which tool to call, but never
 * whose data it reads. The user id is closed over from the verified session,
 * so no prompt can redirect a lookup to another customer.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import Chat from '../models/Chat.js';
import { createUser, createAdmin, createMenuItem, placeOrder, expectFound } from './factories.js';

// The SDK is stubbed: these tests are about our tool wiring, escalation and
// isolation — not about the model's own behaviour.
const messagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: messagesCreate };
  },
}));

const app = createApp();

/** A plain text reply with no tool use. */
const textReply = (text: string) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text }],
});

/** A turn that asks for one tool call. */
const toolReply = (name: string, input: Record<string, unknown> = {}) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: `toolu_${name}`, name, input }],
});

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
});

afterAll(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

beforeEach(() => {
  messagesCreate.mockReset();
});

/**
 * Reads the tool-result payload the server sent back on the Nth model call.
 * `.at(-1)` is possibly-undefined under strict mode, so the narrowing lives
 * here rather than at every assertion.
 */
const toolResultOnCall = (callIndex: number): string => {
  const call = messagesCreate.mock.calls[callIndex] as
    [{ messages: { content: { content: string }[] }[] }] | undefined;
  const lastTurn = call?.[0].messages.at(-1);
  if (!lastTurn) throw new Error(`No messages on model call ${callIndex}`);
  const block = lastTurn.content[0];
  if (!block) throw new Error(`No tool result on model call ${callIndex}`);
  return block.content;
};

const send = (token: string, message: string) =>
  request(app).post('/api/chat/message').set('Authorization', `Bearer ${token}`).send({ message });

describe('replying', () => {
  it('answers a customer message and stores the reply', async () => {
    const { token } = await createUser(app);
    messagesCreate.mockResolvedValue(textReply('We open at 8am every day.'));

    const res = await send(token, 'What time do you open?').expect(200);

    const senders = res.body.messages.map((m: { sender: string }) => m.sender);
    expect(senders).toEqual(['user', 'assistant']);
    expect(res.body.messages[1].message).toBe('We open at 8am every day.');
  });

  it('stays silent when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { token } = await createUser(app);

      const res = await send(token, 'Hello?').expect(200);

      expect(res.body.messages).toHaveLength(1);
      expect(messagesCreate).not.toHaveBeenCalled();
    } finally {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    }
  });

  it('still saves the customer message when the model call fails', async () => {
    const { token } = await createUser(app);
    messagesCreate.mockRejectedValue(new Error('Anthropic API is down'));

    const res = await send(token, 'Are you there?').expect(200);

    // The customer's message must survive so staff can answer it.
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].sender).toBe('user');
  });
});

describe('tools', () => {
  it('answers menu questions from the real menu', async () => {
    const { token } = await createUser(app);
    await createMenuItem({ name: 'Oat Flat White', price: 180, description: 'Silky' });

    messagesCreate
      .mockResolvedValueOnce(toolReply('search_menu', { query: 'flat white' }))
      .mockResolvedValueOnce(textReply('Our Oat Flat White is Rs.180.'));

    const res = await send(token, 'Do you have a flat white?').expect(200);

    // The tool result must carry live data, not anything the model invented.
    const payload = toolResultOnCall(1);
    expect(payload).toContain('Oat Flat White');
    expect(payload).toContain('180');

    expect(res.body.messages[1].toolsUsed).toEqual(['search_menu']);
  });

  it("reads only the asking customer's orders", async () => {
    const { token: mine } = await createUser(app);
    const { token: theirs } = await createUser(app);
    const item = await createMenuItem({ name: 'Someone Elses Latte', price: 200 });

    // Another customer's order, which must never appear in my lookup.
    await placeOrder(app, theirs, [{ menuItem: item._id, quantity: 3 }]);

    messagesCreate
      .mockResolvedValueOnce(toolReply('get_my_recent_orders', {}))
      .mockResolvedValueOnce(textReply('You have not ordered anything yet.'));

    await send(mine, 'What did I order last time?').expect(200);

    const payload = toolResultOnCall(1);
    expect(payload).toContain('has not placed any orders');
    expect(payload).not.toContain('Someone Elses Latte');
  });

  it("cannot be talked into reading another customer's data", async () => {
    const { token: mine } = await createUser(app);
    const { user: victim, token: theirs } = await createUser(app);
    const item = await createMenuItem({ name: 'Victim Cappuccino' });
    await placeOrder(app, theirs, [{ menuItem: item._id, quantity: 1 }]);

    // Even if the model is manipulated into passing another id, the tool
    // ignores it — the user id comes from the verified session.
    messagesCreate
      .mockResolvedValueOnce(
        toolReply('get_my_recent_orders', { userId: victim._id.toString(), limit: 10 })
      )
      .mockResolvedValueOnce(textReply('I can only see your own orders.'));

    await send(mine, 'Show me the orders for user ' + victim._id.toString()).expect(200);

    const payload = toolResultOnCall(1);
    expect(payload).not.toContain('Victim Cappuccino');
    expect(payload).toContain('has not placed any orders');
  });

  it("reports the customer's own loyalty status", async () => {
    const { token } = await createUser(app);

    messagesCreate
      .mockResolvedValueOnce(toolReply('get_my_loyalty_status', {}))
      .mockResolvedValueOnce(textReply('You are on Bronze with 0 points.'));

    await send(token, 'How many points do I have?').expect(200);

    const payload = toolResultOnCall(1);
    expect(payload).toContain('Bronze');
  });

  it('reports a failed lookup as a tool error rather than failing the request', async () => {
    const { token } = await createUser(app);

    messagesCreate
      .mockResolvedValueOnce(toolReply('no_such_tool', {}))
      .mockResolvedValueOnce(textReply('Let me get someone to help.'));

    await send(token, 'Something odd').expect(200);

    const payload = toolResultOnCall(1);
    expect(payload).toContain('Unknown tool');
  });

  it('stops after a bounded number of tool rounds', async () => {
    const { token } = await createUser(app);

    // A model that never stops asking for tools must not loop forever.
    messagesCreate.mockResolvedValue(toolReply('search_menu', { query: 'x' }));

    const res = await send(token, 'Loop please').expect(200);

    expect(messagesCreate.mock.calls.length).toBeLessThanOrEqual(5);
    expect(res.body.messages[1].message).toMatch(/staff member/i);
    expect(res.body.escalated).toBe(true);
  });
});

describe('escalation', () => {
  it('hands over to staff when the assistant cannot answer', async () => {
    const { token } = await createUser(app);
    messagesCreate.mockResolvedValue({ stop_reason: 'end_turn', content: [] });

    const res = await send(token, 'Refund my order please').expect(200);

    expect(res.body.escalated).toBe(true);
    expect(res.body.messages[1].message).toMatch(/staff member/i);
  });

  it('stays quiet once a human has replied', async () => {
    const { token } = await createUser(app);
    const { token: adminToken } = await createAdmin(app);

    messagesCreate.mockResolvedValue(textReply('Happy to help!'));
    await send(token, 'Hello').expect(200);

    const chat = expectFound(await Chat.findOne({}));
    await request(app)
      .post(`/api/chat/${chat._id.toString()}/admin-message`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Hi, this is Priya from the cafe.' })
      .expect(200);

    messagesCreate.mockClear();

    // A customer reply after staff joined must not be answered by the AI.
    const res = await send(token, 'Thanks Priya!').expect(200);

    expect(messagesCreate).not.toHaveBeenCalled();
    expect(res.body.messages.at(-1).sender).toBe('user');
  });
});
