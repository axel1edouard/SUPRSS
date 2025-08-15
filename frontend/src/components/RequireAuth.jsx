import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function RequireAuth({ children }) {
  const nav = useNavigate()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/api/auth/me')
      .then(() => alive && setOk(true))
      .catch(() => alive && nav('/login', { replace: true }))
    return () => { alive = false }
  }, [nav])

  if (!ok) return null
  return children
}
