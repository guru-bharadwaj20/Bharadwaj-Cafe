import Chat from '../models/Chat.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';

const MAX_MESSAGE_LENGTH = 2000;

// @desc    Get or create user chat
// @route   GET /api/chat
// @access  Private
export const getUserChat = async (req, res) => {
  try {
    let chat = await Chat.findOne({ user: req.user._id }).populate('user', 'name email');

    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: [],
      });
      chat = await chat.populate('user', 'name email');
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send message
// @route   POST /api/chat/message
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: 'Message is too long' });
    }

    let chat = await Chat.findOne({ user: req.user._id });

    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: [],
      });
    }

    chat.messages.push({
      sender: 'user',
      message,
    });

    chat.lastMessage = Date.now();
    await chat.save();

    // Notify staff only. This used to be broadcast to every connected client.
    emitToAdmins(req.app.get('io'), 'newMessage', {
      chatId: chat._id,
      userId: req.user._id,
      name: req.user.name,
      message,
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all chats (Admin)
// @route   GET /api/chat/admin
// @access  Private/Admin
export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find().populate('user', 'name email').sort('-lastMessage');

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send admin message
// @route   POST /api/chat/:chatId/admin-message
// @access  Private/Admin
export const sendAdminMessage = async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: 'Message is too long' });
    }

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.messages.push({
      sender: 'admin',
      message,
    });

    chat.lastMessage = Date.now();
    await chat.save();

    // Delivered to the one customer this chat belongs to.
    emitToUser(req.app.get('io'), chat.user, 'adminMessage', {
      chatId: chat._id,
      message,
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Close chat
// @route   PUT /api/chat/:chatId/close
// @access  Private/Admin
export const closeChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.status = 'closed';
    await chat.save();

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/:chatId/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Any authenticated user could previously pass any chat id here, which
    // both mutated and returned a stranger's entire conversation.
    const isOwner = chat.user.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.messages.forEach((msg) => {
      if (msg.sender !== 'user') {
        msg.read = true;
      }
    });

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
