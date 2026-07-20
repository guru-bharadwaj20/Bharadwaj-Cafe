import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface IAddress {
  user: Types.ObjectId;
  label: AddressLabel;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedAddress = HydratedDocument<IAddress>;

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, enum: ['Home', 'Work', 'Other'] },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1 });

// Promoting one address demotes the rest, so a user always has at most
// one default.
addressSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await (this.constructor as Model<IAddress>).updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const Address: Model<IAddress> = mongoose.model<IAddress>('Address', addressSchema);

export default Address;
