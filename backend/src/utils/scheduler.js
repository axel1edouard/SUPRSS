import cron from 'node-cron';
import Feed from '../models/Feed.js';
import Article from '../models/Article.js';
import { fetchFeedArticles } from './rss.js';

const FREQ_MINUTES = { hourly: 60, '6h': 360, daily: 1440 };

// petit verrou en mémoire pour éviter les chevauchements
let running = false;

export function startScheduler() {
  // chaque minute on regarde quels feeds sont “dus”
  cron.schedule('* * * * *', async () => {
    if (running) return;
    running = true;
    try {
      const now = Date.now();

      // on ne récupère qu’un petit lot à la fois pour éviter de spammer
      const candidates = await Feed.find({ status: 'active' })
        .sort({ lastFetchedAt: 1, createdAt: 1 })
        .limit(10);

      for (const feed of candidates) {
        const minGap = (FREQ_MINUTES[feed.updateFrequency || 'hourly'] || 60) * 60 * 1000;
        const last = feed.lastFetchedAt ? feed.lastFetchedAt.getTime() : 0;
        if (now - last < minGap) continue;

        await refreshFeed(feed);
        // petite pause pour ne pas enchaîner trop vite (respect fournisseurs RSS)
        await wait(400);
      }
    } catch (e) {
      console.error('[scheduler] error', e);
    } finally {
      running = false;
    }
  });

  console.log('[scheduler] started (every minute)');
}

export async function refreshFeed(feedOrId) {
  const feed = typeof feedOrId === 'string'
    ? await Feed.findById(feedOrId)
    : feedOrId;

  if (!feed) return;

  try {
    const meta = await fetchFeedArticles(feed.url, {
      etag: feed.etag,
      lastModified: feed.lastModified
    });

    // upsert des items (dédup guid/link + feed)
    const items = (meta.items || []).slice(0, 100);
    for (const it of items) {
      const guid = it.guid || it.link || (it.title + (feed._id.toString()));
      await Article.updateOne(
        { guid, feed: feed._id },
        {
          $setOnInsert: {
            ...it,
            guid,
            feed: feed._id
          }
        },
        { upsert: true }
      );
    }

    // met à jour les métadonnées
    feed.title = feed.title || meta.meta?.title || feed.url;
    feed.description = feed.description || meta.meta?.description || feed.description;
    if (meta.etag) feed.etag = meta.etag;
    if (meta.lastModified) feed.lastModified = meta.lastModified;
    feed.lastFetchedAt = new Date();
    feed.error = null;
    await feed.save();

    return { ok: true, inserted: items.length };
  } catch (e) {
    console.warn(`[scheduler] refresh error for ${feed.url}:`, e?.message || e);
    feed.lastFetchedAt = new Date();
    feed.error = (e?.message || 'fetch failed').slice(0, 500);
    await feed.save();
    return { ok: false, error: feed.error };
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
