import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export interface IReview {
  user: Types.ObjectId;
  menuItem: Types.ObjectId;
  rating: number;
  comment: string;
  images: string[];
  helpful: Types.ObjectId[];
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedReview = HydratedDocument<IReview>;

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: [{ type: String }],
    helpful: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient queries
reviewSchema.index({ menuItem: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
