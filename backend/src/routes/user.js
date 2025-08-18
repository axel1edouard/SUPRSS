import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Lire préférences
router.get('/prefs', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('prefs.theme prefs.fontScale');
    const theme = user?.prefs?.theme === 'dark' ? 'dark' : 'light';
    const fontScale = Number(user?.prefs?.fontScale ?? 1);
    res.json({ ok: true, prefs: { theme, fontScale } });
  } catch (e) { next(e); }
});

async function savePrefsFor(userId, body) {
  const theme = body?.theme === 'dark' ? 'dark' : 'light';
  const fsRaw = Number(body?.fontScale ?? 1);
  const fontScale = Math.min(1.5, Math.max(0.8, Number.isNaN(fsRaw) ? 1 : fsRaw));
  await User.updateOne(
    { _id: userId },
    { $set: { 'prefs.theme': theme, 'prefs.fontScale': fontScale } },
    { upsert: false }
  );
  return { theme, fontScale };
}

// Mettre à jour préférences
router.patch('/prefs', requireAuth, async (req, res, next) => {
  try {
    const prefs = await savePrefsFor(req.user.id, req.body);
    res.json({ ok: true, prefs });
  } catch (e) { next(e); }
});

// Changer le mot de passe
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'invalid password' });
  }
  const user = await User.findById(req.user.id).select('passwordHash');
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return res.status(403).json({ error: 'wrong password' });
  const hash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = hash;
  await user.save();
  res.json({ ok: true });
});

export default router;
