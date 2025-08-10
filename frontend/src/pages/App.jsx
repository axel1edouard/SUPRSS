import React, { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function App() {
  const [me, setMe] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/auth/me').then(r => setMe(r.data)).catch(() => navigate('/login'))
  }, [])

  const logout = async () => {
    await api.post('/api/auth/logout')
    navigate('/login')
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Link to="/feeds">Feeds</Link>
        <Link to="/collections">Collections</Link>
        <div style={{ marginLeft: 'auto' }}>{me?.email}</div>
        <button onClick={logout}>Déconnexion</button>
      </nav>
      <Outlet />
    </div>
  )
}
