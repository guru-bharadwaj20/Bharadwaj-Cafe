import Chat from '../models/Chat.js';

// @desc    Get or create user chat
// @route   GET /api/chat
// @access  Private
export const getUserChat = async (req, res) => {
  try {
    let chat = await Chat.findOne({ user: req.user._id })
      .populate('user', 'name email');

    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: []
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
    const { message } = req.body;

    let chat = await Chat.findOne({ user: req.user._id });

    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: []
      });
    }

    chat.messages.push({
      sender: 'user',
      message
    });

    chat.lastMessage = Date.now();
    await chat.save();

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
    const chats = await Chat.find()
      .populate('user', 'name email')
      .sort('-lastMessage');

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
    const { message } = req.body;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.messages.push({
      sender: 'admin',
      message
    });

    chat.lastMessage = Date.now();
    await chat.save();

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

    chat.messages.forEach(msg => {
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
