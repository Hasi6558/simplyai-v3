import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const googleId = profile.id;

    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      `SELECT p.*, a.user_id 
       FROM profiles p 
       LEFT JOIN auth a ON p.id = a.user_id 
       WHERE p.email = ? OR p.google_id = ?`,
      [email, googleId]
    );

    console.log('🔍 Google OAuth check - Email:', email, 'GoogleId:', googleId);
    console.log('🔍 Existing users found:', existingUsers.length);

    if (existingUsers.length > 0) {
      // User exists, update google_id if not set
      const user = existingUsers[0];
      console.log('🔍 Existing user found:', user.email, 'Current Google ID:', user.google_id);
      
      if (!user.google_id) {
        console.log('🔄 Updating user with Google ID:', googleId);
        await pool.execute(
          'UPDATE profiles SET google_id = ? WHERE id = ?',
          [googleId, user.id]
        );
        console.log('✅ Google ID updated for existing user');
        user.google_id = googleId; // Update local object
      }
      // Mark as existing user
      user.isNewUser = false;
      console.log('🔄 Returning existing user with Google ID:', user.google_id);
      return done(null, user);
    }

    // New user - don't create account yet, just return profile data
    console.log('🆕 New Google user detected:', email);
    const newUserData = {
      isNewUser: true,
      googleProfile: {
        email,
        firstName,
        lastName,
        googleId
      }
    };
    
    console.log('🔄 Returning new user data for pricing page');
    return done(null, newUserData);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID || 'your_facebook_app_id',
  clientSecret: process.env.FACEBOOK_APP_SECRET || 'your_facebook_app_secret',
  callbackURL: "http://localhost:4000/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const facebookId = profile.id;

    if (!email) {
      return done(new Error('No email found in Facebook profile'), null);
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      `SELECT p.*, a.user_id 
       FROM profiles p 
       LEFT JOIN auth a ON p.id = a.user_id 
       WHERE p.email = ? OR p.facebook_id = ?`,
      [email, facebookId]
    );

    if (existingUsers.length > 0) {
      // User exists, update facebook_id if not set
      const user = existingUsers[0];
      if (!user.facebook_id) {
        await pool.execute(
          'UPDATE profiles SET facebook_id = ? WHERE id = ?',
          [facebookId, user.id]
        );
      }
      // Mark as existing user
      user.isNewUser = false;
      return done(null, user);
    }

    // New user - don't create account yet, just return profile data
    const newUserData = {
      isNewUser: true,
      facebookProfile: {
        email,
        firstName,
        lastName,
        facebookId
      }
    };
    
    return done(null, newUserData);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const [users] = await pool.execute(
      `SELECT p.*, a.user_id 
       FROM profiles p 
       LEFT JOIN auth a ON p.id = a.user_id 
       WHERE p.id = ?`,
      [userId]
    );
    done(null, users[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
