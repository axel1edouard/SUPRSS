import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { setAuthCookie, clearAuthCookie } from '../utils/setAuthCookie.js';
import { requireAuth } from '../middleware/auth.js'; 

const router = Router();

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

  return res.status(201).json({ ok: true, user: { _id: user._id, email: user.email, name: user.name } });
});


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


  setAuthCookie(res, user._id);
  return res.json({ ok: true, user: { _id: user._id, email: user.email, name: user.name } });
});


router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});


router.get('/me', requireAuth, async (req, res) => {
  const u = req.user;
  if (!u) return res.status(401).json({ ok: false });
  res.json({ user: { _id: u._id, email: u.email, name: u.name } });
});

export default router;
