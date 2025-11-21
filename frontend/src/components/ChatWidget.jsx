import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import io from 'socket.io-client';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
      setSocket(newSocket);

      newSocket.emit('joinRoom', user._id);

      newSocket.on('adminMessage', (data) => {
        if (data.userId === user._id) {
          fetchChat();
        }
      });

      return () => newSocket.close();
    }
  }, [user]);

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
      const data = await api.sendChatMessage({ message }, user?.token);
      setChat(data);
      setMessage('');
      
      if (socket) {
        socket.emit('sendMessage', { userId: user._id, message });
      }
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
