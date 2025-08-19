import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

import App from './pages/App.jsx'
import './index.css'
import { loadAndApplyPrefs } from './lib/prefs.js'

import Feeds from './pages/Feeds.jsx'
import Collections from './pages/Collections.jsx'
import CollectionView from './pages/CollectionView.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'

import RequireAuth from './components/RequireAuth.jsx'
import HomeRedirect from './components/HomeRedirect.jsx'

function Root() {
  useEffect(() => { loadAndApplyPrefs() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          {/* racine : si connecté -> /feeds, sinon -> /login */}
          <Route index element={<HomeRedirect />} />

          {/* privées */}
          <Route path="feeds" element={<RequireAuth><Feeds /></RequireAuth>} />
          <Route path="collections" element={<RequireAuth><Collections /></RequireAuth>} />
          <Route path="collections/:id" element={<RequireAuth><CollectionView /></RequireAuth>} />
          <Route path="settings" element={<RequireAuth><Settings /></RequireAuth>} />

          {/* publiques */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="invite/:token" element={<AcceptInvite />} />

          {/* fallback */}
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
