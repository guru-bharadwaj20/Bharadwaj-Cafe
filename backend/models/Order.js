import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true,
        },
        name: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
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
    specialInstructions: {
      type: String,
      default: '',
    },
    deliveryAddress: {
      type: String,
    },
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
    paymentId: {
      type: String,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
