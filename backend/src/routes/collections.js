import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Collection from '../models/Collection.js';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';
import { fetchFeedArticles } from '../utils/rss.js';

const router = Router();

function isMember(col, userId) {
  return col.owner.toString() === userId ||
    (col.members || []).some(m => m.toString() === userId);
}

async function ensureMember(collectionId, userId) {
  const col = await Collection.findById(collectionId);
  if (!col) return null;
  return isMember(col, userId) ? col : null;
}

/* -------------------- CRUD de base -------------------- */

router.post('/', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const col = await Collection.create({
    name,
    description: description || '',
    owner: req.user.id,
    members: [req.user.id]
  });
  res.status(201).json(col);
});

router.get('/', requireAuth, async (req, res) => {
  const cols = await Collection.find({
    $or: [{ owner: req.user.id }, { members: req.user.id }]
  }).sort({ createdAt: -1 });
  res.json(cols);
});

router.get('/:id', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  res.json(col);
});

/* -------------------- Feeds d'une collection -------------------- */

// Lister les feeds de la collection (tous propriétaires confondus)
router.get('/:id/articles', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const { feedId, q, status, favorite, tags, limit = 100 } = req.query;

  const feeds = await Feed.find({ collection: col._id }).select('_id tags title');
  const feedIds = feeds.map(f => f._id.toString());

  // Filtre de base par feeds de la collection OU par feedId précis
  const filters = {};
  if (feedId) {
    if (!feedIds.includes(feedId)) return res.json([]); // feed inexistant dans la collection
    filters.feed = feedId;
  } else {
    filters.feed = { $in: feedIds };
  }

  if (q) filters.$text = { $search: q };

  let arts = await Article.find(filters)
    .sort({ pubDate: -1 })
    .limit(Math.min(parseInt(limit) || 100, 300))
    .lean();

  const uid = req.user.id.toString();
  arts = arts.map(a => {
    const isRead = (a.readBy || []).some(u => u.toString() === uid);
    const isFavorite = (a.favoritedBy || []).some(u => u.toString() === uid);
    return { ...a, isRead, isFavorite };
  });

  // Filtre tags (au niveau feed)
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const allowedByTags = new Set(
        feeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      arts = arts.filter(a => allowedByTags.has(a.feed.toString()));
    }
  }

  if (status === 'read')      arts = arts.filter(a => a.isRead);
  else if (status === 'unread') arts = arts.filter(a => !a.isRead);

  if (favorite === 'true') arts = arts.filter(a => a.isFavorite);

  res.json(arts);
});


// Ajouter un feed (créé par l'utilisateur courant) dans la collection
router.post('/:id/feeds', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const { url, title, description, tags, updateFrequency, status } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });

  const meta = await fetchFeedArticles(url);
  const feed = await Feed.create({
    url,
    title: title || meta.meta.title || url,
    description: description || meta.meta.description || '',
    tags: tags || [],
    updateFrequency: updateFrequency || 'hourly',
    status: status || 'active',
    owner: req.user.id,
    collection: col._id
  });

  // Ingestion initiale (upsert)
  const items = meta.items.slice(0, 50);
  for (const it of items) {
    await Article.updateOne(
      { guid: it.link || (it.title + feed._id.toString()) },
      { $setOnInsert: { ...it, guid: it.link || (it.title + feed._id.toString()), feed: feed._id } },
      { upsert: true }
    );
  }

  res.status(201).json(feed);
});

// Retirer un feed de la collection (seul le propriétaire du feed peut le retirer ici)
router.delete('/:id/feeds/:feedId', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const feed = await Feed.findById(req.params.feedId);
  if (!feed || feed.collection?.toString() !== col._id.toString()) {
    return res.status(404).json({ error: 'Feed not in this collection' });
  }
  if (feed.owner.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Only owner can remove feed from collection' });
  }

  feed.collection = null;
  await feed.save();
  res.json({ ok: true });
});

/* -------------------- Articles agrégés de la collection -------------------- */
// Supporte q, status(read|unread), favorite(true), tags (CSV), limit
router.get('/:id/articles', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const { q, status, favorite, tags, limit = 100 } = req.query;

  const feeds = await Feed.find({ collection: col._id }).select('_id tags');
  const feedIds = feeds.map(f => f._id);
  const filters = { feed: { $in: feedIds } };
  if (q) filters.$text = { $search: q };

  let arts = await Article.find(filters).sort({ pubDate: -1 }).limit(Math.min(parseInt(limit) || 100, 300)).lean();

  const uid = req.user.id.toString();

  // Enrichir avec flags utilisateur
  arts = arts.map(a => {
    const isRead = (a.readBy || []).some(u => u.toString() === uid);
    const isFavorite = (a.favoritedBy || []).some(u => u.toString() === uid);
    return { ...a, isRead, isFavorite };
  });

  // Filtre tags (au niveau feed)
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const allowedByTags = new Set(
        feeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      arts = arts.filter(a => allowedByTags.has(a.feed.toString()));
    }
  }

  if (status === 'read')      arts = arts.filter(a => a.isRead);
  else if (status === 'unread') arts = arts.filter(a => !a.isRead);

  if (favorite === 'true') arts = arts.filter(a => a.isFavorite);

  res.json(arts);
});

export default router;
