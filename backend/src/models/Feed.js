import mongoose from 'mongoose';

const feedSchema = new mongoose.Schema({
  title: String,
  url: { type: String, required: true },
  description: String,
  tags: [String],
  updateFrequency: { type: String, enum: ['hourly','6h','daily'], default: 'hourly' },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: false }
}, { timestamps: true });

export default mongoose.model('Feed', feedSchema);
