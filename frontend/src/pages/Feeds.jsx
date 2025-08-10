import React, { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Feeds() {
  // --- état Feeds / Articles ---
  const [feeds, setFeeds] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)

  // --- ajout d’un flux (statut + fréquence) ---
  const [url, setUrl] = useState('')
  const [statusNew, setStatusNew] = useState('active')   // active | inactive
  const [freqNew, setFreqNew] = useState('hourly')       // hourly | 6h | daily

  // --- filtres & recherche ---
  const [q, setQ] = useState('')           // recherche plein texte
  const [status, setStatus] = useState('all') // all | read | unread
  const [favorite, setFavorite] = useState(false)
  const [feedId, setFeedId] = useState('') // filtrage par source
  const [tags, setTags] = useState('')     // CSV de tags (au niveau feed)

  // --- helpers chargement ---
  const loadFeeds = async () => {
    const r = await api.get('/api/feeds')
    setFeeds(r.data)
  }

  const loadArticles = async () => {
    const params = new URLSearchParams()
    if (q) params.append('q', q)
    if (status !== 'all') params.append('status', status)
    if (favorite) params.append('favorite', 'true')
    if (feedId) params.append('feedId', feedId)
    if (tags) params.append('tags', tags)
    params.append('limit', '50')
    const r = await api.get('/api/articles?' + params.toString())
    setArticles(r.data)
  }

  useEffect(() => { loadFeeds(); loadArticles() }, [])

  const applyFilters = async (e) => {
    e?.preventDefault()
    await loadArticles()
  }

  // --- CRUD flux ---
  const addFeed = async (e) => {
    e.preventDefault()
    const u = url.trim()
    if (!u) return
    setLoading(true)
    await api.post('/api/feeds', { url: u, status: statusNew, updateFrequency: freqNew })
    setUrl('')
    await loadFeeds()
    await loadArticles()
    setLoading(false)
  }

  const removeFeed = async (id) => {
    await api.delete('/api/feeds/' + id)
    await loadFeeds()
    await loadArticles()
  }

  const toggleFeedStatus = async (f) => {
    const next = f.status === 'active' ? 'inactive' : 'active'
    await api.patch('/api/feeds/' + f._id, { status: next })
    await loadFeeds()
  }

  // --- toggles article ---
  const toggleRead = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isRead ? 'mark-unread' : 'mark-read'}`)
    await loadArticles()
  }

  const toggleFavorite = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isFavorite ? 'unfavorite' : 'favorite'}`)
    await loadArticles()
  }

  // --- Export / Import ---
  const exportJson = async () => {
    const r = await api.get('/api/feeds/export/json', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url; a.download = 'suprss_feeds.json'; a.click()
    window.URL.revokeObjectURL(url)
  }

  const importJson = async () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'application/json'
    input.onchange = async () => {
      const text = await input.files[0].text()
      const json = JSON.parse(text)
      const feeds = Array.isArray(json.feeds) ? json.feeds : json
      await api.post('/api/feeds/import/json', { feeds })
      await loadFeeds(); await loadArticles()
    }
    input.click()
  }

  const exportOpml = async () => {
    const r = await api.get('/api/feeds/export/opml', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url; a.download = 'suprss_feeds.opml'; a.click()
    window.URL.revokeObjectURL(url)
  }

  const importOpml = async () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.opml, .xml, text/xml, application/xml'
    input.onchange = async () => {
      const text = await input.files[0].text()
      await api.post('/api/feeds/import/opml', { opml: text })
      await loadFeeds(); await loadArticles()
    }
    input.click()
  }

  // --- UI ---
  return (
    <div>
      <h2>Mes flux</h2>

      {/* Ajout d’un flux */}
      <form
        onSubmit={addFeed}
        style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 120px 150px auto', gap: 8, marginBottom: 12 }}
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
        <button type="submit" disabled={loading}>{loading ? 'Ajout…' : 'Ajouter'}</button>
      </form>

      {/* Export / Import */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button onClick={exportJson}>Exporter JSON</button>
        <button onClick={importJson}>Importer JSON</button>
        <button onClick={exportOpml}>Exporter OPML</button>
        <button onClick={importOpml}>Importer OPML</button>
      </div>

      {/* Liste des flux */}
      <ul>
        {feeds.map(f => (
          <li key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <b>{f.title || '(Sans titre)'}</b> — <span>{f.url}</span>
            <em> — {f.status}, freq: {f.updateFrequency}</em>
            <button onClick={() => toggleFeedStatus(f)} style={{ marginLeft: 'auto' }}>
              {f.status === 'active' ? 'Désactiver' : 'Activer'}
            </button>
            <button onClick={() => removeFeed(f._id)}>Supprimer</button>
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
            {feeds.map(f => <option key={f._id} value={f._id}>{f.title}</option>)}
          </select>
        </div>
        <div>
          <label>Tags (CSV)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ex: tech,actu" />
        </div>
        <button type="submit">Appliquer</button>
      </form>

      {/* Articles */}
      <h2>Articles</h2>
      <ul>
        {articles.map(a => (
          <li key={a._id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
              {a.isRead && <span style={{ fontSize: 12, color: '#555', border: '1px solid #ccc', padding: '0 6px', borderRadius: 12 }}>Lu</span>}
              {a.isFavorite && <span style={{ fontSize: 12, color: '#b35', border: '1px solid #e3c', padding: '0 6px', borderRadius: 12 }}>Favori</span>}
            </div>
            {a.author && <span> — {a.author}</span>}
            {a.pubDate && <span> — {new Date(a.pubDate).toLocaleString()}</span>}
            <div>{a.summary?.slice(0, 160)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleRead(a)}>{a.isRead ? 'Marquer non lu' : 'Marquer lu'}</button>
              <button onClick={() => toggleFavorite(a)}>{a.isFavorite ? 'Retirer favori' : 'Favori'}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
