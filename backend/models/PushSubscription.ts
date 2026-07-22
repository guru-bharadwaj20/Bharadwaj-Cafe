import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

/**
 * A browser push subscription.
 *
 * Holding one of these is enough to push to that device, so they are scoped
 * to a user and never returned to any client.
 */
export interface IPushSubscription {
  user: Types.ObjectId;
  /** The push service URL. Unique per device+browser. */
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedPushSubscription = HydratedDocument<IPushSubscription>;

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Unique so re-subscribing the same device updates rather than duplicates.
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { timestamps: true }
);

const PushSubscription: Model<IPushSubscription> = mongoose.model<IPushSubscription>(
  'PushSubscription',
  pushSubscriptionSchema
);

export default PushSubscription;
