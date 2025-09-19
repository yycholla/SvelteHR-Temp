import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { JWTMiddleware, AuthenticatedRequest } from '../auth/jwt-middleware';
import { redisClient } from '../lib/redis';

/**
 * Authentication Routes for HR System
 * Handles login, logout, token refresh, and session management
 */

const router = express.Router();
const authService = new AuthService();

// Rate limiting configurations
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and email combination
    const email = req.body?.email || 'unknown';
    return `${req.ip}:${email}`;
  },
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all auth routes
router.use(generalRateLimit);

/**
 * POST /auth/login
 * Authenticate user with email/password
 */
router.post(
  '/login',
  loginRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: errors.array(),
        });
      }

      const { email, password, rememberMe } = req.body;

      // Attempt login
      const result = await authService.login({
        email,
        password,
        rememberMe: rememberMe || false,
      });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error,
          lockedUntil: result.lockedUntil,
        });
      }

      // Create session record
      const sessionId = await authService.createSession(result.user!.id, {
        sessionToken: result.accessToken!.substring(0, 32), // First 32 chars for tracking
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: req.get('X-Device-Info'), // Custom header from client
      });

      // Store session in Redis for quick access
      await redisClient.setUserSession(
        result.user!.id,
        {
          sessionId,
          loginAt: new Date().toISOString(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          roles: result.user!.roles,
          defaultRole: result.user!.defaultRole,
        },
        rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
      ); // 30 days or 1 day

      // Set secure cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
      };

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      // Return success response (without refresh token for security)
      res.json({
        success: true,
        accessToken: result.accessToken,
        user: result.user,
        expiresIn: 900, // 15 minutes
        sessionId,
      });
    } catch (error) {
      console.error('Login route error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication service temporarily unavailable',
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      accessToken: result.accessToken,
      expiresIn: 900, // 15 minutes
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh service temporarily unavailable',
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 */
router.post(
  '/logout',
  JWTMiddleware.validateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.hasura.user_id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid session',
        });
      }

      // Logout from service
      const result = await authService.logout(userId);

      // Clear cookies
      res.clearCookie('refreshToken');

      // Remove session from Redis
      await redisClient.deleteUserSession(userId);

      res.json({
        success: result.success,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout service temporarily unavailable',
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user information
 */
router.get(
  '/me',
  JWTMiddleware.validateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.hasura.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session',
        });
      }

      // Get user data
      const userData = await authService.getUserAuthData(userId);

      if (!userData || !userData.isActive) {
        return res.status(404).json({
          success: false,
          error: 'User not found or inactive',
        });
      }

      // Get session info from Redis
      const sessionData = await redisClient.getUserSession(userId);

      res.json({
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          displayName: userData.displayName,
          roles: userData.roles.map((r) => r.name),
          defaultRole: userData.defaultRole,
          departmentId: userData.departmentId,
          managerId: userData.managerId,
          onboardingStatus: userData.onboardingStatus,
          lastLoginAt: userData.lastLoginAt,
        },
        session: sessionData
          ? {
              loginAt: sessionData.loginAt,
              ipAddress: sessionData.ipAddress,
            }
          : null,
      });
    } catch (error) {
      console.error('Get user info error:', error);
      res.status(500).json({
        success: false,
        error: 'User service temporarily unavailable',
      });
    }
  }
);

/**
 * POST /auth/change-password
 * Change user password (requires current password)
 */
router.post(
  '/change-password',
  JWTMiddleware.validateToken,
  [
    body('currentPassword')
      .isLength({ min: 8 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'New password must contain at least 8 characters with uppercase, lowercase, number, and special character'
      ),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body?.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: errors.array(),
        });
      }

      const userId = req.user?.hasura.user_id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session',
        });
      }

      // Get user data to verify current password
      const userData = await authService.getUserAuthData(userId);
      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const currentPasswordValid = await bcrypt.compare(
        currentPassword,
        userData.passwordHash
      );

      if (!currentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const newPasswordHash = await authService.hashPassword(newPassword);

      // Update password in database
      const { Pool } = require('pg');
      const db = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await db.connect();

      try {
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [newPasswordHash, userId]
        );
      } finally {
        client.release();
        await db.end();
      }

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password change service temporarily unavailable',
      });
    }
  }
);

/**
 * GET /auth/sessions
 * Get user's active sessions
 */
router.get(
  '/sessions',
  JWTMiddleware.validateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.hasura.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session',
        });
      }

      const { Pool } = require('pg');
      const db = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await db.connect();

      try {
        const result = await client.query(
          `SELECT id, session_token, ip_address, user_agent, device_info, 
                created_at, last_accessed_at, expires_at, is_active
         FROM auth_sessions 
         WHERE user_id = $1 AND is_active = true
         ORDER BY last_accessed_at DESC`,
          [userId]
        );

        const sessions = result.rows.map((row) => ({
          id: row.id,
          tokenPreview: row.session_token.substring(0, 8) + '...',
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          deviceInfo: row.device_info,
          createdAt: row.created_at,
          lastAccessedAt: row.last_accessed_at,
          expiresAt: row.expires_at,
          isActive: row.is_active,
        }));

        res.json({
          success: true,
          sessions,
        });
      } finally {
        client.release();
        await db.end();
      }
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Session service temporarily unavailable',
      });
    }
  }
);

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke specific session
 */
router.delete(
  '/sessions/:sessionId',
  JWTMiddleware.validateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.hasura.user_id;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session',
        });
      }

      const { Pool } = require('pg');
      const db = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await db.connect();

      try {
        const result = await client.query(
          'UPDATE auth_sessions SET is_active = false, revoked_at = NOW() WHERE id = $1 AND user_id = $2',
          [sessionId, userId]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({
            success: false,
            error: 'Session not found',
          });
        }

        res.json({
          success: true,
          message: 'Session revoked successfully',
        });
      } finally {
        client.release();
        await db.end();
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        error: 'Session revocation service temporarily unavailable',
      });
    }
  }
);

/**
 * GET /auth/health
 * Health check for authentication service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check Redis connection
    const redisStatus = redisClient.getConnectionStatus();
    const redisPing = await redisClient.ping();

    // Check database connection
    const { Pool } = require('pg');
    const db = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await db.connect();
    let dbStatus = false;

    try {
      await client.query('SELECT 1');
      dbStatus = true;
    } finally {
      client.release();
      await db.end();
    }

    const health = {
      status: redisStatus && dbStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: redisStatus ? 'connected' : 'disconnected',
          ping: redisPing,
        },
        database: {
          status: dbStatus ? 'connected' : 'disconnected',
        },
      },
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
