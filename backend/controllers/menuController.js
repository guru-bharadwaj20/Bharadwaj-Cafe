import MenuItem from '../models/MenuItem.js';

// @desc    Get all menu items with search and filters
// @route   GET /api/menu
// @access  Public
export const getMenuItems = async (req, res) => {
  try {
    const { search, category, dietary, minPrice, maxPrice, sortBy } = req.query;
    
    let query = { available: true };

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by dietary preferences
    if (dietary) {
      query.dietary = { $in: dietary.split(',') };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Build sort options
    let sort = '-createdAt'; // Default sort
    if (sortBy === 'price-low') sort = 'price';
    else if (sortBy === 'price-high') sort = '-price';
    else if (sortBy === 'rating') sort = '-rating';
    else if (sortBy === 'popular') sort = '-reviewCount';

    const menuItems = await MenuItem.find(query).sort(sort);
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single menu item
// @route   GET /api/menu/:id
// @access  Public
export const getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (menuItem) {
      res.json(menuItem);
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create menu item
// @route   POST /api/menu
// @access  Private/Admin
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      image,
      category,
    });

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
export const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
      menuItem.name = req.body.name || menuItem.name;
      menuItem.description = req.body.description || menuItem.description;
      menuItem.price = req.body.price || menuItem.price;
      menuItem.image = req.body.image || menuItem.image;
      menuItem.category = req.body.category || menuItem.category;
      menuItem.available = req.body.available ?? menuItem.available;

      const updatedMenuItem = await menuItem.save();
      res.json(updatedMenuItem);
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
export const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
      await menuItem.deleteOne();
      res.json({ message: 'Menu item removed' });
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
