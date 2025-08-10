import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function Collections() {
  const [cols, setCols] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async () => {
    const r = await api.get('/api/collections')
    setCols(r.data)
  }
  useEffect(() => { load() }, [])

  const createCol = async (e) => {
    e.preventDefault()
    await api.post('/api/collections', { name, description })
    setName(''); setDescription('')
    await load()
  }

  return (
    <div>
      <h2>Collections</h2>
      <form onSubmit={createCol} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la collection" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" style={{ flex: 1 }} />
        <button type="submit">Créer</button>
      </form>
      <ul>
        {cols.map(c => (
          <li key={c._id}><Link to={`/collections/${c._id}`}>{c.name}</Link></li>
        ))}
      </ul>
    </div>
  )
}
