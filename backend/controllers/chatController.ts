import type { RequestHandler } from 'express';
import type { Server } from 'socket.io';
import Chat from '../models/Chat.js';
import type { HydratedUser } from '../models/User.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';

const MAX_MESSAGE_LENGTH = 2000;

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getIo = (req: { app: { get(name: string): unknown } }): Server | undefined =>
  req.app.get('io') as Server | undefined;

/** Trims and validates an inbound message body. */
const readMessage = (body: unknown): string | null => {
  const raw = (body as { message?: unknown } | undefined)?.message;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return null;
  return trimmed;
};

// @desc    Get or create user chat
// @route   GET /api/chat
// @access  Private
export const getUserChat: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    let chat = await Chat.findOne({ user: user._id }).populate('user', 'name email');

    if (!chat) {
      chat = await Chat.create({ user: user._id, messages: [] });
      chat = await chat.populate('user', 'name email');
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load chat') });
  }
};

// @desc    Send message
// @route   POST /api/chat/message
// @access  Private
export const sendMessage: RequestHandler = async (req, res) => {
  try {
    const message = readMessage(req.body);

    if (!message) {
      res.status(400).json({ message: 'Message must be between 1 and 2000 characters' });
      return;
    }

    const user = req.user as HydratedUser;
    let chat = await Chat.findOne({ user: user._id });

    if (!chat) {
      chat = await Chat.create({ user: user._id, messages: [] });
    }

    chat.messages.push({ sender: 'user', message, timestamp: new Date(), read: false });
    chat.lastMessage = new Date();
    await chat.save();

    // Notify staff only. This used to be broadcast to every connected client.
    emitToAdmins(getIo(req), 'newMessage', {
      chatId: chat._id,
      userId: user._id,
      name: user.name,
      message,
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to send message') });
  }
};

// @desc    Get all chats (Admin)
// @route   GET /api/chat/admin
// @access  Private/Admin
export const getAllChats: RequestHandler = async (_req, res) => {
  try {
    const chats = await Chat.find().populate('user', 'name email').sort('-lastMessage');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load chats') });
  }
};

// @desc    Send admin message
// @route   POST /api/chat/:chatId/admin-message
// @access  Private/Admin
export const sendAdminMessage: RequestHandler = async (req, res) => {
  try {
    const message = readMessage(req.body);

    if (!message) {
      res.status(400).json({ message: 'Message must be between 1 and 2000 characters' });
      return;
    }

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    chat.messages.push({ sender: 'admin', message, timestamp: new Date(), read: false });
    chat.lastMessage = new Date();
    await chat.save();

    // Delivered to the one customer this chat belongs to.
    emitToUser(getIo(req), chat.user, 'adminMessage', {
      chatId: chat._id,
      message,
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to send message') });
  }
};

// @desc    Close chat
// @route   PUT /api/chat/:chatId/close
// @access  Private/Admin
export const closeChat: RequestHandler = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    chat.status = 'closed';
    await chat.save();

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to close chat') });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/:chatId/read
// @access  Private
export const markAsRead: RequestHandler = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    // Any authenticated user could previously pass any chat id here, which
    // both mutated and returned a stranger's entire conversation.
    const user = req.user as HydratedUser;
    const isOwner = chat.user.equals(user._id);
    if (!isOwner && user.role !== 'admin') {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    chat.messages.forEach((msg) => {
      if (msg.sender !== 'user') {
        msg.read = true;
      }
    });

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update chat') });
  }
};
