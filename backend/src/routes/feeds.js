import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';
import { fetchFeedArticles } from '../utils/rss.js';
import { XMLParser } from 'fast-xml-parser';
import { refreshFeed } from '../utils/scheduler.js';

const router = Router();

function escapeXml(s='') {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Create a feed and ingest articles
router.post('/', requireAuth, async (req, res) => {
  try {
    const { url, title, description, tags, updateFrequency, status, collectionId } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });

    const meta = await fetchFeedArticles(url);
    const feed = await Feed.create({
      url,
      title: title || meta.meta?.title || url,
      description: description || meta.meta?.description || '',
      tags: tags || [],
      updateFrequency: updateFrequency || 'hourly',
      status: status || 'active',
      owner: req.user.id,
      collection: collectionId || null,
      lastFetchedAt: new Date(),
      etag: meta.etag || null,
      lastModified: meta.lastModified || null
    });

    const items = (meta.items || []).slice(0, 50);
    for (const it of items) {
      const guid = it.guid || it.link || (it.title + feed._id.toString());
      await Article.updateOne(
        { guid, feed: feed._id },
        { $setOnInsert: { ...it, guid, feed: feed._id } },
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

// Update feed (status, frequency, title, tags, detach/attach collection)
router.patch('/:id', requireAuth, async (req, res) => {
  const feed = await Feed.findOne({ _id: req.params.id, owner: req.user.id });
  if (!feed) return res.status(404).json({ error: 'Not found' });

  const { title, tags, updateFrequency, status, collection } = req.body || {};
  if (title !== undefined) feed.title = title;
  if (Array.isArray(tags)) feed.tags = tags;
  if (['hourly','6h','daily'].includes(updateFrequency)) feed.updateFrequency = updateFrequency;
  if (['active','inactive'].includes(status)) feed.status = status;
  if (collection === null) feed.collection = null;
  if (typeof collection === 'string') feed.collection = collection;

  await feed.save();
  res.json(feed);
});

// Manual refresh
router.post('/:id/refresh', requireAuth, async (req, res) => {
  const feed = await Feed.findOne({ _id: req.params.id, owner: req.user.id });
  if (!feed) return res.status(404).json({ error: 'Not found' });
  const result = await refreshFeed(feed);
  const fresh = await Feed.findById(feed._id);
  res.json({ ...result, feed: fresh });
});

// Delete feed and its articles
router.delete('/:id', requireAuth, async (req, res) => {
  const feed = await Feed.findOne({ _id: req.params.id, owner: req.user.id });
  if (!feed) return res.status(404).json({ error: 'Not found' });
  await Article.deleteMany({ feed: feed._id });
  await feed.deleteOne();
  res.json({ ok: true });
});

/* ---------- Export JSON ---------- */
router.get('/export/json', requireAuth, async (req, res) => {
  const feeds = await Feed.find({ owner: req.user.id }).lean();
  const payload = feeds.map(f => ({
    title: f.title, url: f.url, description: f.description || '',
    tags: f.tags || [], updateFrequency: f.updateFrequency || 'hourly', status: f.status || 'active'
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="suprss_feeds.json"');
  res.send(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), feeds: payload }, null, 2));
});

/* ---------- Import JSON ---------- */
router.post('/import/json', requireAuth, async (req, res) => {
  const { feeds } = req.body || {};
  if (!Array.isArray(feeds)) return res.status(400).json({ error: 'feeds[] required' });
  let count = 0;
  for (const f of feeds) {
    if (!f.url) continue;
    const meta = await fetchFeedArticles(f.url);
    await Feed.create({
      url: f.url,
      title: f.title || meta.meta?.title || f.url,
      description: f.description || meta.meta?.description || '',
      tags: f.tags || [],
      updateFrequency: f.updateFrequency || 'hourly',
      status: f.status || 'active',
      owner: req.user.id,
      lastFetchedAt: new Date(),
      etag: meta.etag || null,
      lastModified: meta.lastModified || null
    });
    count++;
  }
  res.status(201).json({ count });
});

/* ---------- Export OPML ---------- */
router.get('/export/opml', requireAuth, async (req, res) => {
  const feeds = await Feed.find({ owner: req.user.id }).lean();
  const outlines = feeds.map(f =>
    `<outline text="${escapeXml(f.title || f.url)}" title="${escapeXml(f.title || '')}" type="rss" xmlUrl="${escapeXml(f.url)}" />`
  ).join('\n    ');
  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>SUPRSS Export</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    ${outlines}
  </body>
</opml>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="suprss_feeds.opml"');
  res.send(opml);
});

/* ---------- Import OPML ---------- */
router.post('/import/opml', requireAuth, async (req, res) => {
  const { opml } = req.body || {};
  if (!opml || typeof opml !== 'string') return res.status(400).json({ error: 'opml string required' });

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(opml);

  const urls = [];
  (function walk(node) {
    if (!node) return;
    const arr = Array.isArray(node) ? node : [node];
    for (const item of arr) {
      if (item?.['@_xmlUrl']) urls.push(item['@_xmlUrl']);
      if (item?.outline) walk(item.outline);
    }
  })(parsed?.opml?.body?.outline);

  if (!urls.length) return res.status(400).json({ error: 'No feeds found in OPML' });

  let count = 0;
  for (const url of urls) {
    try {
      const meta = await fetchFeedArticles(url);
      await Feed.create({
        url,
        title: meta.meta?.title || url,
        description: meta.meta?.description || '',
        tags: [],
        updateFrequency: 'hourly',
        status: 'active',
        owner: req.user.id,
        lastFetchedAt: new Date(),
        etag: meta.etag || null,
        lastModified: meta.lastModified || null
      });
      count++;
    } catch { /* ignore */ }
  }
  res.status(201).json({ count });
});

export default router;
