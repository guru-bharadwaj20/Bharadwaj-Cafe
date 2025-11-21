import Address from '../models/Address.js';

// @desc    Get all addresses for user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort('-isDefault');
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
export const createAddress = async (req, res) => {
  try {
    const address = await Address.create({
      ...req.body,
      user: req.user._id
    });

    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (address.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    Object.assign(address, req.body);
    const updatedAddress = await address.save();

    res.json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (address.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await address.deleteOne();
    res.json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (address.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Remove default from all other addresses
    await Address.updateMany(
      { user: req.user._id },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    res.json(address);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
