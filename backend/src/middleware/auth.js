import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    // 1) récupérer le token depuis plusieurs emplacements
    const cookies = req.cookies || {}
    let token =
      cookies.token ||           
      cookies.auth ||            
      cookies.jwt || null        

    if (!token) {
      const hdr = req.headers.authorization || ''
      if (hdr.startsWith('Bearer ')) token = hdr.slice(7)
    }
    if (!token) return res.status(401).json({ error: 'no_token' })

    // 2) vérifier et charger l'utilisateur
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id).select('_id email')
    if (!user) return res.status(401).json({ error: 'invalid_user' })

    // 3) attacher l’utilisateur
    req.user = { id: String(user._id), _id: user._id, email: user.email }
    next()
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}
