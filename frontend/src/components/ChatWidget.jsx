import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { socket, connectSocket, disconnectSocket } from '../utils/socket';

/**
 * Chat widget.
 *
 * Migrated from chat.css. Note the three message variants are not symmetric:
 * only `user` and `admin` set an alignment, so an assistant reply keeps the
 * column's default stretch — that is deliberate, it is the assistant's tinted
 * content block that distinguishes it, not its position.
 */

const messageBase = 'max-w-[70%] break-words rounded-[12px] px-[15px] py-2.5';

const messageVariant = {
  user: 'self-end rounded-br-[4px] bg-secondary text-black',
  admin: 'self-start rounded-bl-[4px] bg-[#3a3a3a] text-white',
  // Stated rather than inherited: this variant sets no background of its own,
  // so with no colour it took the document default and rendered near-black on
  // the panel's dark surface.
  assistant: 'text-white',
};

const badgeBase =
  'mb-1 inline-block rounded-[10px] px-2 py-[2px] text-[0.7rem] font-semibold tracking-[0.02em]';

/*
 * The three zeroed sides are load-bearing. `border-solid` sets the style on all
 * four sides, and with Preflight off the other three fall back to the CSS
 * initial width of `medium` (3px) rather than 0 -- a one-sided border utility
 * quietly draws a box. These zeroes touch different properties from
 * `border-l-[3px]`, so no stylesheet-order tie-break is involved.
 */
const assistantContent =
  'border-y-0 border-l-[3px] border-r-0 border-solid border-secondary bg-[rgba(243,150,28,0.12)]';

/** Openers for the empty state, so the first message is not a blank page. */
const SUGGESTIONS = ["What's popular?", 'Do you have vegan options?', 'Where are you located?'];

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  // A plain binding rather than `user?.token` inline: an optional-chain
  // expression in a dependency array defeats the compiler's memoisation check.
  const token = user?.token;

  // Declared before the effects that call it, and memoised on the token, so
  // the socket handler never closes over a stale fetch.
  const fetchChat = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getUserChat(token);
      setChat(data);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    // The server places this socket in the current user's room based on the
    // token, so replies arriving here are already known to be for us.
    connectSocket(token);

    const handleReply = () => fetchChat();
    socket.on('adminMessage', handleReply);
    socket.on('assistantMessage', handleReply);

    return () => {
      socket.off('adminMessage', handleReply);
      socket.off('assistantMessage', handleReply);
      disconnectSocket();
    };
  }, [token, fetchChat]);

  useEffect(() => {
    if (isOpen) {
      fetchChat();
    }
  }, [isOpen, fetchChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // Persisting the message is what notifies staff; the server emits to
      // the admin room from the request handler. Emitting from the client
      // would let anyone forge a message from any user.
      const data = await api.sendChatMessage({ message }, user?.token);
      setChat(data);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        className="fixed bottom-[30px] right-[30px] z-[999] h-[60px] w-[60px] cursor-pointer rounded-circle border-none bg-secondary text-[24px] text-black shadow-[0_5px_20px_rgba(243,150,28,0.4)] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_25px_rgba(243,150,28,0.6)] max-[768px]:bottom-5 max-[768px]:right-5"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat with us'}
        aria-expanded={isOpen}
      >
        <i className="fas fa-comments" aria-hidden="true"></i>
        {chat?.messages.some((m) => m.sender === 'admin' && !m.read) && (
          <span className="absolute right-2 top-2 h-3 w-3 rounded-circle border-2 border-solid border-black bg-[#f44336]"></span>
        )}
      </button>

      {/* `max-h` on the panel is what keeps its header on screen. It is
          anchored to the bottom and 520px tall, so on a laptop viewport of
          around 630px it ran off the top — and being fixed, scrolling could
          not bring it back. It now shrinks to fit whatever height there is. */}
      {isOpen && (
        <div className="fixed bottom-[100px] right-[30px] z-[998] flex h-[520px] max-h-[calc(100vh-130px)] w-[370px] flex-col overflow-hidden rounded-[20px] border border-solid border-[rgba(255,255,255,0.12)] bg-[#211216] shadow-[0_20px_60px_rgba(0,0,0,0.55)] max-[768px]:bottom-[90px] max-[768px]:right-4 max-[768px]:max-h-[calc(100vh-120px)] max-[768px]:w-[calc(100%_-_32px)]">
          {/* Maroon rather than a slab of amber: the old header was a flat
              orange bar with black text sitting on a grey void. */}
          <div className="flex items-center gap-3 border-x-0 border-b border-t-0 border-solid border-[rgba(255,255,255,0.1)] bg-primary p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-circle bg-secondary text-[16px] text-primary">
              <i className="fas fa-mug-hot" aria-hidden="true"></i>
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="m-0 truncate text-n font-bold text-white">
                {chat?.escalated ? 'Chat with our team' : "Bharadwaj's Cafe"}
              </h4>
              <p className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.6)]">
                <span className="inline-block h-1.5 w-1.5 rounded-circle bg-[#1baf7a]"></span>
                {chat?.escalated ? 'A barista is with you' : 'Usually replies instantly'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-circle border-none bg-[rgba(255,255,255,0.1)] p-0 text-[14px] text-white transition-colors duration-200 hover:bg-[rgba(255,255,255,0.2)]"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>

          {/* Assertive would interrupt; polite lets a screen reader finish
              the current sentence before announcing a new reply. */}
          <div
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-[15px]"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            {/* An empty conversation used to be a grey void with nothing in it
                and no hint of what this box was for. */}
            {!chat?.messages?.length && (
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-circle bg-[rgba(243,150,28,0.15)] text-[22px] text-secondary">
                  <i className="fas fa-mug-hot" aria-hidden="true"></i>
                </span>
                <h5 className="mb-1.5 text-m font-bold text-white">
                  Welcome to Bharadwaj&apos;s Cafe!
                </h5>
                <p className="mb-5 text-s leading-relaxed text-[rgba(255,255,255,0.6)]">
                  Ask about our menu, track an order, or tell us how you like your coffee.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setMessage(suggestion)}
                      className="cursor-pointer rounded-m border border-solid border-[rgba(255,255,255,0.15)] bg-transparent px-3 py-1.5 text-s text-[rgba(255,255,255,0.75)] transition-colors duration-200 hover:border-secondary hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat?.messages.map((msg, index) => (
              <div key={index} className={`${messageBase} ${messageVariant[msg.sender] ?? ''}`}>
                {msg.sender === 'assistant' && (
                  <span className={`${badgeBase} bg-secondary text-primary`}>Assistant</span>
                )}
                {msg.sender === 'admin' && (
                  <span className={`${badgeBase} bg-[#1baf7a] text-white`}>Staff</span>
                )}
                <div className={`mb-[5px] ${msg.sender === 'assistant' ? assistantContent : ''}`}>
                  {msg.message}
                </div>
                <span className="text-[10px] opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className="flex gap-2.5 border-x-0 border-b-0 border-t border-solid border-[#3a3a3a] p-[15px]"
            onSubmit={handleSendMessage}
          >
            <input
              type="text"
              placeholder="Type your message..."
              aria-label="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-m border border-solid border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.3)] px-4 py-2.5 text-s text-white placeholder:text-[rgba(255,255,255,0.35)] outline-none focus:border-secondary"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-circle border-none bg-secondary text-black transition-all duration-300 hover:scale-110"
            >
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
