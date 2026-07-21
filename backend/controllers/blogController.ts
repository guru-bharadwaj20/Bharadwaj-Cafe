import type { RequestHandler } from 'express';
import type { FilterQuery } from 'mongoose';
import Blog, { type IBlog } from '../models/Blog.js';
import type { HydratedUser } from '../models/User.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// @desc    Get all published blogs
// @route   GET /api/blogs
// @access  Public
export const getBlogs: RequestHandler = async (req, res) => {
  try {
    const { category, tag, search } = req.query as {
      category?: string;
      tag?: string;
      search?: string;
    };

    const query: FilterQuery<IBlog> = { published: true };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const blogs = await Blog.find(query).populate('author', 'name').sort('-createdAt');

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load blogs') });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
export const getBlogBySlug: RequestHandler = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate('author', 'name');

    if (!blog) {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load blog') });
  }
};

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    const blog = await Blog.create({
      ...(req.body as Partial<IBlog>),
      author: user._id,
    });

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to create blog') });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog: RequestHandler = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }

    // `author` is stripped so an edit cannot reassign authorship.
    const { author: _ignored, ...updates } = req.body as Partial<IBlog>;
    Object.assign(blog, updates);
    const updatedBlog = await blog.save();

    res.json(updatedBlog);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update blog') });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog: RequestHandler = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }

    await blog.deleteOne();
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete blog') });
  }
};

// @desc    Like/Unlike blog
// @route   PUT /api/blogs/:id/like
// @access  Private
export const likeBlog: RequestHandler = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }

    const user = req.user as HydratedUser;
    const alreadyLiked = blog.likes.some((id) => id.equals(user._id));

    if (alreadyLiked) {
      blog.likes = blog.likes.filter((id) => !id.equals(user._id));
    } else {
      blog.likes.push(user._id);
    }

    await blog.save();
    res.json({ likes: blog.likes.length });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update blog') });
  }
};
