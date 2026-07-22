import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

export type MenuCategory = 'coffee' | 'tea' | 'snacks' | 'pastries';
export type DietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Dairy-Free' | 'Nut-Free';

export interface ICustomizationOption {
  name?: string;
  price?: number;
}

export interface ICustomization {
  name?: string;
  options?: ICustomizationOption[];
}

export interface IMenuItem {
  name: string;
  description: string;
  price: number;
  image: string;
  category: MenuCategory;
  available: boolean;
  /**
   * Units on hand. `null` means "not stock-tracked" — an espresso shot is
   * limited by beans and time, not by a countable inventory, and forcing a
   * number on it would mean pretending to know something we do not.
   */
  stock: number | null;
  /** Below this, the admin dashboard flags the item. */
  lowStockThreshold: number;
  dietary: DietaryTag[];
  customizations: ICustomization[];
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedMenuItem = HydratedDocument<IMenuItem>;

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: {
      type: String,
      enum: ['coffee', 'tea', 'snacks', 'pastries'],
      default: 'coffee',
    },
    available: { type: Boolean, default: true },
    stock: { type: Number, default: null, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    dietary: [
      {
        type: String,
        enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'],
      },
    ],
    customizations: [
      {
        name: String,
        options: [{ name: String, price: Number }],
      },
    ],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Supports the low-stock query on the admin dashboard.
menuItemSchema.index({ stock: 1 });

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);

export default MenuItem;
