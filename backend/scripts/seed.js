import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/suprss';

(async () => {
  await mongoose.connect(MONGO_URI);
  const exists = await User.findOne({ email: 'demo@suprss.local' });
  if (!exists) {
    const u = new User({ name: 'Demo', email: 'demo@suprss.local', passwordHash: '' });
    await u.setPassword('password123');
    await u.save();
    console.log('Seeded demo user: demo@suprss.local / password123');
  } else {
    console.log('Demo user already exists');
  }
  await mongoose.disconnect();
  process.exit(0);
})();
