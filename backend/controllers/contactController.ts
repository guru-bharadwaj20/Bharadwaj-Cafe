import type { RequestHandler } from 'express';
import Contact, { type ContactStatus } from '../models/Contact.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const CONTACT_STATUSES: readonly ContactStatus[] = ['new', 'read', 'responded'];

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContact: RequestHandler = async (req, res) => {
  try {
    const { name, email, message } = req.body as {
      name?: string;
      email?: string;
      message?: string;
    };

    if (!name || !email || !message) {
      res.status(400).json({ message: 'Please provide all required fields' });
      return;
    }

    const contact = await Contact.create({ name, email, message });

    res.status(201).json({
      message: 'Thank you for contacting us! We will get back to you soon.',
      contact,
    });
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to submit contact form') });
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
export const getContacts: RequestHandler = async (_req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load messages') });
  }
};

// @desc    Update contact status
// @route   PUT /api/contact/:id
// @access  Private/Admin
export const updateContactStatus: RequestHandler = async (req, res) => {
  try {
    const { status } = req.body as { status?: ContactStatus };

    if (status && !CONTACT_STATUSES.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      res.status(404).json({ message: 'Contact message not found' });
      return;
    }

    contact.status = status ?? contact.status;
    const updatedContact = await contact.save();
    res.json(updatedContact);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to update message') });
  }
};
