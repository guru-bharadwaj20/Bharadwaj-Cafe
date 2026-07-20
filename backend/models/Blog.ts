import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export type BlogCategory = 'Recipes' | 'News' | 'Behind the Scenes' | 'Tips & Tricks' | 'Events';

export interface IBlog {
  title: string;
  slug: string;
  author: Types.ObjectId;
  content: string;
  excerpt: string;
  coverImage: string;
  category: BlogCategory;
  tags: string[];
  published: boolean;
  views: number;
  likes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedBlog = HydratedDocument<IBlog>;

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true },
    coverImage: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['Recipes', 'News', 'Behind the Scenes', 'Tips & Tricks', 'Events'],
    },
    tags: [{ type: String }],
    published: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Generate slug from title
blogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Blog: Model<IBlog> = mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;
