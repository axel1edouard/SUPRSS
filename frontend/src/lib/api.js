import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ||         // compat avec l'ancien nom
  import.meta.env.VITE_API_BASE ||        // ton nom actuel
  'http://localhost:4000';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const { pathname, search, hash } = window.location;
    // Pages publiques (pas de redirection auto sur 401)
    const isPublic =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/invite/');

    if (status === 401 && !isPublic) {
      // Garde le chemin pour revenir après login
      const next = encodeURIComponent(pathname + search + hash);
      window.location.assign(`/login?next=${next}`);
      // (si ton Login lit aussi location.state.from, ça marchera quand même)
    }
    // Optionnel: gestion 403, 5xx, network errors…
    return Promise.reject(error);
  }
);

export default api;
