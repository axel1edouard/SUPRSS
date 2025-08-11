import mongoose from 'mongoose';

const collectionInviteSchema = new mongoose.Schema({
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

collectionInviteSchema.index({ token: 1 }, { unique: true });
collectionInviteSchema.index({ collection: 1, email: 1, status: 1 });

export default mongoose.model('CollectionInvite', collectionInviteSchema);
