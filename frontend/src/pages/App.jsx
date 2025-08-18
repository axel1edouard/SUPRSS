import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { loadAndApplyPrefs } from '../lib/prefs';

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

  // Applique automatiquement les préférences (thème/zoom) du user dès qu'il est authentifié
 useEffect(() => {
   if (me) {
     loadAndApplyPrefs().catch(() => {});
   }
 // Dépendances tolérantes selon la forme de "me"
 }, [me?.id, me?._id]);

  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch {}

    // Reset des préférences UI pour éviter la "fuite" entre comptes
    try { localStorage.removeItem('suprss_theme') } catch {}
    const html = document.documentElement
    html.dataset.theme = 'light'
    html.classList.remove('dark')
    html.style.setProperty('--font-scale', '1')
    html.style.fontSize = '' // au cas où tu l’as fixé en inline

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
