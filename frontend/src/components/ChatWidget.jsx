import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { socket, connectSocket, disconnectSocket } from '../utils/socket';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user?.token) return undefined;

    // The server places this socket in the current user's room based on the
    // token, so replies arriving here are already known to be for us.
    connectSocket(user.token);

    const handleAdminMessage = () => fetchChat();
    socket.on('adminMessage', handleAdminMessage);

    return () => {
      socket.off('adminMessage', handleAdminMessage);
      disconnectSocket();
    };
  }, [user?.token]);

  useEffect(() => {
    if (isOpen && user) {
      fetchChat();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const fetchChat = async () => {
    try {
      const data = await api.getUserChat(user?.token);
      setChat(data);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      >
        <i className="fas fa-comments"></i>
        {chat?.messages.some(m => m.sender === 'admin' && !m.read) && (
          <span className="unread-badge"></span>
        )}
      </button>

      {isOpen && (
        <div className="chat-widget">
          <div className="chat-header">
            <h4>Chat with us</h4>
            <button onClick={() => setIsOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="chat-messages">
            {chat?.messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-content">{msg.message}</div>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
