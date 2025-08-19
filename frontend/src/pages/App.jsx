// frontend/src/pages/App.jsx
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { loadAndApplyPrefs } from '../lib/prefs';

function extractUser(resp) {
  // tolère de nombreuses formes: {user:{...}} ou {...} direct
  const d = resp?.data;
  const u = d?.user ?? d ?? null;
  const has = u && (u.id || u._id || u.email || u.username || u.name);
  return has ? u : null;
}

export default function App() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/me')
      .then((r) => { if (mounted) setMe(extractUser(r)); })
      .catch(() => { if (mounted) setMe(null); });
    return () => { mounted = false; };
  }, []);

  // Recharger après chaque navigation (utile juste après le login)
  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/me')
      .then((r) => { if (mounted) setMe(extractUser(r)); })
      .catch(() => { if (mounted) setMe(null); });
    return () => { mounted = false; };
  }, [location.pathname]);

  // Appliquer automatiquement thème/zoom quand l'utilisateur est présent
  useEffect(() => {
    if (me) loadAndApplyPrefs().catch(() => {});
  }, [me?.id, me?._id, me?.email]);

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    // Reset UI local (évite la “fuite” entre comptes)
    try { localStorage.removeItem('suprss_theme'); } catch {}
    const html = document.documentElement;
    html.dataset.theme = 'light';
    html.classList.remove('dark');
    html.style.setProperty('--font-scale', '1');
    html.style.fontSize = '';
    setMe(null);
    navigate('/login', { replace: true });
  };

  // Cacher la barre sur Home + Login (+ Register si tu en as une)
  const hideHeader = ['/', '/login', '/register'].includes(location.pathname);

  return (
    <div className="app-shell">
      {!hideHeader && (
        <header className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <Link to="/" className="brand" style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>🦋 SUPRSS</Link>

          <nav style={{ display: 'flex', gap: 10 }}>
            <NavLink to="/feeds" className={({isActive}) => isActive ? 'link active' : 'link'}>Articles</NavLink>
            <NavLink to="/collections" className={({isActive}) => isActive ? 'link active' : 'link'}>Collections</NavLink>
            <NavLink to="/settings" className={({isActive}) => isActive ? 'link active' : 'link'}>Paramètres</NavLink>
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {me ? (
              <>
                {/* Affiche name > username > email */}
                <span className="muted" title={me.email || me.username}>
                  {me.name || me.username || me.email}
                </span>
                <button className="btn" onClick={logout}>Déconnexion</button>
              </>
            ) : (
              <Link className="btn" to="/login">Se connecter</Link>
            )}
          </div>
        </header>
      )}

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
