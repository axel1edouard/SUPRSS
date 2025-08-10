import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Article from '../models/Article.js';
import Feed from '../models/Feed.js';

const router = Router();

// Query: feedId?, collectionId?, status(read|unread)?, favorite(true)? q?, tags? (CSV), limit?
router.get('/', requireAuth, async (req, res) => {
  const { feedId, collectionId, status, favorite, q, tags, limit = 50 } = req.query;

  // 1) Récupère les feeds de l'utilisateur
  const userFeeds = await Feed.find({ owner: req.user.id }).select('_id tags collection');
  const userFeedIds = new Set(userFeeds.map(f => f._id.toString()));

  // 2) Point d'entrée: toujours filtrer par feeds appartenant à l'utilisateur
  const baseFilters = {};
  baseFilters.feed = { $in: Array.from(userFeedIds) };

  if (feedId) {
    // mais on s'assure que feedId ∈ userFeedIds
    if (!userFeedIds.has(feedId)) return res.json([]); // pas autorisé => liste vide
    baseFilters.feed = feedId;
  }

  if (q) baseFilters.$text = { $search: q };

  let articles = await Article.find(baseFilters).sort({ pubDate: -1 }).limit(Math.min(parseInt(limit) || 50, 200)).lean();

  // 3) Si collectionId fourni, on restreint aux feeds de l'utilisateur dans cette collection
  if (collectionId) {
    const allowedInCollection = new Set(
      userFeeds.filter(f => f.collection?.toString() === collectionId).map(f => f._id.toString())
    );
    articles = articles.filter(a => allowedInCollection.has(a.feed.toString()));
  }

  // 4) Filtre tags (au niveau feed)
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const allowedByTags = new Set(
        userFeeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      articles = articles.filter(a => allowedByTags.has(a.feed.toString()));
    }
  }

  // 5) read/unread
  if (status === 'read') {
    articles = articles.filter(a => (a.readBy || []).some(u => u.toString() === req.user.id));
  } else if (status === 'unread') {
    articles = articles.filter(a => !(a.readBy || []).some(u => u.toString() === req.user.id));
  }

  // 6) favorite
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
