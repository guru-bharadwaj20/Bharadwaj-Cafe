import type { RequestHandler } from 'express';
import Address, { type IAddress } from '../models/Address.js';
import type { HydratedUser } from '../models/User.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// @desc    Get all addresses for user
// @route   GET /api/addresses
// @access  Private
export const getAddresses: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    const addresses = await Address.find({ user: user._id }).sort('-isDefault');
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load addresses') });
  }
};

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
export const createAddress: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    const address = await Address.create({
      ...(req.body as Partial<IAddress>),
      user: user._id,
    });

    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to create address') });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress: RequestHandler = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    const user = req.user as HydratedUser;
    if (!address.user.equals(user._id)) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // `user` is stripped so a request body cannot reassign ownership.
    const { user: _ignored, ...updates } = req.body as Partial<IAddress>;
    Object.assign(address, updates);
    const updatedAddress = await address.save();

    res.json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update address') });
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress: RequestHandler = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    const user = req.user as HydratedUser;
    if (!address.user.equals(user._id)) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    await address.deleteOne();
    res.json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete address') });
  }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultAddress: RequestHandler = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    const user = req.user as HydratedUser;
    if (!address.user.equals(user._id)) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Remove default from all other addresses
    await Address.updateMany({ user: user._id }, { isDefault: false });

    address.isDefault = true;
    await address.save();

    res.json(address);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to set default address') });
  }
};
