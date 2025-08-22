import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import { ButterflyLogo } from '../components/Logo';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password !== confirm) {
      toast?.("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      setBusy(true);
      // 1) création du compte
      await api.post('/api/auth/register', { name, email, password });
      // 2) tentative d’auto-login (si l’API ne log pas déjà)
      try {
        await api.post('/api/auth/login', { email, password });
        navigate('/feeds', { replace: true });
      } catch {
        toast?.("Compte créé. Veuillez vous connecter.");
        navigate('/login', { replace: true });
      }
    } catch (err) {
      toast?.("Création de compte impossible. Vérifiez vos informations.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home-hero">
      <div className="home-hero__content" style={{ maxWidth: 520 }}>
        <div className="home-hero__logo" style={{ marginBottom: 8 }}>
          <ButterflyLogo size={48} />
          <h1>SUPRSS</h1>
        </div>

        <p className="home-hero__tagline">
          Le lecteur RSS collaboratif qui rassemble vos sources… et vos équipes.
        </p>
        <p className="home-hero__credit">par <strong>InfoFlux Pro</strong> — A. EDOUARD</p>

        <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <input
            type="text"
            placeholder="Nom (optionnel)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
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
            placeholder="Mot de passe (min. 8 caractères)"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirmez le mot de passe"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          <button className="btn btn--primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          <span className="muted">Déjà un compte ? </span>
          <Link className="link" to="/login">Se connecter</Link>
        </div>

        <div style={{ marginTop: 12 }}>
          <Link className="link" to="/">← Retour à l’accueil</Link>
        </div>
      </div>
    </div>
  );
}
