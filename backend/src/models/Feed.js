import mongoose from 'mongoose';

const feedSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: { type: [String], default: [] },

  updateFrequency: { type: String, enum: ['hourly','6h','daily'], default: 'hourly' },
  status: { type: String, enum: ['active','inactive'], default: 'active' },

  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },

  // suivi de synchronisation
  lastFetchedAt: { type: Date, default: null },
  etag: { type: String, default: null },
  lastModified: { type: String, default: null },
  error: { type: String, default: null }
}, { timestamps: true });

feedSchema.index({ owner: 1, collection: 1, createdAt: -1 });
feedSchema.index({ url: 1 }, { unique: false });

export default mongoose.model('Feed', feedSchema);
