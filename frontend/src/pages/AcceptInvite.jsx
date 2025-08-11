import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('Validation de l’invitation…')

  useEffect(() => {
    (async () => {
      try {
        const r = await api.post(`/api/collections/invitations/${token}/accept`)
        setMsg('Invitation acceptée. Redirection…')
        setTimeout(() => navigate(`/collections/${r.data.collectionId}`), 800)
      } catch (e) {
        setMsg('Invitation invalide ou expirée.')
      }
    })()
  }, [token])

  return <div style={{ margin: '10vh auto', maxWidth: 420 }}><h2>{msg}</h2></div>
}
