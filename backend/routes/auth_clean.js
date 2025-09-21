import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db.js';
import passport from '../config/passport.js';

const router = express.Router();

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, subscription_plan } = req.body;

    console.log('Registration attempt:', { email, firstName, lastName, phone, subscription_plan });

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Check if user already exists (email is in profiles table)
    const [existingUsers] = await pool.execute(
      'SELECT id FROM profiles WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = uuidv4();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert into auth table (user_id, password_hash)
      await connection.execute(
        'INSERT INTO auth (user_id, password_hash, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [userId, hashedPassword]
      );

      // Insert into profiles table (id, email, first_name, last_name, phone, etc.)
      await connection.execute(
        'INSERT INTO profiles (id, email, first_name, last_name, phone, full_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, email, firstName, lastName, phone || null, `${firstName} ${lastName}`]
      );

      // Insert subscription if provided
      if (subscription_plan) {
        await connection.execute(
          'INSERT INTO user_subscriptions (id, user_id, plan_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [uuidv4(), userId, subscription_plan, 'active']
        );
      }

      await connection.commit();
      connection.release();

      // Generate JWT token
      const token = jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('User registered successfully:', userId);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            phone
          },
          token
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user from database (email is in profiles, password_hash is in auth)
    const [users] = await pool.execute(
      `SELECT p.id, p.email, p.first_name, p.last_name, p.phone, p.role, a.password_hash 
       FROM profiles p 
       JOIN auth a ON p.id COLLATE utf8mb4_general_ci = a.user_id 
       WHERE p.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User logged in successfully:', user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isAdmin: user.role === 'administrator'
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;    const [users] = await pool.execute(
      `SELECT p.id, p.email, p.first_name, p.last_name, p.phone, p.role,
              s.plan_id, s.status as subscription_status
       FROM profiles p 
       LEFT JOIN user_subscriptions s ON p.id COLLATE utf8mb4_general_ci = s.user_id
       WHERE p.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          subscriptionPlan: user.plan_id,
          subscriptionStatus: user.subscription_status,
          isAdmin: user.role === 'administrator'
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: error.message
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout'
    });
  }
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
}

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      
      // Check if this is a new user
      if (req.user.isNewUser) {
        // New user - redirect to pricing page with Google profile data
        const googleData = encodeURIComponent(JSON.stringify(req.user.googleProfile));
        res.redirect(`${frontendUrl}/pricing?google_signup=true&google_data=${googleData}`);
        return;
      }
      
      // Existing user - generate JWT token and redirect to dashboard
      const token = jwt.sign(
        { 
          userId: req.user.id,
          email: req.user.email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      
      // Check if this is a new user
      if (req.user.isNewUser) {
        // New user - redirect to pricing page with Facebook profile data
        const facebookData = encodeURIComponent(JSON.stringify(req.user.facebookProfile));
        res.redirect(`${frontendUrl}/pricing?facebook_signup=true&facebook_data=${facebookData}`);
        return;
      }
      
      // Existing user - generate JWT token and redirect to dashboard
      const token = jwt.sign(
        { 
          userId: req.user.id,
          email: req.user.email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
);

// Admin middleware - requires administrator role
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate the token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check user role in database (always verify from database, not just token)
    const [users] = await pool.execute(
      `SELECT p.role FROM profiles p WHERE p.id = ?`,
      [decoded.userId]
    );

    if (users.length === 0 || users[0].role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Administrator access required'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Google registration completion endpoint
router.post('/register/google', async (req, res) => {
  try {
    const { googleData, subscription_plan } = req.body;

    console.log('Google registration completion:', { googleData, subscription_plan });

    // Validate required Google data
    if (!googleData || !googleData.email || !googleData.firstName || !googleData.lastName || !googleData.googleId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google profile data'
      });
    }

    const { email, firstName, lastName, googleId } = googleData;

    // Check if user already exists (to prevent duplicate registration)
    const [existingUsers] = await pool.execute(
      'SELECT id FROM profiles WHERE email = ? OR google_id = ?',
      [email, googleId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or Google account already exists'
      });
    }

    // Generate user ID
    const userId = uuidv4();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create auth record (no password for OAuth users)
      await connection.execute(
        'INSERT INTO auth (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [userId]
      );

      // Create profile record with subscription plan
      await connection.execute(
        `INSERT INTO profiles (id, email, first_name, last_name, full_name, google_id, subscription_plan, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, email, firstName, lastName, `${firstName} ${lastName}`, googleId, subscription_plan || 'free']
      );

      await connection.commit();
      connection.release();

      // Generate JWT token for the new user
      const token = jwt.sign(
        { 
          userId: userId,
          email: email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Google user registered successfully:', userId);

      res.status(201).json({
        success: true,
        message: 'Google user registered successfully',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            subscription_plan: subscription_plan || 'free'
          },
          token
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Google registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to register Google user',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Facebook registration completion endpoint
router.post('/register/facebook', async (req, res) => {
  try {
    const { facebookData, subscription_plan } = req.body;

    console.log('Facebook registration completion:', { facebookData, subscription_plan });

    // Validate required Facebook data
    if (!facebookData || !facebookData.email || !facebookData.firstName || !facebookData.lastName || !facebookData.facebookId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Facebook profile data'
      });
    }

    const { email, firstName, lastName, facebookId } = facebookData;

    // Check if user already exists (to prevent duplicate registration)
    const [existingUsers] = await pool.execute(
      'SELECT id FROM profiles WHERE email = ? OR facebook_id = ?',
      [email, facebookId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or Facebook account already exists'
      });
    }

    // Generate user ID
    const userId = uuidv4();

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create auth record (no password for OAuth users)
      await connection.execute(
        'INSERT INTO auth (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [userId]
      );

      // Create profile record with subscription plan
      await connection.execute(
        `INSERT INTO profiles (id, email, first_name, last_name, full_name, facebook_id, subscription_plan, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, email, firstName, lastName, `${firstName} ${lastName}`, facebookId, subscription_plan || 'free']
      );

      await connection.commit();
      connection.release();

      // Generate JWT token for the new user
      const token = jwt.sign(
        { 
          userId: userId,
          email: email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Facebook user registered successfully:', userId);

      res.status(201).json({
        success: true,
        message: 'Facebook user registered successfully',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            subscription_plan: subscription_plan || 'free'
          },
          token
        }
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Facebook registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to register Facebook user',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

export default router;
export { authenticateToken, requireAdmin };
