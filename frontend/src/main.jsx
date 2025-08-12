import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import App from './pages/App.jsx'          // ou './App.jsx' si tu l’as à la racine
import './index.css'
import { loadAndApplyPrefs } from './lib/prefs.js'

import Feeds from './pages/Feeds.jsx'
import Collections from './pages/Collections.jsx'
import CollectionView from './pages/CollectionView.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'

function Root() {
  useEffect(() => { loadAndApplyPrefs() }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/feeds" replace />} />
          <Route path="feeds" element={<Feeds />} />
          <Route path="collections" element={<Collections />} />
          <Route path="collections/:id" element={<CollectionView />} />
          <Route path="settings" element={<Settings />} />
          <Route path="invite/:token" element={<AcceptInvite />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
