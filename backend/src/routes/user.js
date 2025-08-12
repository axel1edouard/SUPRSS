import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Lire préférences
router.get('/prefs', requireAuth, async (req, res) => {
  const u = await User.findById(req.user.id).select('preferences').lean();
  res.json(u?.preferences || { theme: 'system', fontScale: 1 });
});

// Mettre à jour préférences
router.patch('/prefs', requireAuth, async (req, res) => {
  const theme = req.body?.theme;
  const fontScale = req.body?.fontScale;
  const update = {};
  if (['system','light','dark'].includes(theme)) update['preferences.theme'] = theme;
  if (typeof fontScale === 'number' && fontScale >= 0.85 && fontScale <= 1.25) {
    update['preferences.fontScale'] = fontScale;
  }
  if (!Object.keys(update).length) return res.status(400).json({ error: 'invalid payload' });
  await User.updateOne({ _id: req.user.id }, { $set: update });
  const u = await User.findById(req.user.id).select('preferences').lean();
  res.json(u.preferences);
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
