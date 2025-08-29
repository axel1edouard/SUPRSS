import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';

function ButterflyLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Logo SUPRSS (papillon)">
      <rect x="30" y="22" width="4" height="20" rx="2" fill="var(--brand-700)" />
      <ellipse cx="22" cy="28" rx="14" ry="10" fill="var(--brand-300)" />
      <ellipse cx="42" cy="28" rx="14" ry="10" fill="var(--brand-400)" />
      <ellipse cx="24" cy="40" rx="12" ry="9" fill="var(--brand-200)" />
      <ellipse cx="40" cy="40" rx="12" ry="9" fill="var(--brand-300)" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setBusy(true);
      await api.post('/api/auth/login', { email, password });
      navigate('/feeds', { replace: true });
    } catch {
      toast?.("Identifiants invalides ou échec de connexion.");
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = () => {
    // Redirige vers l'endpoint OAuth 
    const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
    window.location.assign(`${base}/api/auth/google`);
  };

  return (
    <div className="home-hero">
      <div className="home-hero__content" style={{ maxWidth: 520 }}>
        <div className="home-hero__logo" style={{ marginBottom: 8 }}>
          <ButterflyLogo />
          <h1>SUPRSS</h1>
        </div>

        <p className="home-hero__tagline">
          Le lecteur RSS collaboratif qui rassemble vos sources… et vos équipes.
        </p>
        <p className="home-hero__credit">par <strong>InfoFlux Pro</strong> — A. EDOUARD</p>

        <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="btn btn--primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ display:'grid', gap:10, marginTop: 12 }}>
          <div className="muted" style={{ textAlign:'center', fontSize: 12 }}>ou</div>
          <button className="btn btn--google btn-lg" onClick={continueWithGoogle}>
            <span aria-hidden="true" style={{ marginRight:8 }}>🟦</span>
            Continuer avec Google
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <Link className="link" to="/">← Retour à l’accueil</Link>
        </div>
      </div>
    </div>
  );
}
