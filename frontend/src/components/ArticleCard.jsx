// frontend/src/components/ArticleCard.jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

/* --- helpers --- */

// Essaie d'extraire une image depuis les champs RSS courants
function pickImageFromRss(a) {
  if (!a) return null;

  // Structure "maison"
  if (a.imageUrl) return a.imageUrl;
  if (a.image?.url) return a.image.url;
  if (typeof a.image === 'string') return a.image;

  // enclosure
  const e = a.enclosure || a['enclosure'];
  if (e && (e.type?.startsWith?.('image/') || !e.type) && e.url) return e.url;

  // media:content / media:thumbnail (formats variés selon les parseurs)
  const mc = a.mediaContent || a['media:content'];
  const mt = a.mediaThumbnail || a['media:thumbnail'];

  const mcArr = Array.isArray(mc) ? mc : (mc ? [mc] : []);
  const mtArr = Array.isArray(mt) ? mt : (mt ? [mt] : []);

  const fromMC =
    mcArr.find(x => x?.type?.startsWith?.('image/'))?.url ||
    mcArr[0]?.url ||
    mcArr[0]?.$?.url;

  const fromMT =
    mtArr[0]?.url ||
    mtArr[0]?.$?.url;

  return fromMC || fromMT || null;
}

// Résout une URL potentiellement relative par rapport au lien de l’article
function toAbsoluteUrl(possibleUrl, baseHref) {
  if (!possibleUrl) return null;
  try {
    return new URL(possibleUrl, baseHref || window.location.origin).toString();
  } catch {
    return possibleUrl;
  }
}

/* --- composant --- */

export default function ArticleCard(props) {
  // compat: accepte { article } ou { item }
  const a = props.article || props.item || {};

  const href = useMemo(() => {
    return a.href || a.link || a.url || a.guid || '#';
  }, [a]);

  // 1) tentative immédiate depuis les champs RSS
  const initialGuess = useMemo(() => {
    const guessed = pickImageFromRss(a);
    return toAbsoluteUrl(guessed, href);
  }, [a, href]);

  const [imgUrl, setImgUrl] = useState(initialGuess);

  // 2) fallback OG image via backend si aucune image RSS
  useEffect(() => {
    let alive = true;
    setImgUrl(initialGuess); // reset à chaque changement d’article

    if (!initialGuess && href && href !== '#') {
      api
        .get('/api/preview/og-image', { params: { url: href } })
        .then((r) => {
          if (!alive) return;
          const found = r?.data?.image || null;
          if (found) setImgUrl(found);
        })
        .catch(() => {});
    }

    return () => {
      alive = false;
    };
  }, [href, initialGuess]);

  // Toujours passer par le proxy d'image côté backend (évite hotlink/403/HTML)
  const apiBase = (api?.defaults?.baseURL || '').replace(/\/$/, '');
  const proxiedSrc = imgUrl
    ? `${apiBase}/api/preview/image?url=${encodeURIComponent(imgUrl)}&ref=${encodeURIComponent(href)}`
    : null;

  const title = a.title || a.name || '';
  const excerpt = a.excerpt || a.summary || a.description || '';
  const source = a.source || a.feedTitle || a.feed || '';
  const publishedAt = a.publishedAt || a.pubDate || a.date || null;
  const dateText = publishedAt ? new Date(publishedAt).toLocaleDateString() : '';

  return (
    <a className="article-card" href={href} target="_blank" rel="noreferrer">
      <div className="article-card__media">
        {proxiedSrc ? (
          <img
            src={proxiedSrc}
            alt=""
            loading="lazy"
            onError={(e) => {
              // Si l'image échoue, on masque l'img pour laisser le placeholder
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="article-card__placeholder" aria-hidden="true">🦋</div>
        )}
      </div>

      <div className="article-card__body">
        <h3 className="article-card__title">{title}</h3>
        {excerpt && <p className="article-card__excerpt">{excerpt}</p>}
        <div className="article-card__meta">
          <span className="badge">{source || '—'}</span>
          {dateText && <span className="muted">{dateText}</span>}
        </div>
      </div>
    </a>
  );
}
