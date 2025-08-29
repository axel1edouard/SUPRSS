import jwt from 'jsonwebtoken'

export function setAuthCookie(res, user) {
  // 7 jours
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

  const dev = process.env.NODE_ENV !== 'production'

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: dev ? 'Lax' : 'None',
    secure: !dev,
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000
  })
}

export function clearAuthCookie(res) {
  const dev = process.env.NODE_ENV !== 'production'
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: dev ? 'Lax' : 'None',
    secure: !dev,
    path: '/'
  })
}
