import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function CollectionView() {
  // --- HOOKS TOUJOURS AU TOP-LEVEL (même ordre) ---
  const { id } = useParams()
  const navigate = useNavigate()

  // état principal
  const [collection, setCollection] = useState(null)
  const [feeds, setFeeds] = useState([])
  const [articles, setArticles] = useState([])
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [me, setMe] = useState(null)

  // ajout feed
  const [url, setUrl] = useState('')
  const [statusNew, setStatusNew] = useState('active')
  const [freqNew, setFreqNew] = useState('hourly')
  const [tagsNew, setTagsNew] = useState('')

  // filtres
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [favorite, setFavorite] = useState(false)
  const [tags, setTags] = useState('')
  const [feedId, setFeedId] = useState('')

  // invitation
  const [inviteEmail, setInviteEmail] = useState('')

  // mémo pour owner / état utilisateur
  const owner = useMemo(() => members.find(m => m.role === 'owner') || null, [members])
  const amOwner = useMemo(
    () => !!(me && owner && String(owner._id) === String(me._id)),
    [me, owner]
  )
  const amMember = useMemo(
    () => !!(me && members.some(m => String(m._id) === String(me._id))),
    [me, members]
  )

  // chargements
  const loadMe = async () => { try { const r = await api.get('/api/auth/me'); setMe(r.data) } catch {} }
  const loadCollection = async () => { const r = await api.get(`/api/collections/${id}`); setCollection(r.data) }
  const loadFeeds = async () => {
    try {
      const r = await api.get('/api/feeds')            // robuste: on filtre côté client
      setFeeds((r.data || []).filter(f => f.collection && String(f.collection) === String(id)))
    } catch { setFeeds([]) }
  }
  const loadArticles = async () => {
    try {
      const p = new URLSearchParams()
      if (feedId) p.append('feedId', feedId)
      if (q) p.append('q', q)
      if (status !== 'all') p.append('status', status)
      if (favorite) p.append('favorite', 'true')
      if (tags) p.append('tags', tags)
      const r = await api.get(`/api/collections/${id}/articles?` + p.toString())
      setArticles(r.data)
    } catch { setArticles([]) }
  }
  const loadMembers = async () => {
    try {
      const r = await api.get(`/api/collections/${id}/members`)
      setMembers(r.data.members || [])
      setInvites(r.data.invites || [])
    } catch { setMembers([]); setInvites([]) }
  }

  useEffect(() => {
    // un seul useEffect pour garder l’ordre de hooks identique
    loadMe()
    loadCollection()
    loadFeeds()
    loadArticles()
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // actions
  const addFeed = async (e) => {
    e.preventDefault()
    const u = url.trim(); if (!u) return
    const tagList = tagsNew.split(',').map(s => s.trim()).filter(Boolean)
    try {
      await api.post(`/api/collections/${id}/feeds`, { url: u, status: statusNew, updateFrequency: freqNew, tags: tagList })
    } catch {
      await api.post('/api/feeds', { url: u, status: statusNew, updateFrequency: freqNew, tags: tagList, collectionId: id })
    }
    setUrl(''); setTagsNew('')
    await loadFeeds(); await loadArticles()
  }

  const removeFeed = async (fid) => {
    try { await api.delete(`/api/collections/${id}/feeds/${fid}`) }
    catch { await api.patch('/api/feeds/' + fid, { collection: null }) }
    await loadFeeds(); await loadArticles()
  }

  const applyFilters = async (e) => { e?.preventDefault(); await loadArticles() }

  const toggleRead = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isRead ? 'mark-unread' : 'mark-read'}`)
    await loadArticles()
  }
  const toggleFavorite = async (a) => {
    await api.post(`/api/articles/${a._id}/${a.isFavorite ? 'unfavorite' : 'favorite'}`)
    await loadArticles()
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    const email = inviteEmail.trim(); if (!email) return
    const r = await api.post(`/api/collections/${id}/invite`, { email })
    setInviteEmail('')
    await loadMembers()
    if (r.data.inviteLink) alert(`Lien d’invitation : ${window.location.origin}${r.data.inviteLink}`)
  }

  const removeMember = async (userId) => {
    if (!confirm('Retirer ce membre ?')) return
    await api.delete(`/api/collections/${id}/members/${userId}`)
    await loadMembers()
  }

  const leaveCollection = async () => {
    if (!confirm('Quitter cette collection ?')) return
    await api.post(`/api/collections/${id}/leave`)
    navigate('/collections')
  }

  // rendu
  if (!collection) return <div style={{ padding: 16 }}>Chargement…</div>

  return (
    <div>
      <h2>Collection — {collection.name}</h2>
      {collection.description && <p>{collection.description}</p>}

      <h3>Membres</h3>
      {(!amOwner && amMember) && (
        <button onClick={leaveCollection} style={{ margin: '8px 0' }}>
          Quitter la collection
        </button>
      )}
      <ul>
        {members.map(m => (
          <li key={m._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{m.email}</span>
            <em style={{ fontSize: 12, marginLeft: 6 }}>({m.role})</em>
            {amOwner && m.role !== 'owner' && (
              <button onClick={() => removeMember(m._id)} style={{ marginLeft: 'auto' }}>Retirer</button>
            )}
          </li>
        ))}
      </ul>

      {invites.length > 0 && (
        <>
          <h4>Invitations en attente</h4>
          <ul>
            {invites.map(iv => (
              <li key={iv.token}>
                {iv.email} — expire le {new Date(iv.expiresAt).toLocaleString()} — lien: {window.location.origin}/invite/{iv.token}
              </li>
            ))}
          </ul>
        </>
      )}

      {amOwner && (
        <form onSubmit={sendInvite} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemple.com" />
          <button type="submit">Inviter</button>
        </form>
      )}

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
        <button type="submit">Ajouter</button>
      </form>

      <h3>Feeds de la collection</h3>
      <ul>
        {feeds.map(f => (
          <li key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b>{f.title || '(Sans titre)'}</b> — <span>{f.url}</span>
            {!!(f.tags?.length) && <em> — tags: {f.tags.join(', ')}</em>}
            <em> — {f.status}, freq: {f.updateFrequency}</em>
            <button onClick={() => removeFeed(f._id)} style={{ marginLeft: 'auto' }}>Retirer</button>
          </li>
        ))}
        {feeds.length === 0 && <li>Aucun flux dans cette collection pour l’instant.</li>}
      </ul>

      <h3 style={{ marginTop: 24 }}>Articles de la collection</h3>
      <form
        onSubmit={applyFilters}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 8, alignItems: 'end', marginBottom: 12 }}
      >
        <div>
          <label>Source (flux)</label>
          <select value={feedId} onChange={e => setFeedId(e.target.value)}>
            <option value="">Tous</option>
            {feeds.map(f => <option key={f._id} value={f._id}>{f.title || f.url}</option>)}
          </select>
        </div>
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
          <label>Tags</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ex: tech,actu" />
        </div>
        <button type="submit">Appliquer</button>
      </form>

      <ul>
        {articles.map(a => (
          <li key={a._id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
              {a.isRead && <span style={{ fontSize: 12, color: '#555', border: '1px solid #ccc', padding: '0 6px', borderRadius: 12 }}>Lu</span>}
              {a.isFavorite && <span style={{ fontSize: 12, color: '#b35', border: '1px solid #e3c', padding: '0 6px', borderRadius: 12 }}>Favori</span>}
            </div>
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
