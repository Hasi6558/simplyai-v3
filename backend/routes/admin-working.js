import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Create database pool with explicit configuration
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'new_schema',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const router = express.Router();

// Temporary middleware for testing
const tempRequireAdmin = (req, res, next) => {
  // For now, just pass through - we'll add proper auth later
  next();
};

// Get all users for admin panel
router.get('/users', tempRequireAdmin, async (req, res) => {
  try {
    console.log('Admin fetching users from database...');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD ? '***' : 'NOT SET'
    });
    
    // Query to get all users with their profile information
    const [users] = await dbPool.execute(`
      SELECT 
        p.id,
        p.email,
        p.full_name,
        p.first_name,
        p.last_name,
        p.role,
        p.created_at,
        p.updated_at as last_login
      FROM profiles p
      ORDER BY 
        CASE 
          WHEN p.role = 'administrator' THEN 1
          WHEN p.role = 'premium_user' THEN 2
          WHEN p.role = 'user' THEN 3
          ELSE 4
        END,
        p.created_at DESC
    `);

    console.log(`Found ${users.length} users in database`);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento degli utenti',
      error: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', tempRequireAdmin, async (req, res) => {
  try {
    const userId = req.params.id; // Keep as string for UUID
    console.log(`Admin attempting to delete user ${userId}`);
    
    // Check if user exists and is not an administrator
    const [existingUsers] = await dbPool.execute(
      'SELECT role FROM profiles WHERE id = ?',
      [userId]
    );
    
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    if (existingUsers[0].role === 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Non è possibile eliminare un amministratore'
      });
    }
    
    // Start transaction
    const connection = await dbPool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete from auth table first (foreign key constraint)
      await connection.execute(
        'DELETE FROM auth WHERE user_id = ?',
        [userId]
      );
      
      // Delete user subscriptions if table exists
      try {
        await connection.execute(
          'DELETE FROM user_subscriptions WHERE user_id = ?',
          [userId]
        );
      } catch (err) {
        // Table might not exist, continue
        console.log('user_subscriptions table might not exist, continuing...');
      }
      
      // Delete user from profiles
      await connection.execute(
        'DELETE FROM profiles WHERE id = ?',
        [userId]
      );
      
      await connection.commit();
      console.log(`User ${userId} deleted successfully`);
      
      res.json({
        success: true,
        message: 'Utente eliminato con successo'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione dell\'utente',
      error: error.message
    });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', tempRequireAdmin, async (req, res) => {
  try {
    const userId = req.params.id; // Keep as string for UUID
    const { role } = req.body;
    
    console.log(`Admin updating user ${userId} role to ${role}`);
    
    // Validate role
    const validRoles = ['user', 'premium_user', 'administrator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ruolo non valido'
      });
    }
    
    // Check if user exists
    const [existingUsers] = await dbPool.execute(
      'SELECT id FROM profiles WHERE id = ?',
      [userId]
    );
    
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    // Update user role
    await dbPool.execute(
      'UPDATE profiles SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    console.log(`User ${userId} role updated to ${role} successfully`);
    
    res.json({
      success: true,
      message: 'Ruolo aggiornato con successo'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del ruolo',
      error: error.message
    });
  }
});

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get questionnaire progress for all users (admin only)
router.get('/users/questionnaire-progress', tempRequireAdmin, async (req, res) => {
  try {
    console.log('✅ CORRECT ROUTE: Admin fetching questionnaire progress for all users');
    
    // Get all users with their active subscriptions
    const [users] = await dbPool.execute(`
      SELECT 
        p.id as user_id,
        us.id as subscription_id,
        us.plan_id,
        sp.name as plan_name
      FROM profiles p
      LEFT JOIN user_subscriptions us ON p.id = us.user_id AND us.status = 'active'
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      ORDER BY p.created_at DESC
    `);
    
    const progressData = {};
    
    // Process each user
    for (const user of users) {
      if (!user.plan_id) {
        // User has no active subscription
        progressData[user.user_id] = {
          totalQuestionnaires: 0,
          completedQuestionnaires: 0,
          percentage: 0,
          planName: null
        };
        continue;
      }
      
      try {
        // Get total questionnaires for this plan
        const [totalQuestionnaireCount] = await dbPool.execute(`
          SELECT COUNT(*) as total
          FROM plan_questionnaires pq
          WHERE pq.plan_id = ?
        `, [user.plan_id]);
        
        const totalQuestionnaires = totalQuestionnaireCount[0].total;
        
        // Get completed questionnaires for this user and plan
        const [completedQuestionnaireCount] = await dbPool.execute(`
          SELECT COUNT(DISTINCT qr.questionnaire_id) as completed
          FROM questionnaire_responses qr
          WHERE qr.user_id = ? 
            AND qr.plan_id = ? 
            AND qr.status = 'completed'
            AND qr.completed_at IS NOT NULL
        `, [user.user_id, user.plan_id]);
        
        const completedQuestionnaires = completedQuestionnaireCount[0].completed;
        const percentage = totalQuestionnaires > 0 ? (completedQuestionnaires / totalQuestionnaires) * 100 : 0;
        
        progressData[user.user_id] = {
          totalQuestionnaires,
          completedQuestionnaires,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
          planName: user.plan_name
        };
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        progressData[user.user_id] = {
          totalQuestionnaires: 0,
          completedQuestionnaires: 0,
          percentage: 0,
          planName: user.plan_name
        };
      }
    }
    
    console.log(`Fetched progress data for ${Object.keys(progressData).length} users`);
    
    res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Error fetching all users questionnaire progress:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento del progresso questionari per tutti gli utenti',
      error: error.message
    });
  }
});

