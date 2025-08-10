import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Article from '../models/Article.js';
import Feed from '../models/Feed.js';

const router = Router();

// Query: feedId?, collectionId?, status(read|unread)?, favorite(true)? q?, tags? (CSV), limit?
router.get('/', requireAuth, async (req, res) => {
  const { feedId, collectionId, status, favorite, q, tags, limit = 50 } = req.query;
  const filters = {};
  if (feedId) filters.feed = feedId;
  if (q) filters.$text = { $search: q };

  // Base query
  let query = Article.find(filters).sort({ pubDate: -1 }).limit(Math.min(parseInt(limit) || 50, 200));
  let articles = await query.lean();

  // Filter by collection: restrict to its feeds
  let feedIdsInCollection = null;
  if (collectionId) {
    const feeds = await Feed.find({ collection: collectionId }).select('_id');
    feedIdsInCollection = new Set(feeds.map(f => f._id.toString()));
    articles = articles.filter(a => feedIdsInCollection.has(a.feed.toString()));
  }

  // Filter by tags (applied at feed level)
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const feedQuery = { owner: req.user.id };
      if (collectionId) feedQuery.collection = collectionId;
      const feeds = await Feed.find(feedQuery).select('_id tags');
      const allowed = new Set(
        feeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      articles = articles.filter(a => allowed.has(a.feed.toString()));
    }
  }

  // read/unread
  if (status === 'read') {
    articles = articles.filter(a => (a.readBy || []).some(u => u.toString() === req.user.id));
  } else if (status === 'unread') {
    articles = articles.filter(a => !(a.readBy || []).some(u => u.toString() === req.user.id));
  }

  // favorite
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
