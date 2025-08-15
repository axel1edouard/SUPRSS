import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_GOOGLE_CALLBACK_URL } = process.env
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !OAUTH_GOOGLE_CALLBACK_URL) {
  console.warn('[oauth] Google env vars missing; OAuth disabled')
}

passport.use('google', new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID || 'disabled',
    clientSecret: GOOGLE_CLIENT_SECRET || 'disabled',
    callbackURL: OAUTH_GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => done(null, profile)
))
