// frontend/src/lib/prefs.js
import api from '../lib/api'; // ajuste si ton client API est ailleurs

const KEY = 'suprss_theme';
const norm = (t) => (t === 'dark' ? 'dark' : 'light');
const clampScale = (s) => {
  const n = Number(s);
  if (Number.isNaN(n)) return 1;
  return Math.min(1.5, Math.max(0.8, n));
};

function applyFontScale(fontScale) {
  const fs = clampScale(fontScale);
  const html = document.documentElement;
  html.style.setProperty('--font-scale', String(fs));
  // Optionnel (effet immédiat même sans CSS global) :
  // html.style.fontSize = `${16 * fs}px`;
  return fs;
}

export function applyPrefs({ theme = 'light', fontScale = 1 } = {}) {
  const t = norm(theme);
  const fs = applyFontScale(fontScale);

  const html = document.documentElement;
  const body = document.body;
  html.dataset.theme = t;                         // compatible avec index.css
  html.classList.toggle('dark', t === 'dark');    // utile si Tailwind 'class'
  body?.classList?.toggle?.('dark', t === 'dark');

  try { localStorage.setItem(KEY, t); } catch {}
  return { theme: t, fontScale: fs };
}

export async function loadAndApplyPrefs() {
  try {
    const r = await api.get('/api/user/prefs');
    const data = r?.data?.prefs ?? r?.data ?? {};
    return applyPrefs({
      theme: data.theme,
      fontScale: data.fontScale ?? 1,
    });
  } catch {
    // Fallback local (évite l’effet “tous les comptes” si tu ajoutes le reset au logout)
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    return applyPrefs({ theme: saved ?? 'light', fontScale: 1 });
  }
}

export async function savePrefs(prefs) {
  const payload = {
    theme: norm(prefs?.theme),
    fontScale: clampScale(prefs?.fontScale ?? 1),
  };
  // Tente PATCH
  try {
    const r = await api.patch('/api/user/prefs', payload);
    const data = r?.data?.prefs ?? r?.data ?? payload;
    return applyPrefs({ theme: data.theme, fontScale: data.fontScale });
  } catch {
    // Fallback POST
    try {
      const r = await api.post('/api/user/prefs', payload);
      const data = r?.data?.prefs ?? r?.data ?? payload;
      return applyPrefs({ theme: data.theme, fontScale: data.fontScale });
    } catch {
      // En dernier recours, applique localement
      return applyPrefs(payload);
    }
  }
}
