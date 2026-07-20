// Admin User Seeder Script
// Creates the initial admin account from environment variables.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<strong password>' node createAdmin.js
//
// The credentials are deliberately not hardcoded: a default like "admin123"
// committed to a public repository is an open door to the admin dashboard.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MIN_PASSWORD_LENGTH = 12;

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin User';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
    console.error('   Example:');
    console.error("   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' node createAdmin.js");
    process.exit(1);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`❌ ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('⚠️  A user with that email already exists — no changes made.');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      isVerified: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Role:', admin.role);
    console.log('🔑 Password: the value you supplied (not printed here)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
