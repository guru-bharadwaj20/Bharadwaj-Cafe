import mongoose, { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

export type MessageSender = 'user' | 'admin' | 'assistant';
export type ChatStatus = 'open' | 'closed';

export interface IMessage {
  sender: MessageSender;
  message: string;
  timestamp: Date;
  read: boolean;
  /** Which lookups the AI assistant ran, so a reply can be audited. */
  toolsUsed?: string[];
}

export interface IChat {
  user: Types.ObjectId;
  /** Set once a human is needed; the assistant stops replying. */
  escalated: boolean;
  messages: Types.DocumentArray<IMessage>;
  status: ChatStatus;
  lastMessage: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type HydratedChat = HydratedDocument<IChat>;

const messageSchema = new Schema<IMessage>({
  sender: { type: String, required: true, enum: ['user', 'admin', 'assistant'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  toolsUsed: [{ type: String }],
});

const chatSchema = new Schema<IChat>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    escalated: { type: Boolean, default: false },
    lastMessage: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The admin console lists open conversations most-recent-first.
chatSchema.index({ lastMessage: -1 });

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
