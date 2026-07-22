import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { socket, connectSocket, disconnectSocket } from '../utils/socket';

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
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat with us'}
        aria-expanded={isOpen}
      >
        <i className="fas fa-comments" aria-hidden="true"></i>
        {chat?.messages.some((m) => m.sender === 'admin' && !m.read) && (
          <span className="unread-badge"></span>
        )}
      </button>

      {isOpen && (
        <div className="chat-widget">
          <div className="chat-header">
            <h4>{chat?.escalated ? 'Chat with our team' : 'Ask us anything'}</h4>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>

          {/* Assertive would interrupt; polite lets a screen reader finish
              the current sentence before announcing a new reply. */}
          <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
            {chat?.messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.sender === 'assistant' && <span className="message-badge">Assistant</span>}
                {msg.sender === 'admin' && <span className="message-badge staff">Staff</span>}
                <div className="message-content">{msg.message}</div>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              aria-label="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" aria-label="Send message">
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
