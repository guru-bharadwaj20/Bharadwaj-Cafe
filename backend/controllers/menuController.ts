import type { RequestHandler } from 'express';
import type { FilterQuery } from 'mongoose';
import MenuItem, { type IMenuItem } from '../models/MenuItem.js';
import { cached } from '../utils/cache.js';
import { invalidateMenuCache, MENU_CACHE_TTL_SECONDS, menuCacheKey } from '../utils/menuCache.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

interface MenuQuery {
  search?: string;
  category?: string;
  dietary?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
}

const SORT_OPTIONS: Record<string, string> = {
  'price-low': 'price',
  'price-high': '-price',
  rating: '-rating',
  popular: '-reviewCount',
};

// @desc    Get all menu items with search and filters
// @route   GET /api/menu
// @access  Public
export const getMenuItems: RequestHandler = async (req, res) => {
  try {
    const { search, category, dietary, minPrice, maxPrice, sortBy } = req.query as MenuQuery;

    const query: FilterQuery<IMenuItem> = { available: true };

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (dietary) {
      query.dietary = { $in: dietary.split(',') };
    }

    if (minPrice || maxPrice) {
      const price: Record<string, number> = {};
      if (minPrice) price.$gte = Number(minPrice);
      if (maxPrice) price.$lte = Number(maxPrice);
      query.price = price;
    }

    const sort = (sortBy && SORT_OPTIONS[sortBy]) || '-createdAt';

    // The key covers every filter, so two different searches never collide.
    const key = menuCacheKey(
      search ?? '',
      category ?? '',
      dietary ?? '',
      minPrice ?? '',
      maxPrice ?? '',
      sort
    );

    const menuItems = await cached(key, MENU_CACHE_TTL_SECONDS, () =>
      MenuItem.find(query).sort(sort).lean()
    );

    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load menu') });
  }
};

// @desc    Get single menu item
// @route   GET /api/menu/:id
// @access  Public
export const getMenuItem: RequestHandler = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (menuItem) {
      res.json(menuItem);
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load menu item') });
  }
};

// @desc    Create menu item
// @route   POST /api/menu
// @access  Private/Admin
export const createMenuItem: RequestHandler = async (req, res) => {
  try {
    const { name, description, price, image, category, stock, lowStockThreshold } =
      req.body as Partial<IMenuItem>;

    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      image,
      category,
      stock,
      lowStockThreshold,
    });
    await invalidateMenuCache();

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to create menu item') });
  }
};

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
export const updateMenuItem: RequestHandler = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    const body = req.body as Partial<IMenuItem>;
    menuItem.name = body.name ?? menuItem.name;
    menuItem.description = body.description ?? menuItem.description;
    menuItem.price = body.price ?? menuItem.price;
    menuItem.image = body.image ?? menuItem.image;
    menuItem.category = body.category ?? menuItem.category;
    menuItem.available = body.available ?? menuItem.available;
    // `null` is meaningful here (stop tracking), so `undefined` is the only
    // value that means "leave alone".
    if (body.stock !== undefined) menuItem.stock = body.stock;
    menuItem.lowStockThreshold = body.lowStockThreshold ?? menuItem.lowStockThreshold;

    const updatedMenuItem = await menuItem.save();
    await invalidateMenuCache();

    res.json(updatedMenuItem);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to update menu item') });
  }
};

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
export const deleteMenuItem: RequestHandler = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    await menuItem.deleteOne();
    await invalidateMenuCache();

    res.json({ message: 'Menu item removed' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete menu item') });
  }
};
