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
  assistant: '',
};

const badgeBase =
  'mb-1 inline-block rounded-[10px] px-2 py-[2px] text-[0.7rem] font-semibold tracking-[0.02em]';

const assistantContent =
  'border-l-[3px] border-solid border-secondary bg-[rgba(243,150,28,0.12)]';

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

      {isOpen && (
        <div className="fixed bottom-[100px] right-[30px] z-[998] flex h-[500px] w-[350px] flex-col overflow-hidden rounded-[12px] bg-[#2a2a2a] shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-[768px]:bottom-[90px] max-[768px]:right-5 max-[768px]:w-[calc(100%_-_40px)]">
          <div className="flex items-center justify-between bg-secondary p-[15px] text-black">
            <h4 className="m-0 text-m">{chat?.escalated ? 'Chat with our team' : 'Ask us anything'}</h4>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center border-none bg-none p-0 text-[20px] text-black"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>

          {/* Assertive would interrupt; polite lets a screen reader finish
              the current sentence before announcing a new reply. */}
          <div
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-[15px]"
            role="log" aria-live="polite" aria-label="Conversation">
            {chat?.messages.map((msg, index) => (
              <div key={index} className={`${messageBase} ${messageVariant[msg.sender] ?? ''}`}>
                {msg.sender === 'assistant' && (
                  <span className={`${badgeBase} bg-secondary text-primary`}>Assistant</span>
                )}
                {msg.sender === 'admin' && (
                  <span className={`${badgeBase} bg-[#1baf7a] text-white`}>Staff</span>
                )}
                <div
                  className={`mb-[5px] ${msg.sender === 'assistant' ? assistantContent : ''}`}
                >
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
            className="flex gap-2.5 border-t border-solid border-[#3a3a3a] p-[15px]"
            onSubmit={handleSendMessage}
          >
            <input
              type="text"
              placeholder="Type your message..."
              aria-label="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-[20px] border border-solid border-[#3a3a3a] bg-[#1a1a1a] p-2.5 text-white outline-none"
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
