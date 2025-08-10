import React, { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function App() {
  const [me, setMe] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  useEffect(() => {
    let cancelled = false
    if (isAuthPage) { setAuthChecked(true); return }

    (async () => {
      try {
        const r = await api.get('/api/auth/me')
        if (!cancelled) setMe(r.data)
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()

    return () => { cancelled = true }
  }, [isAuthPage, navigate])

  // Pas de navbar ni de vérif sur les pages auth
  if (isAuthPage) return <Outlet />

  // Empêche Feeds/Collections de se monter avant la vérif => plus de 401 en console
  if (!authChecked) return null

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
