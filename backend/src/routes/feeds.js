import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';
import Collection from '../models/Collection.js';
import { fetchFeedArticles } from '../utils/rss.js';

const router = Router();

// Create a feed and ingest articles
router.post('/', requireAuth, async (req, res) => {
  try {
    const { url, title, description, tags, updateFrequency, status, collectionId } = req.body;
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
      collection: collectionId || null
    });

    // upsert articles
    const items = meta.items.slice(0, 50);
    for (const it of items) {
      await Article.updateOne(
        { guid: it.link || (it.title + feed._id.toString()) },
        { $setOnInsert: { ...it, guid: it.link || (it.title + feed._id.toString()), feed: feed._id } },
        { upsert: true }
      );
    }
    res.status(201).json(feed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create feed' });
  }
});

// List feeds (optionally by collection)
router.get('/', requireAuth, async (req, res) => {
  const { collectionId } = req.query;
  const query = { owner: req.user.id };
  if (collectionId) query.collection = collectionId;
  const feeds = await Feed.find(query).sort({ createdAt: -1 });
  res.json(feeds);
});

// Delete feed and its articles
router.delete('/:id', requireAuth, async (req, res) => {
  const feed = await Feed.findOne({ _id: req.params.id, owner: req.user.id });
  if (!feed) return res.status(404).json({ error: 'Not found' });
  await Article.deleteMany({ feed: feed._id });
  await feed.deleteOne();
  res.json({ ok: true });
});

export default router;
