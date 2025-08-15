import api from './api';

export function applyPrefs({ theme = 'system', fontScale = 1 } = {}) {
  const html = document.documentElement;
  // thème: system = suit media query
  const resolved = theme === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  html.setAttribute('data-theme', resolved);
  html.style.setProperty('--font-scale', String(fontScale || 1));
}

export async function loadAndApplyPrefs() {
  try {
    const r = await api.get('/api/user/prefs')
    applyPrefs(r.data)
    return r.data
  } catch (e) {
    // 401 non connecté => valeurs par défaut sans bruit
    applyPrefs({ theme: 'system', fontScale: 1 })
    return { theme: 'system', fontScale: 1 }
  }
}

