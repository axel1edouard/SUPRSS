import React, { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Feeds() {
  const [feeds, setFeeds] = useState([])
  const [url, setUrl] = useState('https://news.ycombinator.com/rss')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)

  const loadFeeds = async () => {
    const r = await api.get('/api/feeds')
    setFeeds(r.data)
  }

  const loadArticles = async () => {
    const r = await api.get('/api/articles?limit=50')
    setArticles(r.data)
  }

  useEffect(() => {
    loadFeeds()
    loadArticles()
  }, [])

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

  const favorite = async (id) => {
    await api.post('/api/articles/' + id + '/favorite')
    await loadArticles()
  }

  return (
    <div>
      <h2>Mes flux</h2>
      <form onSubmit={addFeed} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL du flux RSS" style={{ flex: 1 }} />
        <button type="submit" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</button>
      </form>

      <ul>
        {feeds.map(f => (
          <li key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b>{f.title}</b> — <span>{f.url}</span>
            <button onClick={() => removeFeed(f._id)} style={{ marginLeft: 'auto' }}>Supprimer</button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 24 }}>Articles récents</h2>
      <ul>
        {articles.map(a => (
          <li key={a._id} style={{ marginBottom: 8 }}>
            <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
            {a.author && <span> — {a.author}</span>}
            {a.pubDate && <span> — {new Date(a.pubDate).toLocaleString()}</span>}
            <div>{a.summary?.slice(0, 160)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => markRead(a._id)}>Marquer lu</button>
              <button onClick={() => favorite(a._id)}>Favori</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
