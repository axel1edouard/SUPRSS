import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function CollectionView() {
  const { id } = useParams()
  const navigate = useNavigate()

  // états principaux
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

  // invitations
  const [inviteEmail, setInviteEmail] = useState('')

  // chat
  const [chat, setChat] = useState([])                // { _id, content, author:{email}, createdAt }
  const [chatInput, setChatInput] = useState('')
  const lastChatTsRef = useRef(null)
  const chatEndRef = useRef(null)

  // commentaires par article
  const [openComments, setOpenComments] = useState({})       // { [articleId]: true }
  const [comments, setComments] = useState({})               // { [articleId]: array }
  const [commentInputs, setCommentInputs] = useState({})     // { [articleId]: string }
  const lastCommentTsRef = useRef({})                        // { [articleId]: ISO }

  // mémo owner / état
  const owner = useMemo(() => members.find(m => m.role === 'owner') || null, [members])
  const amOwner = useMemo(() => !!(me && owner && String(owner._id) === String(me._id)), [me, owner])
  const amMember = useMemo(() => !!(me && members.some(m => String(m._id) === String(me._id))), [me, members])

  // loaders
  const loadMe = async () => { try { const r = await api.get('/api/auth/me'); setMe(r.data) } catch {} }
  const loadCollection = async () => { const r = await api.get(`/api/collections/${id}`); setCollection(r.data) }
  const loadFeeds = async () => {
    try {
      const r = await api.get('/api/feeds')
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

  // chat
  const loadChat = async (initial = false) => {
    try {
      const since = initial ? '' : (lastChatTsRef.current || '')
      const url = since ? `/api/collections/${id}/messages?since=${encodeURIComponent(since)}` : `/api/collections/${id}/messages`
      const r = await api.get(url)
      if (Array.isArray(r.data) && r.data.length) {
        setChat(prev => [...prev, ...r.data])
        lastChatTsRef.current = r.data[r.data.length - 1].createdAt
      } else if (initial) {
        setChat([]); lastChatTsRef.current = null
      }
    } catch { /* ignore */ }
  }
  const sendChat = async (e) => {
    e?.preventDefault()
    const content = chatInput.trim()
    if (!content) return
    const r = await api.post(`/api/collections/${id}/messages`, { content })
    setChat(prev => [...prev, r.data])
    lastChatTsRef.current = r.data.createdAt
    setChatInput('')
    // scroll bas
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  // commentaires
  const loadCommentsFor = async (articleId, initial = false) => {
    try {
      const since = initial ? '' : (lastCommentTsRef.current[articleId] || '')
      const url = since
        ? `/api/collections/${id}/articles/${articleId}/comments?since=${encodeURIComponent(since)}`
        : `/api/collections/${id}/articles/${articleId}/comments`
      const r = await api.get(url)
      if (Array.isArray(r.data) && r.data.length) {
        setComments(prev => ({ ...prev, [articleId]: [...(prev[articleId] || []), ...r.data] }))
        lastCommentTsRef.current[articleId] = r.data[r.data.length - 1].createdAt
      } else if (initial) {
        setComments(prev => ({ ...prev, [articleId]: [] }))
        lastCommentTsRef.current[articleId] = null
      }
    } catch { /* ignore */ }
  }
  const sendComment = async (articleId, e) => {
    e?.preventDefault()
    const content = (commentInputs[articleId] || '').trim()
    if (!content) return
    const r = await api.post(`/api/collections/${id}/articles/${articleId}/comments`, { content })
    setComments(prev => ({ ...prev, [articleId]: [...(prev[articleId] || []), r.data] }))
    lastCommentTsRef.current[articleId] = r.data.createdAt
    setCommentInputs(prev => ({ ...prev, [articleId]: '' }))
  }
  const deleteComment = async (commentId) => {
    if (!confirm('Supprimer ce message ?')) return
    await api.delete(`/api/collections/${id}/comments/${commentId}`)
    // purge locale
    setChat(prev => prev.filter(m => m._id !== commentId))
    setComments(prev => {
      const obj = { ...prev }
      Object.keys(obj).forEach(k => obj[k] = obj[k].filter(c => c._id !== commentId))
      return obj
    })
  }

  useEffect(() => {
    loadMe()
    loadCollection()
    loadFeeds()
    loadArticles()
    loadMembers()
    loadChat(true)
    const int = setInterval(() => loadChat(false), 4000)
    return () => clearInterval(int)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
  const toggleRead = async (a) => { await api.post(`/api/articles/${a._id}/${a.isRead ? 'mark-unread' : 'mark-read'}`); await loadArticles() }
  const toggleFavorite = async (a) => { await api.post(`/api/articles/${a._id}/${a.isFavorite ? 'unfavorite' : 'favorite'}`); await loadArticles() }

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

  if (!collection) return <div style={{ padding: 16 }}>Chargement…</div>

  return (
    <div>
      <h2>Collection — {collection.name}</h2>
      {collection.description && <p>{collection.description}</p>}

      {/* Membres */}
      <h3>Membres</h3>
      {(!amOwner && amMember) && (
        <button onClick={leaveCollection} style={{ margin: '8px 0' }}>Quitter la collection</button>
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

      {/* Ajout feed */}
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

      {/* Feeds */}
      <h3>Feeds de la collection</h3>
      <ul>
        {feeds.map(f => (
          <li key={f._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b>{f.title || '(Sans titre)'}</b> — <span>{f.url}</span>
            {!!(f.tags?.length) && <em> — tags: {f.tags.join(', ')}</em>}
            <em> — {f.status}, freq: {f.updateFrequency}</em>
            {f.lastFetchedAt && (
              <span style={{ fontSize: 12, color: '#666' }}>
                {' '}— maj: {new Date(f.lastFetchedAt).toLocaleString()}
              </span>
            )}
            <button onClick={() => removeFeed(f._id)} style={{ marginLeft: 'auto' }}>Retirer</button>
            <button onClick={async () => { await api.post('/api/feeds/' + f._id + '/refresh'); await loadFeeds(); await loadArticles(); }}>
              Rafraîchir
            </button>
          </li>
        ))}
        {feeds.length === 0 && <li>Aucun flux dans cette collection pour l’instant.</li>}
      </ul>

      {/* Chat de collection */}
      <h3 style={{ marginTop: 24 }}>Discussions de la collection</h3>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, maxHeight: 280, overflowY: 'auto', background: '#fafafa' }}>
        {chat.map(m => (
          <div key={m._id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0' }}>
            <strong>{m.author?.email || '—'}</strong>
            <span style={{ fontSize: 12, color: '#666' }}>{new Date(m.createdAt).toLocaleString()}</span>
            <span style={{ marginLeft: 6 }}>{m.content}</span>
            {(amOwner || (me && m.author && String(m.author._id || '') === String(me._id))) && (
              <button onClick={() => deleteComment(m._id)} style={{ marginLeft: 'auto' }}>Supprimer</button>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={sendChat} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Écrire un message…" />
        <button type="submit">Envoyer</button>
      </form>

      {/* Filtres articles */}
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

      {/* Articles + commentaires */}
      <ul>
        {articles.map(a => {
          const opened = !!openComments[a._id]
          const list = comments[a._id] || []
          return (
            <li key={a._id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
                {a.isRead && <span style={{ fontSize: 12, color: '#555', border: '1px solid #ccc', padding: '0 6px', borderRadius: 12 }}>Lu</span>}
                {a.isFavorite && <span style={{ fontSize: 12, color: '#b35', border: '1px solid #e3c', padding: '0 6px', borderRadius: 12 }}>Favori</span>}
                <button onClick={() => { setOpenComments(prev => ({ ...prev, [a._id]: !opened })); if (!opened) loadCommentsFor(a._id, true) }} style={{ marginLeft: 'auto' }}>
                  {opened ? 'Masquer commentaires' : 'Commentaires'}
                </button>
              </div>
              {a.pubDate && <span> — {new Date(a.pubDate).toLocaleString()}</span>}
              <div>{a.summary?.slice(0, 160)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleRead(a)}>{a.isRead ? 'Marquer non lu' : 'Marquer lu'}</button>
                <button onClick={() => toggleFavorite(a)}>{a.isFavorite ? 'Retirer favori' : 'Favori'}</button>
              </div>

              {opened && (
                <div style={{ marginTop: 8, borderLeft: '3px solid #ddd', paddingLeft: 8 }}>
                  {list.map(c => (
                    <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0' }}>
                      <strong>{c.author?.email || '—'}</strong>
                      <span style={{ fontSize: 12, color: '#666' }}>{new Date(c.createdAt).toLocaleString()}</span>
                      <span style={{ marginLeft: 6 }}>{c.content}</span>
                      {(amOwner || (me && c.author && String(c.author._id || '') === String(me._id))) && (
                        <button onClick={() => deleteComment(c._id)} style={{ marginLeft: 'auto' }}>Supprimer</button>
                      )}
                    </div>
                  ))}
                  <form onSubmit={(e) => sendComment(a._id, e)} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      value={commentInputs[a._id] || ''}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [a._id]: e.target.value }))}
                      placeholder="Écrire un commentaire…"
                    />
                    <button type="submit">Envoyer</button>
                  </form>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
