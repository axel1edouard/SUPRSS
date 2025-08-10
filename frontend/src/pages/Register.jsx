import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/api/auth/register', { name, email, password })
      await api.post('/api/auth/login', { email, password })
      navigate('/feeds')
    } catch (e) {
      setError('Erreur à l’inscription')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto' }}>
      <h1>Créer un compte</h1>
      <form onSubmit={submit}>
        <label>Nom</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
        <label>Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit">Créer</button>
      </form>
    </div>
  )
}
