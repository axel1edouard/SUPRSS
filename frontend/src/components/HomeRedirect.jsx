import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function HomeRedirect() {
  const nav = useNavigate()
  useEffect(() => {
    api.get('/api/auth/me')
      .then(() => nav('/feeds', { replace: true }))
      .catch(() => nav('/login', { replace: true }))
  }, [nav])
  return null
}
