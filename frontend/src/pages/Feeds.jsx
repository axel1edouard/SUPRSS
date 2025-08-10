import React, { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Feeds() {
  const [feeds, setFeeds] = useState([])
  const [url, setUrl] = useState('https://news.ycombinator.com/rss')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)

  // filters
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all') // all | read | unread
  const [favorite, setFavorite] = useState(false)
  const [feedId, setFeedId] = useState('')
  const [tags, setTags] = useState('') // CSV

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

  useEffect(() => {
    loadFeeds()
    loadArticles()
  }, [])

  const applyFilters = async (e) => {
    e?.preventDefault()
    await loadArticles()
  }

  const addFeed = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post('/api/feeds', { url })
    await loadFeeds()
    await loadArticles()
    setLoading(false)
  }

  const removeFeed = async (id) => {
    await api.delete('/api/feeds/' + id)
    await loadFeeds()
    await loadArticles()
  }

  const markRead = async (id) => {
    await api.post('/api/articles/' + id + '/mark-read')
    await loadArticles()
  }

  const favoriteArticle = async (id) => {
    await api.post('/api/articles/' + id + '/favorite')
    await loadArticles()
  }

  return (
    <div>
      <h2>Mes flux</h2>
      <form onSubmit={addFeed} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL du flux RSS" style={{ flex: 1, minWidth: 260 }} />
        <button type="submit" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</button>
      </form>

      <ul>
        {feeds.map(f => (
          <li key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b>{f.title}</b> — <span>{f.url}</span>
            {!!(f.tags?.length) && <em> — tags: {f.tags.join(', ')}</em>}
            <button onClick={() => removeFeed(f._id)} style={{ marginLeft: 'auto' }}>Supprimer</button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 24 }}>Filtrer les articles</h2>
      <form onSubmit={applyFilters} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, alignItems: 'end', marginBottom: 12 }}>
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

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button onClick={async () => {
          const r = await api.get('/api/feeds/export/json', { responseType: 'blob' })
          const url = window.URL.createObjectURL(new Blob([r.data]))
          const a = document.createElement('a')
          a.href = url
          a.download = 'suprss_feeds.json'
          a.click()
          window.URL.revokeObjectURL(url)
        }}>Exporter (JSON)</button>

        <button onClick={async () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'application/json'
          input.onchange = async () => {
            const file = input.files[0]
            const text = await file.text()
            const json = JSON.parse(text)
            const feeds = Array.isArray(json.feeds) ? json.feeds : json
            await api.post('/api/feeds/import/json', { feeds })
            await loadFeeds()
            await loadArticles()
          }
          input.click()
        }}>Importer (JSON)</button>
      </div>

      <h2>Articles</h2>
      <ul>
        {articles.map(a => (
          <li key={a._id} style={{ marginBottom: 8 }}>
            <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
            {a.author && <span> — {a.author}</span>}
            {a.pubDate && <span> — {new Date(a.pubDate).toLocaleString()}</span>}
            <div>{a.summary?.slice(0, 160)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => markRead(a._id)}>Marquer lu</button>
              <button onClick={() => favoriteArticle(a._id)}>Favori</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
