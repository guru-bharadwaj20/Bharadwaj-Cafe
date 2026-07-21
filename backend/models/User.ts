import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRole = 'customer' | 'admin';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpire?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  totalSpent: number;
  socialLinks?: { google?: string; facebook?: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  matchPassword(enteredPassword: string): Promise<boolean>;
  /** Returns the RAW token to email; only its hash is persisted. */
  createVerificationToken(): string;
  /** Returns the RAW token to email; only its hash is persisted. */
  createPasswordResetToken(): string;
}

export type HydratedUser = HydratedDocument<IUser, IUserMethods>;
type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: false },

    // Stores a SHA-256 hash of the token, never the token itself. The raw
    // token only ever exists in the email we send.
    verificationToken: { type: String, select: false },
    verificationTokenExpire: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },

    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    totalSpent: { type: Number, default: 0 },
    socialLinks: {
      google: String,
      facebook: String,
    },
  },
  { timestamps: true }
);

// Hash password before saving.
// The `return` is load-bearing: without it every save() of an unrelated field
// (profile edits, loyalty updates, reset tokens) re-runs bcrypt over the
// existing hash and leaves the in-memory document inconsistent with storage.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

/** Hash a raw token the same way we store it, so lookups compare hashes. */
export const hashToken = (rawToken: string): string =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

/** Issues a single-use token: raw half is emailed, hashed half is stored. */
const issueToken = (ttlMs: number) => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hashed: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) };
};

userSchema.methods.matchPassword = function (
  this: { password: string },
  enteredPassword: string
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createVerificationToken = function (): string {
  const { raw, hashed, expiresAt } = issueToken(24 * 60 * 60 * 1000); // 24h
  this.verificationToken = hashed;
  this.verificationTokenExpire = expiresAt;
  return raw;
};

userSchema.methods.createPasswordResetToken = function (): string {
  const { raw, hashed, expiresAt } = issueToken(60 * 60 * 1000); // 1h
  this.resetPasswordToken = hashed;
  this.resetPasswordExpire = expiresAt;
  return raw;
};

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export default User;
