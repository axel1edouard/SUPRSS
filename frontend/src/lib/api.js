import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ||         
  import.meta.env.VITE_API_BASE ||        
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
    
    const isPublic =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/invite/');

    if (status === 401 && !isPublic) {
      // Garde le chemin pour revenir après login
      const next = encodeURIComponent(pathname + search + hash);
      window.location.assign(`/login?next=${next}`);
      
    }
   
    return Promise.reject(error);
  }
);

export default api;
