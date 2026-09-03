process.env.NODE_ENV = process.env.NODE_ENV || 'production';
import 'dotenv/config';
import mongoose from 'mongoose';
import userService from '../services/userService.js';
import { getMongoUri } from '../utils/dbUtils.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD environment variable is not set.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(uri, maxRetries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      return;
    } catch (err) {
      console.log(`[initRootAdmin] Database not ready yet (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delayMs / 1000}s...`);
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}

async function initRootAdmin() {
  const uri = getMongoUri();
  try {
    await connectWithRetry(uri);
    const existingRoot = await userService.findRootAdmin();
    if (existingRoot) {
      console.log('Root admin user already exists.');
      await mongoose.disconnect();
      process.exit(0);
    }
    const rootAdmin = await userService.createUser({
      firstName: 'Administrator',
      lastName: '',
      username: 'admin',
      email: 'admin@localhost',
      password: ADMIN_PASSWORD,
      role: 'admin',
      accountLocked: false,
      isRoot: true,
    });
    console.log('Root admin user created successfully:', rootAdmin.username);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing root admin:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

initRootAdmin();