import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import passport from 'passport';
import oauthRoutes from './routes/oauth.js';

import authRoutes from './routes/auth.js';
import feedRoutes from './routes/feeds.js';
import articleRoutes from './routes/articles.js';
import collectionRoutes from './routes/collections.js';
import userRoutes from './routes/user.js';

import previewRouter from './routes/preview.js';

import cron from 'node-cron';
import Feed from './models/Feed.js';
import Article from './models/Article.js';
import { fetchFeedArticles } from './utils/rss.js';

import { startScheduler } from './utils/scheduler.js';

dotenv.config();
const app = express();
app.set('trust proxy', 1);

// ---- CORS en premier (origin exact + cookies + preflight) ----
const FRONT = process.env.FRONTEND_URL || 'http://localhost:5173';
const EXTRA = process.env.CORS_ORIGIN || '';
const origins = [FRONT, 'http://localhost:5173', 'http://127.0.0.1:5173', EXTRA].filter(Boolean);

const corsCfg = {
  origin: origins,
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsCfg));
app.options('*', cors(corsCfg));

// ---- Sécurité / parsing ----
app.use(helmet({
  // API: on ne met pas CORP same-origin pour ne pas bloquer les fetch cross-origin
  crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- Auth / routes ----
app.use(passport.initialize());
app.use('/api/auth', oauthRoutes);

// Healthcheck pratique pour valider que le backend tourne
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/user', userRoutes);

app.use('/api/preview', previewRouter);

// ---- CRON simple horaire ----
cron.schedule('0 * * * *', async () => {
  try {
    const feeds = await Feed.find({ status: 'active' }).select('_id url');
    for (const f of feeds) {
      const meta = await fetchFeedArticles(f.url);
      const items = (meta.items || []).slice(0, 50);
      for (const it of items) {
        const guid = it.link || (it.title + f._id.toString());
        await Article.updateOne(
          { guid },
          { $setOnInsert: { ...it, guid, feed: f._id } },
          { upsert: true }
        );
      }
    }
    console.log(`[CRON] Feeds refreshed: ${feeds.length}`);
  } catch (e) {
    console.error('[CRON] refresh error', e.message);
  }
});

// ---- Scheduler incrémental (respect des fréquences) ----
if (process.env.SCHEDULER_ENABLED !== 'false') {
  startScheduler();
}

export default app;
