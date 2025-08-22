import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import App from './pages/App.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Feeds from './pages/Feeds.jsx';
import Settings from './pages/Settings.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Collections from './pages/Collections.jsx';
import CollectionView from './pages/CollectionView.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />}>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      
      {/* Protégées */}
      <Route path="/feeds" element={<RequireAuth><Feeds /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/collections" element={<RequireAuth><Collections /></RequireAuth>} />
      <Route path="/collections/:id" element={<RequireAuth><CollectionView /></RequireAuth>} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);
