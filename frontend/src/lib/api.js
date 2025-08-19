import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
  withCredentials: true
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // toast?.('Session expirée. Veuillez vous reconnecter.');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    } else if (status >= 500) {
      // toast?.("Erreur serveur. Réessayez plus tard.");
    }
    return Promise.reject(error);
  }
);

export default api;
