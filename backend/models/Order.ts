import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';
export type OrderType = 'dine-in' | 'takeaway' | 'delivery';
export type PaymentMethod = 'card' | 'upi' | 'wallet' | 'cod';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

/** A priced line item, snapshotted at the moment the order was placed. */
export interface IOrderItem {
  menuItem: Types.ObjectId;
  name?: string;
  quantity: number;
  price?: number;
}

export interface IOrder {
  user: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  orderType: OrderType;
  specialInstructions: string;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedOrder = HydratedDocument<IOrder>;

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerPhone: { type: String, required: true },
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: String,
        quantity: { type: Number, required: true, min: 1 },
        price: Number,
      },
    ],

    // Every monetary field below is computed on the server from current menu
    // prices. Values supplied by the client are ignored.
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'pending',
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway', 'delivery'],
      default: 'takeaway',
    },
    specialInstructions: { type: String, default: '' },
    deliveryAddress: { type: String },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cod'],
      default: 'card',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentId: { type: String },
  },
  { timestamps: true }
);

// Supports the two hot read paths: a customer's own history, and the
// admin order queue filtered by status.
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
