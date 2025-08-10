import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  feed: { type: mongoose.Schema.Types.ObjectId, ref: 'Feed', required: true },
  title: String,
  link: String,
  pubDate: Date,
  author: String,
  summary: String,
  contentSnippet: String,
  guid: { type: String, index: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

articleSchema.index({ title: 'text', summary: 'text', contentSnippet: 'text' });

export default mongoose.model('Article', articleSchema);
