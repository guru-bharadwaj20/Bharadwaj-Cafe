import Anthropic from '@anthropic-ai/sdk';
import type { Types } from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { ServiceUnavailableError } from '../utils/errors.js';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'assistant' });

/**
 * AI support assistant.
 *
 * Answers customer questions using tools that read this cafe's real data
 * rather than a hand-maintained FAQ, so it cannot go stale and cannot invent
 * a menu item or an order status.
 *
 * The security model is the important part: every tool is bound to the
 * authenticated customer at call time. The model chooses *which* tool to
 * call and with what arguments, but it can never choose *whose* data to read
 * — the user id comes from the request's JWT and is closed over here, never
 * passed through the model.
 */

export const assistantEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!assistantEnabled()) {
    throw new ServiceUnavailableError('The AI assistant is not configured');
  }
  client ??= new Anthropic();
  return client;
};

const SYSTEM_PROMPT = `You are the support assistant for Bharadwaj's Cafe, an Indian coffee shop.

Help customers with the menu, their own orders, and their loyalty points. Be
warm and brief — two or three sentences unless more detail is genuinely needed.
Prices are in Indian rupees.

Use your tools to look things up. Never guess a price, an availability, or an
order status: if a tool did not tell you, say you do not know and offer to
connect the customer to a member of staff.

You can read the customer's own information only. If they ask about someone
else's order or account, explain that you can only see their own.

You cannot place, change, cancel, or refund orders, and you cannot apply
discounts. For any of those, tell the customer a staff member will pick up
the conversation shortly.`;

/** What the model is allowed to look up. */
const tools: Anthropic.Tool[] = [
  {
    name: 'search_menu',
    description:
      'Search the current menu. Call this whenever the customer asks what is available, ' +
      'what something costs, whether an item is vegan or gluten-free, or for a recommendation.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search over item names, descriptions and tags.',
        },
        category: {
          type: 'string',
          enum: ['coffee', 'tea', 'snacks', 'pastries'],
          description: 'Restrict results to one category.',
        },
        dietary: {
          type: 'string',
          enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'],
          description: 'Restrict results to items carrying this dietary tag.',
        },
      },
    },
  },
  {
    name: 'get_my_recent_orders',
    description:
      "Look up the customer's own recent orders. Call this when they ask about an order's " +
      'status, what they ordered before, or when something will be ready.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many recent orders to return (1-10, default 5).',
        },
      },
    },
  },
  {
    name: 'get_my_loyalty_status',
    description:
      "Look up the customer's loyalty points, tier and lifetime spend. Call this when they " +
      'ask about points, rewards, or their membership tier.',
    input_schema: { type: 'object', properties: {} },
  },
];

/**
 * Executes a tool call.
 *
 * `userId` is supplied by the caller from the verified session — it is not a
 * tool parameter, so no prompt can redirect a lookup to another customer.
 */
const runTool = async (
  name: string,
  input: Record<string, unknown>,
  userId: Types.ObjectId | string
): Promise<string> => {
  switch (name) {
    case 'search_menu': {
      const query: Record<string, unknown> = { available: true };

      if (typeof input.query === 'string' && input.query.trim()) {
        const term = input.query.trim();
        query.$or = [
          { name: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { tags: { $regex: term, $options: 'i' } },
        ];
      }
      if (typeof input.category === 'string') query.category = input.category;
      if (typeof input.dietary === 'string') query.dietary = input.dietary;

      const items = await MenuItem.find(query)
        .select('name description price category dietary rating stock')
        .limit(12)
        .lean();

      if (items.length === 0) {
        return 'No matching items are on the menu right now.';
      }

      return JSON.stringify(
        items.map((item) => ({
          name: item.name,
          description: item.description,
          priceRupees: item.price,
          category: item.category,
          dietary: item.dietary,
          rating: item.rating || null,
          // Surfaced so the assistant can warn about low stock rather than
          // promising something that is nearly gone.
          inStock: item.stock === null ? 'not tracked' : item.stock,
        }))
      );
    }

    case 'get_my_recent_orders': {
      const requested = Number(input.limit ?? 5);
      const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 10) : 5;

      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('items totalAmount status orderType createdAt paymentStatus')
        .lean();

      if (orders.length === 0) {
        return 'This customer has not placed any orders yet.';
      }

      return JSON.stringify(
        orders.map((order) => ({
          reference: order._id.toString().slice(-8).toUpperCase(),
          placedAt: order.createdAt.toISOString(),
          status: order.status,
          orderType: order.orderType,
          paymentStatus: order.paymentStatus,
          totalRupees: order.totalAmount,
          items: order.items.map((item) => `${item.name ?? 'item'} x${item.quantity}`),
        }))
      );
    }

    case 'get_my_loyalty_status': {
      const user = await User.findById(userId)
        .select('loyaltyPoints loyaltyTier totalSpent')
        .lean();

      if (!user) return 'Could not find this customer account.';

      return JSON.stringify({
        points: user.loyaltyPoints,
        tier: user.loyaltyTier,
        lifetimeSpendRupees: user.totalSpent,
        conversion: '100 points = Rs.10 off',
      });
    }

    default:
      return `Unknown tool: ${name}`;
  }
};

export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  text: string;
  /** Which lookups ran — surfaced in the UI so the answer is auditable. */
  toolsUsed: string[];
  /** True when the assistant could not answer and staff should take over. */
  needsHuman: boolean;
}

// A hard stop on the tool loop. Without it a pathological conversation could
// keep calling tools indefinitely, burning tokens on every turn.
const MAX_TOOL_ROUNDS = 5;

/**
 * Answers one customer message, running any tool calls the model requests.
 */
export const askAssistant = async (
  history: AssistantTurn[],
  userId: Types.ObjectId | string
): Promise<AssistantReply> => {
  const anthropic = getClient();

  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return {
        text: text || 'Sorry, I could not work that out. Let me get a staff member for you.',
        toolsUsed,
        needsHuman: !text,
      };
    }

    // Preserve the assistant turn verbatim — dropping the tool_use blocks
    // would break the tool_result pairing on the next request.
    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    // All results go back in a single user message; splitting them across
    // several teaches the model to stop making parallel calls.
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      toolsUsed.push(toolUse.name);
      try {
        const result = await runTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          userId
        );
        results.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
      } catch (error) {
        log.error({ err: error, tool: toolUse.name }, 'assistant tool failed');
        // Reported as an error result rather than thrown, so the model can
        // apologise gracefully instead of the request failing outright.
        results.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'That lookup failed.',
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: results });
  }

  log.warn({ toolsUsed }, 'assistant hit the tool-round limit');
  return {
    text: 'That is taking me longer than expected — let me get a staff member to help you.',
    toolsUsed,
    needsHuman: true,
  };
};
