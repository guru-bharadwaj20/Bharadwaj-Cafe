import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRole = 'customer' | 'admin';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface IUser {
  name: string;
  email: string;
  /** Absent on accounts that only ever signed in through Google. */
  password?: string;
  /** Google's stable subject id. Set once an account is linked to Google. */
  googleId?: string;
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

    // Required only for accounts that sign in with a password. A Google-only
    // account has none, and must never be able to authenticate with one.
    password: {
      type: String,
      minlength: 6,
      required: function (this: { googleId?: string }) {
        return !this.googleId;
      },
    },

    // sparse: many accounts have no googleId, and a plain unique index would
    // treat every one of those nulls as a duplicate.
    googleId: { type: String, unique: true, sparse: true },

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
  // `!this.password` covers Google-only accounts, which have nothing to hash.
  if (!this.isModified('password') || !this.password) {
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

userSchema.methods.matchPassword = async function (
  this: { password?: string },
  enteredPassword: string
): Promise<boolean> {
  // A Google-only account has no hash to compare against. Returning false —
  // rather than letting bcrypt.compare throw on undefined — means password
  // login simply fails for it, instead of 500ing and leaking that the
  // account exists but is passwordless.
  if (!this.password) return false;
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
