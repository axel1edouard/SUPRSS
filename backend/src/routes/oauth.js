import { Router } from 'express';
import passport from 'passport';
import './passport-google.js'; 
import User from '../models/User.js';
import { setAuthCookie } from '../utils/setAuthCookie.js';

const router = Router();
const FRONT = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_READY =
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  !!process.env.OAUTH_GOOGLE_CALLBACK_URL;

/**
 * Lance le flow OAuth Google
 */
router.get('/google', (req, res, next) => {
  if (!GOOGLE_READY) {
    console.warn('[oauth] Google OAuth not configured.');
    return res.status(503).json({ error: 'google_oauth_disabled' });
  }
  return passport.authenticate('google', {
    scope: ['email', 'profile'],
    prompt: 'select_account',
  })(req, res, next);
});

/**
 * Callback Google
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!GOOGLE_READY) return res.redirect(FRONT + '/login?error=disabled');
    next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: FRONT + '/login?error=google',
  }),
  async (req, res) => {
    try {
      const profile = req.user;
      const googleId = profile?.id;
      const email = (profile?.emails?.[0]?.value || '').toLowerCase();

      if (!email) {
        return res.redirect(FRONT + '/login?error=noemail');
      }

            const displayName =
        profile?.displayName ||
        [profile?.name?.givenName, profile?.name?.familyName]
          .filter(Boolean)
          .join(' ') ||
        email.split('@')[0];

      // 1) utilisateur déjà lié à Google ?
      let user = await User.findOne({ googleId });

      // 2) sinon, associer via l'email s'il existe déjà
      if (!user) {
        user = await User.findOne({ email });
        if (user) {
          user.googleId = googleId;
          if (!user.name) user.name = displayName;
          await user.save();
        }
      }

      // 3) sinon, créer un nouveau compte SANS mot de passe
      if (!user) {
        user = await User.create({
          email,
          name: displayName,
          passwordHash: null, 
          googleId,
        });
      }

    
      setAuthCookie(res, user);

      
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(
        `
<!doctype html>
<meta http-equiv="refresh" content="0;url=${FRONT}/feeds">
<script>location.replace(${JSON.stringify(FRONT + '/feeds')});</script>
`.trim()
      );
    } catch (e) {
      console.error('OAuth callback error', e);
      return res.redirect(FRONT + '/login?error=server');
    }
  }
);

export default router;
