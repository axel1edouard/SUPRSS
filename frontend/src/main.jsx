import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './pages/App.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Feeds from './pages/Feeds.jsx'
import Collections from './pages/Collections.jsx'
import CollectionView from './pages/CollectionView.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/feeds" />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="feeds" element={<Feeds />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:id" element={<CollectionView />} />
        <Route path="invite/:token" element={<AcceptInvite />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
