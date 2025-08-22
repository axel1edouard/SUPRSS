import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [me, setMe] = useState(null);
  const [loggedIn, setLoggedIn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    localStorage.setItem('suprss_pending_invite', token);

    (async () => {
      try {
        const mr = await api.get('/api/auth/me');
        if (!alive) return;
        setMe(mr.data?.user || mr.data || null);
        setLoggedIn(true);
      } catch {
        if (!alive) return;
        setLoggedIn(false);
      }
    })();

    return () => { alive = false; };
  }, [token]);

  const accept = async () => {
  setBusy(true); setErr('');
  try {
    // ⚠️ utiliser la route réelle du back :
    const r = await api.post(`/api/collections/invitations/${encodeURIComponent(token)}/accept`);
    const cid = r?.data?.collectionId;
    localStorage.removeItem('suprss_pending_invite');
    toast?.("Invitation acceptée !");
    navigate(cid ? `/collections/${cid}` : '/collections', { replace: true });
  } catch (e) {
    const s = e?.response?.status;
    if (s === 401) {
      navigate('/login', { replace: true, state: { from: `/invite/${token}` } });
    } else if (s === 409) {
      const cid = e?.response?.data?.collectionId;
      toast?.("Vous êtes déjà membre de cette collection.");
      navigate(cid ? `/collections/${cid}` : '/collections', { replace: true });
    } else if (s === 410) {
      setErr("Cette invitation a expiré.");
    } else if (s === 403) {
      setErr("Cette invitation n'est pas destinée au compte connecté.");
    } else {
      setErr("Lien invalide ou expiré.");
    }
  } finally {
    setBusy(false);
  }
};

  return (
    <div style={{ maxWidth: 560, margin: '40px auto' }}>
      <h2>Invitation à rejoindre une collection</h2>

      {info?.collection?.title || info?.title ? (
        <p>Collection : <b>{info?.collection?.title || info?.title}</b></p>
      ) : null}

      {loggedIn === null && <p className="muted">Vérification…</p>}

      {loggedIn === false ? (
        <>
          <p>Vous devez être connecté pour accepter cette invitation.</p>
          <div style={{ display:'flex', gap:8 }}>
            <Link className="btn btn--primary" to="/login" state={{ from: `/invite/${token}` }}>Se connecter</Link>
            <Link className="btn" to="/register" state={{ from: `/invite/${token}` }}>Créer un compte</Link>
          </div>
        </>
      ) : (
        <button className="btn btn--primary" onClick={accept} disabled={busy}>
          {busy ? 'Traitement…' : "Accepter l'invitation"}
        </button>
      )}

      {err && <p style={{ color: 'var(--danger,#b91c1c)', marginTop: 10 }}>{err}</p>}

      <p style={{ marginTop: 12 }}>
        <Link className="link" to="/collections">← Retour</Link>
      </p>
    </div>
  );
}
