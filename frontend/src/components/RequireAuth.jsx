// frontend/src/components/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

export default function RequireAuth({ children }) {
  const [ok, setOk] = useState(null); // null = loading
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    api.get('/api/auth/me')
      .then(r => {
        if (!mounted) return;
        const u = r?.data?.user ?? r?.data ?? null;
        const has = u && (u.id || u._id || u.email);
        setOk(!!has);
      })
      .catch(() => { if (mounted) setOk(false); });
    return () => { mounted = false; };
  }, [location.pathname]);

  if (ok === null) return null; // spinner si tu veux
  if (!ok) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
