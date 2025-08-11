import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import Collection from '../models/Collection.js';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';
import User from '../models/User.js';
import CollectionInvite from '../models/CollectionInvite.js';
import { fetchFeedArticles } from '../utils/rss.js';

const router = Router();

function isMember(col, userId) {
  return col.owner.toString() === userId || (col.members || []).some(m => m.toString() === userId);
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
    name, description: description || '', owner: req.user.id, members: [req.user.id]
  });
  res.status(201).json(col);
});

router.get('/', requireAuth, async (req, res) => {
  const cols = await Collection.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] }).sort({ createdAt: -1 });
  res.json(cols);
});

router.get('/:id', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  res.json(col);
});

/* -------------------- Feeds d'une collection -------------------- */

router.get('/:id/feeds', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  const feeds = await Feed.find({ collection: col._id }).sort({ createdAt: -1 });
  res.json(feeds);
});

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
    tags: Array.isArray(tags) ? tags : [],
    updateFrequency: updateFrequency || 'hourly',
    status: status || 'active',
    owner: req.user.id,
    collection: col._id
  });

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

router.delete('/:id/feeds/:feedId', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const feed = await Feed.findById(req.params.feedId);
  if (!feed || feed.collection?.toString() !== col._id.toString()) {
    return res.status(404).json({ error: 'Feed not in this collection' });
  }
  // seul le propriétaire du feed peut le retirer
  if (feed.owner.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Only owner can remove feed from collection' });
  }
  feed.collection = null;
  await feed.save();
  res.json({ ok: true });
});

/* -------------------- Articles agrégés -------------------- */
// Supporte feedId, q, status(read|unread), favorite(true), tags (CSV), limit
router.get('/:id/articles', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const { feedId, q, status, favorite, tags, limit = 100 } = req.query;

  const feeds = await Feed.find({ collection: col._id }).select('_id tags title');
  const feedIds = feeds.map(f => f._id.toString());

  const filters = {};
  if (feedId) {
    if (!feedIds.includes(feedId)) return res.json([]);
    filters.feed = feedId;
  } else {
    filters.feed = { $in: feedIds };
  }
  if (q) filters.$text = { $search: q };

  let arts = await Article.find(filters).sort({ pubDate: -1 }).limit(Math.min(parseInt(limit) || 100, 300)).lean();

  const uid = req.user.id.toString();
  arts = arts.map(a => {
    const isRead = (a.readBy || []).some(u => u.toString() === uid);
    const isFavorite = (a.favoritedBy || []).some(u => u.toString() === uid);
    return { ...a, isRead, isFavorite };
  });

  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
    if (tagList.length) {
      const allowedByTags = new Set(
        feeds.filter(f => (f.tags || []).some(t => tagList.includes(t))).map(f => f._id.toString())
      );
      arts = arts.filter(a => allowedByTags.has(a.feed.toString()));
    }
  }

  if (status === 'read') arts = arts.filter(a => a.isRead);
  else if (status === 'unread') arts = arts.filter(a => !a.isRead);

  if (favorite === 'true') arts = arts.filter(a => a.isFavorite);

  res.json(arts);
});

/* -------------------- Membres & invitations -------------------- */

// Liste des membres (owner + members)
router.get('/:id/members', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  const users = await User.find({ _id: { $in: [col.owner, ...(col.members || [])] } })
    .select('_id email')
    .lean();

  // Owner en tête
  const list = [];
  users.forEach(u => {
    const role = u._id.toString() === col.owner.toString() ? 'owner' : 'member';
    list.push({ _id: u._id, email: u.email, role });
  });

  // Invitations en attente
  const invites = await CollectionInvite.find({ collection: col._id, status: 'pending' })
    .select('email token expiresAt createdAt')
    .lean();

  res.json({ members: list, invites });
});

// Inviter un membre par email (owner only, nécessite acceptation par lien)
router.post('/:id/invite', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  if (col.owner.toString() !== req.user.id) return res.status(403).json({ error: 'Only owner can invite' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const clean = String(email).trim().toLowerCase();

  // déjà membre ?
  const alreadyMember = col.owner.toString() === req.user.id ||
    (col.members || []).some(m => m.toString() === req.user.id);
  const user = await User.findOne({ email: clean });
  if (user) {
    const already = col.owner.toString() === user._id.toString()
      || (col.members || []).some(m => m.toString() === user._id.toString());
    if (already) return res.status(200).json({ alreadyMember: true });
  }

  // invitation en cours non expirée ?
  const existing = await CollectionInvite.findOne({
    collection: col._id,
    email: clean,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).lean();

  if (existing) {
    return res.status(200).json({
      added: false,
      inviteLink: `/invite/${existing.token}`,
      expiresAt: existing.expiresAt
    });
  }

  // créer/renouveler l’invitation (toujours via lien, même si l’utilisateur existe)
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 jours
  await CollectionInvite.create({
    collection: col._id,
    email: clean,
    token,
    createdBy: req.user.id,
    expiresAt
  });

  res.status(201).json({ added: false, inviteLink: `/invite/${token}`, expiresAt });
});

// Retirer un membre (owner only, on ne peut pas retirer l’owner)
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  const col = await ensureMember(req.params.id, req.user.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  if (col.owner.toString() !== req.user.id) return res.status(403).json({ error: 'Only owner can remove' });

  if (req.params.userId === col.owner.toString()) {
    return res.status(400).json({ error: 'Cannot remove owner' });
  }
  col.members = (col.members || []).filter(m => m.toString() !== req.params.userId);
  await col.save();
  res.json({ ok: true });
});

// Accepter une invitation via token (auth requis, email doit correspondre)
router.post('/invitations/:token/accept', requireAuth, async (req, res) => {
  const inv = await CollectionInvite.findOne({ token: req.params.token, status: 'pending' });
  if (!inv) return res.status(404).json({ error: 'Invalid token' });
  if (inv.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Token expired' });

  const col = await Collection.findById(inv.collection);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  // Vérifie que l'utilisateur connecté correspond bien à l'email invité
  const me = await User.findById(req.user.id).select('email');
  if (!me || (me.email || '').toLowerCase() !== inv.email.toLowerCase()) {
    return res.status(403).json({ error: `Cette invitation est destinée à ${inv.email}` });
  }

  // Ajout si pas déjà membre
  const isAlready = col.owner.toString() === req.user.id ||
    (col.members || []).some(m => m.toString() === req.user.id);
  if (!isAlready) {
    col.members = Array.from(new Set([...(col.members || []), req.user.id]));
    await col.save();
  }

  inv.status = 'accepted';
  inv.acceptedBy = req.user.id;
  await inv.save();

  res.json({ ok: true, collectionId: col._id });
});

// Quitter une collection (membre non-propriétaire)
router.post('/:id/leave', requireAuth, async (req, res) => {
  const col = await Collection.findById(req.params.id);
  if (!col) return res.status(404).json({ error: 'Not found' });

  if (col.owner.toString() === req.user.id) {
    return res.status(400).json({ error: 'Owner cannot leave the collection' });
  }
  const isMember = (col.members || []).some(m => m.toString() === req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member' });

  col.members = (col.members || []).filter(m => m.toString() !== req.user.id);
  await col.save();
  res.json({ ok: true });
});

export default router;
