import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

export type ContactStatus = 'new' | 'read' | 'responded';

export interface IContact {
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedContact = HydratedDocument<IContact>;

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'responded'], default: 'new' },
  },
  { timestamps: true }
);

const Contact: Model<IContact> = mongoose.model<IContact>('Contact', contactSchema);

export default Contact;
