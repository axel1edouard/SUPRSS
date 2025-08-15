import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { setAuthCookie, clearAuthCookie } from '../utils/setAuthCookie.js'
import { requireAuth } from '../middleware/auth.js' // suppose déjà présent dans ton projet

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim()
    const password = req.body?.password || ''
    if (!email || !password) return res.status(400).json({ error: 'missing' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'invalid' })

    // bcryptjs sait lire un hash bcrypt existant
    const ok = user.passwordHash && await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'invalid' })

    setAuthCookie(res, user)
    return res.json({ ok: true })
  } catch (e) {
    console.error('login error', e)
    return res.status(500).json({ error: 'server' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ _id: req.user._id, email: req.user.email })
})

export default router
