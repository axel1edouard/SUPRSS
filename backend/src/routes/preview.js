import { Router } from 'express';
import * as cheerio from 'cheerio';
import { URL as NodeURL } from 'node:url';

const router = Router();

const abs = (u, base) => { try { return new NodeURL(u, base).toString(); } catch { return null; } };

router.get('/og-image', async (req, res) => {
  try {
    const pageUrl = String(req.query.url || '').trim();
    if (!pageUrl) return res.status(400).json({ image: null });

    const resp = await fetch(pageUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 Chrome',
        'accept-language': 'fr,en;q=0.8',
        'accept': 'text/html,application/xhtml+xml',
      },
    });

    const ctype = resp.headers.get('content-type') || '';
    if (!resp.ok || !ctype.includes('text/html')) return res.json({ image: null });

    const html = await resp.text();
    const $ = cheerio.load(html);

    let img =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('img[src]').first().attr('src') ||
      null;

    img = img ? abs(img, pageUrl) : null;
    res.json({ image: img });
  } catch {
    res.json({ image: null });
  }
});


router.get('/image', async (req, res) => {
  try {
    const imgUrl = String(req.query.url || '').trim();
    if (!imgUrl) return res.status(400).end();

        const ref = String(req.query.ref || '').trim();
    const referer = ref || new NodeURL(imgUrl).origin;

    const upstream = await fetch(imgUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 Chrome',
        'accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
        'referer': referer,
      },
    });

    if (!upstream.ok) return res.status(502).end();

    const ct = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 jour

        const reader = upstream.body.getReader();
    res.status(200);
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    res.status(502).end();
  }
});

export default router;
