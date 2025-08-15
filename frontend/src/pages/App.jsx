import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [me, setMe] = useState(null)

  // Cacher la nav sur /login et /register
  const hideNav = location.pathname.startsWith('/login') || location.pathname.startsWith('/register')

  useEffect(() => {
    if (hideNav) return
    ;(async () => {
      try {
        const r = await api.get('/api/auth/me')
        setMe(r.data)
      } catch {
        setMe(null)
      }
    })()
  }, [hideNav])

  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch {}
    setMe(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {!hideNav && (
        <nav className="topbar">
          <NavLink to="/feeds" className={({isActive}) => isActive ? 'active' : ''}>Mes flux</NavLink>
          <NavLink to="/collections" className={({isActive}) => isActive ? 'active' : ''}>Collections</NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? 'active' : ''}>Paramètres</NavLink>
          <div className="spacer" />
          {me && <span className="user-email">{me.email}</span>}
          <button onClick={logout}>Déconnexion</button>
        </nav>
      )}
      <Outlet />
    </div>
  )
}
