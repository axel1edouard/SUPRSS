import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import feedRoutes from './routes/feeds.js';
import articleRoutes from './routes/articles.js';
import collectionRoutes from './routes/collections.js';
import userRoutes from './routes/user.js';

import cron from 'node-cron';
import Feed from './models/Feed.js';
import Article from './models/Article.js';
import { fetchFeedArticles } from './utils/rss.js';

import { startScheduler } from './utils/scheduler.js';

dotenv.config();
const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/user', userRoutes);

// Toutes les heures
cron.schedule('0 * * * *', async () => {
  try {
    const feeds = await Feed.find({ status: 'active' }).select('_id url');
    for (const f of feeds) {
      const meta = await fetchFeedArticles(f.url);
      const items = meta.items.slice(0, 50);
      for (const it of items) {
        await Article.updateOne(
          { guid: it.link || (it.title + f._id.toString()) },
          { $setOnInsert: { ...it, guid: it.link || (it.title + f._id.toString()), feed: f._id } },
          { upsert: true }
        );
      }
    }
    console.log(`[CRON] Feeds refreshed: ${feeds.length}`);
  } catch (e) {
    console.error('[CRON] refresh error', e.message);
  }
});

if (process.env.SCHEDULER_ENABLED !== 'false') {
  startScheduler();
}

export default app;
