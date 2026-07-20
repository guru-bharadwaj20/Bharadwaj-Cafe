import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Stores a SHA-256 hash of the token, never the token itself. The raw
    // token only ever exists in the email we send.
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpire: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    loyaltyTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    socialLinks: {
      google: String,
      facebook: String,
    },
  },
  { timestamps: true }
);

// Hash password before saving.
// The `return` is load-bearing: without it every save() of an unrelated field
// (profile edits, loyalty updates, reset tokens) re-hashes the existing hash
// and silently locks the user out of their account.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Hash a raw token the same way we store it, so lookups can compare hashes.
export const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

// Issues a single-use token: the raw half goes in the email, the hashed half
// goes in the database.
const issueToken = (ttlMs) => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hashed: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) };
};

userSchema.methods.createVerificationToken = function () {
  const { raw, hashed, expiresAt } = issueToken(24 * 60 * 60 * 1000); // 24h
  this.verificationToken = hashed;
  this.verificationTokenExpire = expiresAt;
  return raw;
};

userSchema.methods.createPasswordResetToken = function () {
  const { raw, hashed, expiresAt } = issueToken(60 * 60 * 1000); // 1h
  this.resetPasswordToken = hashed;
  this.resetPasswordExpire = expiresAt;
  return raw;
};

const User = mongoose.model('User', userSchema);

export default User;
