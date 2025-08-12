import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  article:     { type: mongoose.Schema.Types.ObjectId, ref: 'Article', default: null }, // null = message de chat
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

commentSchema.index({ collection: 1, createdAt: -1 });
commentSchema.index({ article: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
