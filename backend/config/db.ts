import mongoose from 'mongoose';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'db' });

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not set');
    }

    const conn = await mongoose.connect(uri);
    log.info(`MongoDB Connected: ${conn.connection.host}`);
    log.info(`Database Name: ${conn.connection.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`MongoDB Connection Error: ${message}`);
    log.error('Please check your MONGO_URI in .env file');
    process.exit(1);
  }
};

export default connectDB;
