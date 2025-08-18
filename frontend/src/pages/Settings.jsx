// frontend/src/pages/Settings.jsx
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { applyPrefs, loadAndApplyPrefs, savePrefs } from '../lib/prefs';
import { toast } from '../lib/toast';

export default function Settings() {
  const [theme, setTheme] = useState('light');     // 'light' | 'dark'
  const [fontScale, setFontScale] = useState(1);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadAndApplyPrefs()
      .then(p => { setTheme(p.theme); setFontScale(p.fontScale); })
      .catch(() => {});
  }, []);

  async function onSavePrefs(e) {
    e.preventDefault();
    const applied = await savePrefs({ theme, fontScale });
    setTheme(applied.theme);
    setFontScale(applied.fontScale);
    setMsg('Préférences enregistrées ✅');
    toast?.('Préférences enregistrées');
    setTimeout(() => setMsg(''), 2000);
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!oldPw || !newPw) return;
    try {
      await api.post('/api/user/change-password', { oldPassword: oldPw, newPassword: newPw });
      setOldPw(''); setNewPw('');
      setMsg('Mot de passe changé ✅');
    } catch {
      setMsg('Échec du changement de mot de passe ❌');
    } finally {
      setTimeout(() => setMsg(''), 2500);
    }
  }

  return (
    <div>
      <h2>Paramètres</h2>
      {msg && <div style={{ margin: '8px 0', color: 'var(--accent)' }}>{msg}</div>}

      <form onSubmit={onSavePrefs} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <div>
          <label>Thème</label>
          <select value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </div>

        <div>
          <label>Taille du texte</label>
          <input
            type="range"
            min="0.85"
            max="1.25"
            step="0.05"
            value={fontScale}
            onChange={e => setFontScale(parseFloat(e.target.value))}
          />
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {Math.round(Number(fontScale) * 100)}%
          </div>
        </div>

        <button type="submit">Enregistrer</button>
      </form>

      <h3 style={{ marginTop: 24 }}>Sécurité</h3>
      <form onSubmit={changePassword} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <div>
          <label>Ancien mot de passe</label>
          <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
        </div>
        <div>
          <label>Nouveau mot de passe</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="≥ 6 caractères" />
        </div>
        <button type="submit">Changer le mot de passe</button>
      </form>
    </div>
  );
}
