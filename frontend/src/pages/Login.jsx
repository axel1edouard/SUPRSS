import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('demo@suprss.local')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/api/auth/login', { email, password })
      navigate('/feeds')
    } catch (e) {
      setError('Identifiants invalides')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto' }}>
      <h1>Connexion</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
        <label>Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit">Se connecter</button>
      </form>
      <p>Pas de compte ? <Link to="/register">Créer un compte</Link></p>
    </div>
  )
}
