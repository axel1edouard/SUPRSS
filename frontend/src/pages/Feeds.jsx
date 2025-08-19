import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import { toast } from '../lib/toast';
import ArticleCard from '../components/ArticleCard'; 

export default function Feeds() {
  // --- état Feeds / Articles ---
  const [feeds, setFeeds] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ajout d’un flux (statut + fréquence + tags) ---
  const [url, setUrl] = useState('');
  const [statusNew, setStatusNew] = useState('active');   // active | inactive
  const [freqNew, setFreqNew] = useState('hourly');       // hourly | 6h | daily
  const [tagsNew, setTagsNew] = useState('');             // CSV -> array

  // --- filtres & recherche ---
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all'); // all | read | unread
  const [favorite, setFavorite] = useState(false);
  const [feedId, setFeedId] = useState('');
  const [tags, setTags] = useState(''); // CSV

  // --- helpers ---
  const feedTitleById = useMemo(() => {
    const map = new Map();
    feeds.forEach(f => map.set(String(f._id), f.title || f.url));
    return map;
  }, [feeds]);

  const firstImgFromHTML = (html) => {
    if (!html) return null;
    const s = String(html);
    // src=… ou data-src=…
    const m = s.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/i);
    return m ? m[1] : null;
  };

  const resolveUrl = (maybeUrl, base) => {
    try { return new URL(maybeUrl, base).toString(); } catch { return maybeUrl || null; }
  };

   const toCardArticle = (a) => {
    const href = a.link || a.url || '#';
    const contentObj = (a.content && typeof a.content === 'object') ? a.content : null;
    const contentHtml = contentObj?.html || a.content_html || a['content:encoded'] || a.content || a.summary || a.description;
    const enclosure0 = Array.isArray(a.enclosures) ? a.enclosures[0] : null;

    const rawImage =
      a.imageUrl ||
      a.image?.url || a.image ||
      a.cover_image || a.cover ||
      a.thumbnail || a.thumb ||
      a.media?.thumbnail?.url || a['media:thumbnail']?.url ||
      a.media?.content?.url || a['media:content']?.url ||
      (a.enclosure && typeof a.enclosure === 'object' ? a.enclosure.url : null) ||
      (enclosure0 && typeof enclosure0 === 'object' ? enclosure0.url : null) ||
      firstImgFromHTML(contentHtml) ||
      null;

    const imageUrl = resolveUrl(rawImage, href);
    const excerpt = a.summary || a.description || '';
    const source = a.feedTitle || feedTitleById.get(String(a.feedId)) || '';
    const publishedAt = a.pubDate || a.publishedAt || a.date;
    const tags = Array.isArray(a.tags) ? a.tags : [];
    return {
      id: a._id || a.id || href,
      title: a.title || '(Sans titre)',
      imageUrl,
      href,
      excerpt,
      source,
      publishedAt,
      tags,
      _raw: a, // on garde l’objet brut pour les actions (lu/fav)
    };
  };

  // --- chargement ---
  const loadFeeds = async () => {
    const r = await api.get('/api/feeds');
    setFeeds(r.data || []);
  };

  const loadArticles = async () => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (status !== 'all') params.append('status', status);
    if (favorite) params.append('favorite', 'true');
    if (feedId) params.append('feedId', feedId);
    if (tags) params.append('tags', tags);
    params.append('limit', '50');
    const r = await api.get('/api/articles?' + params.toString());
    setArticles(r.data || []);
  };

  useEffect(() => {
    loadFeeds();
    loadArticles();
  }, []);

  const applyFilters = async (e) => {
    e?.preventDefault();
    await loadArticles();
  };

  // --- CRUD flux ---
  const addFeed = async (e) => {
    e.preventDefault();
    const u = url.trim();
    if (!u) return;
    const tagList = tagsNew.split(',').map(s => s.trim()).filter(Boolean);
    try {
      setLoading(true);
      await api.post('/api/feeds', {
        url: u,
        status: statusNew,
        updateFrequency: freqNew,
        tags: tagList
      });
      setUrl(''); setTagsNew('');
      await loadFeeds();
      await loadArticles();
      toast('Flux ajouté ✅');
    } catch {
      toast('Échec ajout du flux', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeFeed = async (id) => {
    try {
      await api.delete('/api/feeds/' + id);
      await loadFeeds();
      await loadArticles();
      toast('Flux supprimé');
    } catch {
      toast('Suppression impossible', 'error');
    }
  };

  const toggleFeedStatus = async (f) => {
    try {
      const next = f.status === 'active' ? 'inactive' : 'active';
      await api.patch('/api/feeds/' + f._id, { status: next });
      await loadFeeds();
      toast(next === 'active' ? 'Flux activé' : 'Flux désactivé');
    } catch {
      toast('Mise à jour du statut impossible', 'error');
    }
  };

  // --- actions article ---
  const toggleRead = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isRead ? 'mark-unread' : 'mark-read'}`);
    await loadArticles();
  };

  const toggleFavorite = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isFavorite ? 'unfavorite' : 'favorite'}`);
    await loadArticles();
  };

  // --- Export / Import ---
  const exportJson = async () => {
    const r = await api.get('/api/feeds/export/json', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'suprss_feeds.json'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const importJson = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        const json = JSON.parse(text);
        const feeds = Array.isArray(json.feeds) ? json.feeds : json;
        await api.post('/api/feeds/import/json', { feeds });
        await loadFeeds(); await loadArticles();
        toast('Import JSON effectué');
      } catch { toast('Import JSON invalide', 'error'); }
    };
    input.click();
  };

  const exportOpml = async () => {
    const r = await api.get('/api/feeds/export/opml', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'suprss_feeds.opml'; a.click();
    window.URL.revokeObjectURL(url);
  };

  const importOpml = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.opml, .xml, text/xml, application/xml';
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        await api.post('/api/feeds/import/opml', { opml: text });
        await loadFeeds(); await loadArticles();
        toast('Import OPML effectué');
      } catch { toast('Import OPML invalide', 'error'); }
    };
    input.click();
  };

  // --- UI ---
  return (
    <div>
      <h2>Mes flux</h2>

      {/* Ajout d’un flux */}
      <form
        onSubmit={addFeed}
        style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 120px 150px minmax(160px,1fr) auto', gap: 8, marginBottom: 12 }}
      >
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL du flux RSS" />
        <select value={statusNew} onChange={e => setStatusNew(e.target.value)}>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        <select value={freqNew} onChange={e => setFreqNew(e.target.value)}>
          <option value="hourly">Toutes les heures</option>
          <option value="6h">Toutes les 6h</option>
          <option value="daily">Quotidien</option>
        </select>
        <input value={tagsNew} onChange={e => setTagsNew(e.target.value)} placeholder="Tags (ex: tech,actu)" />
        <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Ajout…' : 'Ajouter'}</button>
      </form>

      {/* Export / Import */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button className="btn" onClick={exportJson}>Exporter JSON</button>
        <button className="btn" onClick={importJson}>Importer JSON</button>
        <button className="btn" onClick={exportOpml}>Exporter OPML</button>
        <button className="btn" onClick={importOpml}>Importer OPML</button>
      </div>

      {/* Liste des flux */}
      <ul className="cards">
        {feeds.map(f => (
          <li key={f._id}>
            <div className="card-row">
              <b>{f.title || '(Sans titre)'}</b> — <span>{f.url}</span>
              {!!(f.tags?.length) && <em> — tags: {f.tags.join(', ')}</em>}
              <em> — {f.status}, freq: {f.updateFrequency}</em>
              {f.lastFetchedAt && (
                <span className="badge"> maj: {new Date(f.lastFetchedAt).toLocaleString()}</span>
              )}
              <button className="btn ghost small" onClick={() => toggleFeedStatus(f)} style={{ marginLeft: 'auto' }}>
                {f.status === 'active' ? 'Désactiver' : 'Activer'}
              </button>
              <button className="btn primary small" onClick={async () => {
                await api.post('/api/feeds/' + f._id + '/refresh');
                await loadFeeds(); await loadArticles();
                toast('Flux rafraîchi ✅');
              }}>
                Rafraîchir
              </button>
              <button className="btn danger small" onClick={() => removeFeed(f._id)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>

      {/* Filtres & recherche */}
      <h2 style={{ marginTop: 24 }}>Filtrer les articles</h2>
      <form
        onSubmit={applyFilters}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, alignItems: 'end', marginBottom: 12 }}
      >
        <div>
          <label>Recherche</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="mots-clés" />
        </div>
        <div>
          <label>Statut</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Tous</option>
            <option value="unread">Non lus</option>
            <option value="read">Lus</option>
          </select>
        </div>
        <div>
          <label>Favoris</label><br />
          <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} /> Seulement favoris
        </div>
        <div>
          <label>Source (flux)</label>
          <select value={feedId} onChange={e => setFeedId(e.target.value)}>
            <option value="">Tous</option>
            {feeds.map(f => <option key={f._id} value={f._id}>{f.title || f.url}</option>)}
          </select>
        </div>
        <div>
          <label>Tags</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ex: tech,actu" />
        </div>
        <button className="btn" type="submit">Appliquer</button>
      </form>

      {/* Articles en vignettes */}
      <h2>Articles</h2>
      <div
        className="article-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
      >
        {articles.map((a) => {
          const card = toCardArticle(a);
          return (
            <div key={card.id} style={{ display: 'grid', gap: 8 }}>
              <ArticleCard article={card} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn small" onClick={() => toggleRead(card._raw)}>
                  {a.isRead ? 'Marquer non lu' : 'Marquer lu'}
                </button>
                <button className="btn small" onClick={() => toggleFavorite(card._raw)}>
                  {a.isFavorite ? 'Retirer favori' : 'Favori'}
                </button>
              </div>
            </div>
          );
        })}
        {!articles.length && <div className="muted">Aucun article pour le moment.</div>}
      </div>
    </div>
  );
}
