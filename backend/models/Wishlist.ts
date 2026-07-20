import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export interface IWishlistEntry {
  menuItem: Types.ObjectId;
  addedAt: Date;
}

export interface IWishlist {
  user: Types.ObjectId;
  items: Types.DocumentArray<IWishlistEntry>;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedWishlist = HydratedDocument<IWishlist>;

const wishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Wishlist: Model<IWishlist> = mongoose.model<IWishlist>('Wishlist', wishlistSchema);

export default Wishlist;
