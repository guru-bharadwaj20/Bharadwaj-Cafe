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

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);

export default MenuItem;
