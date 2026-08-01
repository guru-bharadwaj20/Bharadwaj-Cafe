import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

export type DrinkCategory = 'coffee' | 'tea' | 'snacks' | 'pastries';
export type MerchCategory = 'apparel' | 'drinkware' | 'accessories' | 'stationery' | 'home-decor';
export type MenuCategory = DrinkCategory | MerchCategory;
export type DietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Dairy-Free' | 'Nut-Free';

/**
 * Splits the consumable menu from the merchandise shelf.
 *
 * Both live in this one collection deliberately: an order is priced by looking
 * its items up here, so anything sellable must be a MenuItem or it cannot be
 * bought. Merchandise used to be a hardcoded array in the React bundle with
 * ids like "merch-1", which meant the server rejected every order containing
 * one — and, because the cart is shared, that poisoned the whole checkout.
 */
export type ItemKind = 'drink' | 'merch';

export const DRINK_CATEGORIES: DrinkCategory[] = ['coffee', 'tea', 'snacks', 'pastries'];
export const MERCH_CATEGORIES: MerchCategory[] = [
  'apparel',
  'drinkware',
  'accessories',
  'stationery',
  'home-decor',
];

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
  /** Drinks appear on the Order page; merch on the Merchandise page. */
  kind: ItemKind;
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
      enum: [...DRINK_CATEGORIES, ...MERCH_CATEGORIES],
      default: 'coffee',
    },
    // Defaulted, so every document written before this field existed reads
    // back as a drink rather than vanishing from the Order page.
    kind: { type: String, enum: ['drink', 'merch'], default: 'drink' },
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

// Every listing query filters on kind, and most also filter on availability.
menuItemSchema.index({ kind: 1, available: 1 });

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);

export default MenuItem;
