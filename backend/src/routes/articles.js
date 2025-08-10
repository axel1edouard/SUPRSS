import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Article from '../models/Article.js';
import Feed from '../models/Feed.js';

const router = Router();

// Query params: feedId?, collectionId?, status(read/unread)?, favorite(true)? q?
router.get('/', requireAuth, async (req, res) => {
  const { feedId, collectionId, status, favorite, q, limit = 50 } = req.query;
  const filters = {};
  if (feedId) filters.feed = feedId;
  if (q) filters.$text = { $search: q };

  let baseQuery = Article.find(filters).sort({ pubDate: -1 }).limit(Math.min(parseInt(limit) || 50, 200));

  let articles = await baseQuery.lean();
  // Filter by collection by checking the feed
  if (collectionId) {
    const feedIds = (await Feed.find({ collection: collectionId }).select('_id')).map(f => f._id.toString());
    articles = articles.filter(a => feedIds.includes(a.feed.toString()));
  }
  // Filter read/unread
  if (status === 'read') {
    articles = articles.filter(a => (a.readBy || []).some(u => u.toString() === req.user.id));
  } else if (status === 'unread') {
    articles = articles.filter(a => !(a.readBy || []).some(u => u.toString() === req.user.id));
  }
  // Filter favorite
  if (favorite === 'true') {
    articles = articles.filter(a => (a.favoritedBy || []).some(u => u.toString() === req.user.id));
  }
  res.json(articles);
});

router.post('/:id/mark-read', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user.id } });
  res.json({ ok: true });
});

router.post('/:id/favorite', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $addToSet: { favoritedBy: req.user.id } });
  res.json({ ok: true });
});

export default router;
