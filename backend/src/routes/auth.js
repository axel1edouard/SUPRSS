// backend/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { setAuthCookie, clearAuthCookie } from '../utils/setAuthCookie.js';
import { requireAuth } from '../middleware/auth.js'; // si présent dans ton projet

const router = Router();

/**
 * POST /api/auth/register
 * Body: { name?, email, password }
 */
router.post('/register', async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ ok: false, message: 'Email et mot de passe requis.' });
  }

  const exists = await User.findOne({ email: cleanEmail });
  if (exists) {
    return res.status(409).json({ ok: false, message: 'Email déjà utilisé.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim() || undefined,
    email: cleanEmail,
    passwordHash,
    prefs: { theme: 'light', fontScale: 1 },
  });

  // Laisse le front se connecter juste après (Register.jsx enchaîne avec /login)
  return res.status(201).json({ ok: true, user: { _id: user._id, email: user.email, name: user.name } });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) return res.status(400).json({ ok: false, message: 'missing' });

  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ ok: false, message: 'invalid' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, message: 'invalid' });

  // Pose le cookie de session / JWT selon ton implémentation
  setAuthCookie(res, user._id);
  return res.json({ ok: true, user: { _id: user._id, email: user.email, name: user.name } });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * Retourne l’utilisateur courant. Adapte selon ton middleware d’auth.
 */
router.get('/me', requireAuth, async (req, res) => {
  const u = req.user;
  if (!u) return res.status(401).json({ ok: false });
  res.json({ user: { _id: u._id, email: u.email, name: u.name } });
});

export default router;
