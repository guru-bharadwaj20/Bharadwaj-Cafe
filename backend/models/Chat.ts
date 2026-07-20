import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export type MessageSender = 'user' | 'admin';
export type ChatStatus = 'open' | 'closed';

export interface IMessage {
  sender: MessageSender;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface IChat {
  user: Types.ObjectId;
  messages: Types.DocumentArray<IMessage>;
  status: ChatStatus;
  lastMessage: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedChat = HydratedDocument<IChat>;

const messageSchema = new Schema<IMessage>({
  sender: { type: String, required: true, enum: ['user', 'admin'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const chatSchema = new Schema<IChat>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    lastMessage: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The admin console lists open conversations most-recent-first.
chatSchema.index({ lastMessage: -1 });

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
