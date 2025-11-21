// Admin User Seeder Script
// Run this script to create an admin user in your database
// Usage: node createAdmin.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@bharadwajcafe.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@bharadwajcafe.com',
      password: 'admin123', // Change this to a secure password
      role: 'admin',
      isVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123 (Please change this immediately)');
    console.log('👤 Role:', admin.role);
    console.log('\n⚠️  IMPORTANT: Login and change the password immediately!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
