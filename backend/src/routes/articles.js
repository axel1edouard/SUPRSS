import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Article from '../models/Article.js';
import Feed from '../models/Feed.js';

const router = Router();

// Query: feedId?, collectionId?, status(read|unread)?, favorite(true)? q?, tags? (CSV), limit?
router.get('/', requireAuth, async (req, res) => {
  const { feedId, collectionId, status, favorite, q, tags, limit = 50 } = req.query;

  // Feeds de l'utilisateur
  const userFeeds = await Feed.find({ owner: req.user.id }).select('_id tags collection');
  const userFeedIds = new Set(userFeeds.map(f => f._id.toString()));

  // Base filters: toujours restreindre aux feeds de l'utilisateur
  const baseFilters = { feed: { $in: Array.from(userFeedIds) } };
  if (feedId) {
    if (!userFeedIds.has(feedId)) return res.json([]); // pas autorisé -> rien
    baseFilters.feed = feedId;
  }
  if (q) baseFilters.$text = { $search: q };

  let articles = await Article.find(baseFilters)
    .sort({ pubDate: -1 })
    .limit(Math.min(parseInt(limit) || 50, 200))
    .lean();

  // Filtre collection
  if (collectionId) {
    const allowedInCollection = new Set(
      userFeeds.filter(f => f.collection?.toString() === collectionId).map(f => f._id.toString())
    );
    articles = articles.filter(a => allowedInCollection.has(a.feed.toString()));
  }

  // Filtre tags (au niveau feed)
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const allowedByTags = new Set(
        userFeeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      articles = articles.filter(a => allowedByTags.has(a.feed.toString()));
    }
  }

  // Flags par utilisateur
  const uid = req.user.id.toString();
  articles = articles.map(a => {
    const isRead = (a.readBy || []).some(u => u.toString() === uid);
    const isFavorite = (a.favoritedBy || []).some(u => u.toString() === uid);
    return { ...a, isRead, isFavorite };
  });

  // read/unread
  if (status === 'read') {
    articles = articles.filter(a => a.isRead);
  } else if (status === 'unread') {
    articles = articles.filter(a => !a.isRead);
  }

  // favorite
  if (favorite === 'true') {
    articles = articles.filter(a => a.isFavorite);
  }

  res.json(articles);
});

router.post('/:id/mark-read', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user.id } });
  res.json({ ok: true });
});
router.post('/:id/mark-unread', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $pull: { readBy: req.user.id } });
  res.json({ ok: true });
});

router.post('/:id/favorite', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $addToSet: { favoritedBy: req.user.id } });
  res.json({ ok: true });
});
router.post('/:id/unfavorite', requireAuth, async (req, res) => {
  await Article.updateOne({ _id: req.params.id }, { $pull: { favoritedBy: req.user.id } });
  res.json({ ok: true });
});

export default router;
