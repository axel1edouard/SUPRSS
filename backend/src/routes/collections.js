import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Collection from '../models/Collection.js';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const col = await Collection.create({ name, description: description || '', owner: req.user.id, members: [req.user.id] });
  res.status(201).json(col);
});

router.get('/', requireAuth, async (req, res) => {
  const cols = await Collection.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] }).sort({ createdAt: -1 });
  res.json(cols);
});

router.get('/:id/articles', requireAuth, async (req, res) => {
  const feeds = await Feed.find({ collection: req.params.id, owner: req.user.id }).select('_id');
  const feedIds = feeds.map(f => f._id);
  const arts = await Article.find({ feed: { $in: feedIds } }).sort({ pubDate: -1 }).limit(100);
  res.json(arts);
});

export default router;