// Get questionnaire progress for a specific user (admin only)
router.get('/users/:id/questionnaire-progress', tempRequireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`✅ Admin fetching questionnaire progress for user ${userId}`);
    
    // Get user's active subscription and plan
    const [subscriptions] = await dbPool.execute(`
      SELECT us.id as subscription_id, us.plan_id, sp.name as plan_name
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalQuestionnaires: 0,
          completedQuestionnaires: 0,
          percentage: 0,
          planName: null
        }
      });
    }
    
    const subscription = subscriptions[0];
    
    // Get total questionnaires assigned to this plan
    const [totalQuestionnaireCount] = await dbPool.execute(`
      SELECT COUNT(*) as total
      FROM plan_questionnaires pq
      WHERE pq.plan_id = ?
    `, [subscription.plan_id]);
    
    const totalQuestionnaires = totalQuestionnaireCount[0].total;
    
    // Get completed questionnaires for this user and plan
    const [completedQuestionnaireCount] = await dbPool.execute(`
      SELECT COUNT(DISTINCT qr.questionnaire_id) as completed
      FROM questionnaire_responses qr
      WHERE qr.user_id = ? 
        AND qr.plan_id = ? 
        AND qr.status = 'completed'
        AND qr.completed_at IS NOT NULL
    `, [userId, subscription.plan_id]);
    
    const completedQuestionnaires = completedQuestionnaireCount[0].completed;
    const percentage = totalQuestionnaires > 0 ? (completedQuestionnaires / totalQuestionnaires) * 100 : 0;
    
    console.log(`User ${userId} progress: ${completedQuestionnaires}/${totalQuestionnaires} (${percentage.toFixed(1)}%)`);
    
    res.json({
      success: true,
      data: {
        totalQuestionnaires,
        completedQuestionnaires,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        planName: subscription.plan_name
      }
    });
  } catch (error) {
    console.error('Error fetching questionnaire progress:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento del progresso questionari',
      error: error.message
    });
  }
});

// Get user details (admin only) - This route must come AFTER specific routes
router.get('/users/:id', tempRequireAdmin, async (req, res) => {
  try {
    const userId = req.params.id; // Keep as string for UUID
    console.log(`Admin fetching details for user ${userId}`);
    
    // Query to get user details with profile info
    const [users] = await dbPool.execute(`
      SELECT 
        p.id,
        p.email,
        p.full_name,
        p.first_name,
        p.last_name,
        p.role,
        p.created_at,
        p.updated_at as last_login
      FROM profiles p
      WHERE p.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento dei dettagli utente',
      error: error.message
    });
  }
});

// Create new user (admin only)
router.post('/users', tempRequireAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user', subscription_plan } = req.body;
    
    console.log('Admin creating new user:', { email, firstName, lastName, role });
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, nome e cognome sono obbligatori'
      });
    }
    
    // Validate role
    const validRoles = ['user', 'premium_user', 'administrator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ruolo non valido'
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await dbPool.execute(
      'SELECT id FROM profiles WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Un utente con questa email esiste già'
      });
    }
    
    // Start transaction
    const connection = await dbPool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate UUID for user
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user profile
      await connection.execute(
        `INSERT INTO profiles (id, email, first_name, last_name, full_name, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, email, firstName, lastName, `${firstName} ${lastName}`, role]
      );
      
      // Create auth record
      await connection.execute(
        'INSERT INTO auth (user_id, password_hash, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [userId, hashedPassword]
      );
      
      // Add subscription if provided
      if (subscription_plan) {
        await connection.execute(
          'INSERT INTO user_subscriptions (id, user_id, plan_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [uuidv4(), userId, subscription_plan, 'active']
        );
      }
      
      await connection.commit();
      
      console.log(`User ${userId} created successfully by admin`);
      
      // Return created user data
      const [newUser] = await dbPool.execute(`
        SELECT 
          p.id,
          p.email,
          p.full_name,
          p.first_name,
          p.last_name,
          p.role,
          p.created_at,
          p.updated_at as last_login
        FROM profiles p
        WHERE p.id = ?
      `, [userId]);
      
      res.status(201).json({
        success: true,
        message: 'Utente creato con successo',
        data: newUser[0]
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione dell\'utente',
      error: error.message
    });
  }
});

export default router;
