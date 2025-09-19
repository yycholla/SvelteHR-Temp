/**
 * Authentication JWT Library
 *
 * Provides secure JWT token generation, validation, and session management
 * specifically designed for Hasura GraphQL integration with role-based access control.
 *
 * Features:
 * - JWT token generation with Hasura claims
 * - Token validation and verification
 * - Session management and tracking
 * - Role-based access control
 * - Token refresh mechanisms
 * - Security audit logging
 * - Rate limiting and brute force protection
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Pool } from 'pg';
import Redis from 'ioredis';
export class AuthJWTLib {
  pool;
  redis;
  config;
  constructor(config) {
    this.config = config;
    this.pool = new Pool({
      connectionString: config.database.connectionString,
      max: config.database.poolConfig?.max || 20,
      idleTimeoutMillis: config.database.poolConfig?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis:
        config.database.poolConfig?.connectionTimeoutMillis || 2000,
    });
    this.redis = new Redis(config.redis.connectionString, {
      keyPrefix: config.redis.keyPrefix || 'auth:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }
  /**
   * Initialize authentication system
   * Create required database tables and indexes
   */
  async initialize() {
    const client = await this.pool.connect();
    try {
      // Create auth sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          ip_address INET NOT NULL,
          user_agent TEXT NOT NULL,
          refresh_token_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          revoked_at TIMESTAMPTZ,
          revoked_reason VARCHAR(100)
        );

        CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active, expires_at);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(refresh_token_hash);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
      `);
      // Create login attempts tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          ip_address INET NOT NULL,
          success BOOLEAN NOT NULL,
          attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          error_code VARCHAR(50),
          user_agent TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, attempted_at);
      `);
      // Create password reset tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
      `);
      // Create audit log table for security events
      await client.query(`
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id SERIAL PRIMARY KEY,
          user_id UUID,
          event_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          ip_address INET,
          user_agent TEXT,
          success BOOLEAN NOT NULL,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type, created_at);
        CREATE INDEX IF NOT EXISTS idx_security_audit_success ON security_audit_log(success, created_at);
      `);
      console.log('Authentication system initialized successfully');
    } finally {
      client.release();
    }
  }
  /**
   * Authenticate user with email and password
   */
  async authenticate(credentials, clientInfo) {
    const { email, password } = credentials;
    const startTime = Date.now();
    try {
      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(email, clientInfo.ip);
      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent({
          event_type: 'RATE_LIMITED_LOGIN',
          description: `Login attempt rate limited for ${email}`,
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          success: false,
        });
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          lockout: {
            locked_until: rateLimitResult.lockout_until,
            attempts_remaining: 0,
          },
        };
      }
      // Get user from database
      const user = await this.getUserByEmail(email);
      if (!user) {
        await this.recordLoginAttempt(
          email,
          clientInfo.ip,
          false,
          'USER_NOT_FOUND',
          clientInfo.userAgent
        );
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }
      // Check if user is locked out
      if (user.locked_until && user.locked_until > new Date()) {
        await this.logSecurityEvent({
          user_id: user.id,
          event_type: 'LOCKED_ACCOUNT_ACCESS',
          description: `Login attempt on locked account: ${email}`,
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          success: false,
        });
        return {
          success: false,
          error: 'Account is temporarily locked',
          lockout: {
            locked_until: user.locked_until,
            attempts_remaining: 0,
          },
        };
      }
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        await this.recordLoginAttempt(
          email,
          clientInfo.ip,
          false,
          'INVALID_PASSWORD',
          clientInfo.userAgent
        );
        await this.handleFailedLogin(user.id);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }
      // Check if user is active
      if (!user.is_active) {
        await this.recordLoginAttempt(
          email,
          clientInfo.ip,
          false,
          'INACTIVE_USER',
          clientInfo.userAgent
        );
        return {
          success: false,
          error: 'Account is disabled',
        };
      }
      // Generate tokens
      const tokens = await this.generateTokens(user, clientInfo);
      // Record successful login
      await this.recordLoginAttempt(
        email,
        clientInfo.ip,
        true,
        null,
        clientInfo.userAgent
      );
      await this.resetFailedAttempts(user.id);
      await this.updateLastLogin(user.id);
      // Log successful authentication
      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'SUCCESSFUL_LOGIN',
        description: `User ${email} successfully authenticated`,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: true,
        metadata: {
          login_duration_ms: Date.now() - startTime,
          has_refresh_token: credentials.remember || false,
        },
      });
      return {
        success: true,
        tokens,
      };
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'AUTH_ERROR',
        description: `Authentication error for ${email}: ${error.message}`,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: false,
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(user, clientInfo) {
    // Get user roles and permissions
    const roles = user.roles || [];
    const permissions = roles.flatMap((role) => role.permissions);
    const allowedRoles = roles.map((role) => role.name);
    const defaultRole = allowedRoles.includes(this.config.hasura.defaultRole)
      ? this.config.hasura.defaultRole
      : allowedRoles[0] || 'employee';
    // Generate JWT ID
    const jti = crypto.randomBytes(16).toString('hex');
    // Create JWT payload with Hasura claims
    const now = Math.floor(Date.now() / 1000);
    const accessTokenPayload = {
      sub: user.id,
      iss: this.config.jwt.issuer,
      aud: this.config.jwt.audience,
      exp: now + this.parseExpiration(this.config.jwt.expiresIn),
      iat: now,
      jti,
      email: user.email,
      roles: allowedRoles,
      permissions,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': allowedRoles,
        'x-hasura-default-role': defaultRole,
        'x-hasura-user-id': user.id,
        'x-hasura-role-level': Math.max(
          ...roles.map((r) => r.level),
          0
        ).toString(),
      },
    };
    // Add department/organization claims if available
    // This would be populated from user's job information
    // accessTokenPayload['https://hasura.io/jwt/claims']['x-hasura-department-id'] = user.department_id;
    // Sign access token
    const access_token = jwt.sign(accessTokenPayload, this.config.jwt.secret, {
      algorithm: this.config.jwt.algorithm || 'HS256',
    });
    // Generate refresh token
    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      jti: crypto.randomBytes(32).toString('hex'),
      iat: now,
      exp: now + this.parseExpiration(this.config.refresh.expiresIn),
    };
    const refresh_token = jwt.sign(
      refreshTokenPayload,
      this.config.refresh.secret,
      {
        algorithm: this.config.jwt.algorithm || 'HS256',
      }
    );
    // Store session in database
    const sessionId = await this.createSession(
      user.id,
      refresh_token,
      clientInfo
    );
    // Cache user info in Redis for quick access
    await this.cacheUserInfo(user.id, {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      roles: allowedRoles,
      permissions,
    });
    return {
      access_token,
      refresh_token,
      expires_in: this.parseExpiration(this.config.jwt.expiresIn),
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        roles: allowedRoles,
        permissions,
      },
    };
  }
  /**
   * Validate JWT token
   */
  async validateToken(token) {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret, {
        algorithms: [this.config.jwt.algorithm || 'HS256'],
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      });
      // Check if token is revoked (blacklisted)
      const isRevoked = await this.redis.get(`revoked:${payload.jti}`);
      if (isRevoked) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }
      // Verify user still exists and is active
      const user = await this.getUserById(payload.sub);
      if (!user || !user.is_active) {
        return {
          valid: false,
          error: 'User not found or inactive',
        };
      }
      return {
        valid: true,
        payload,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token has expired',
          expired: true,
        };
      }
      return {
        valid: false,
        error: `Token validation failed: ${error.message}`,
      };
    }
  }
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken, clientInfo) {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.config.refresh.secret);
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      // Get session from database
      const session = await this.getSessionByRefreshToken(refreshToken);
      if (!session || !session.is_active || session.expires_at < new Date()) {
        await this.logSecurityEvent({
          user_id: payload.sub,
          event_type: 'INVALID_REFRESH_TOKEN',
          description: 'Attempt to use invalid or expired refresh token',
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          success: false,
        });
        return null;
      }
      // Get user
      const user = await this.getUserById(payload.sub);
      if (!user || !user.is_active) {
        return null;
      }
      // Generate new tokens
      const tokens = await this.generateTokens(user, clientInfo);
      // Update session with new refresh token
      await this.updateSession(session.id, tokens.refresh_token, clientInfo);
      // Log token refresh
      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'TOKEN_REFRESHED',
        description: 'Access token refreshed successfully',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: true,
      });
      return tokens;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'REFRESH_TOKEN_ERROR',
        description: `Token refresh failed: ${error.message}`,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: false,
      });
      return null;
    }
  }
  /**
   * Revoke token (logout)
   */
  async revokeToken(token, clientInfo) {
    try {
      const payload = jwt.decode(token);
      if (!payload || !payload.jti) {
        return false;
      }
      // Add token to blacklist in Redis
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await this.redis.setex(`revoked:${payload.jti}`, expiresIn, '1');
      }
      // Revoke all sessions for this user
      await this.revokeUserSessions(payload.sub, 'LOGOUT');
      // Clear cached user info
      await this.redis.del(`user:${payload.sub}`);
      // Log logout
      if (clientInfo) {
        await this.logSecurityEvent({
          user_id: payload.sub,
          event_type: 'LOGOUT',
          description: 'User logged out successfully',
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          success: true,
        });
      }
      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }
  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    const client = await this.pool.connect();
    try {
      const userResult = await client.query(
        `
        SELECT u.id, u.email, u.password_hash, u.display_name, u.is_active,
               u.onboarding_status, u.failed_login_attempts, u.locked_until, u.last_login
        FROM users u
        WHERE u.email = $1
      `,
        [email]
      );
      if (userResult.rows.length === 0) {
        return null;
      }
      const user = userResult.rows[0];
      // Get user roles
      const rolesResult = await client.query(
        `
        SELECT ur.id, ur.name, ur.level, ur.permissions
        FROM user_roles ur
        JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ura.user_id = $1 AND ura.is_active = true
      `,
        [user.id]
      );
      user.roles = rolesResult.rows;
      return user;
    } finally {
      client.release();
    }
  }
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    // Check cache first
    const cached = await this.redis.get(`user:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    const client = await this.pool.connect();
    try {
      const userResult = await client.query(
        `
        SELECT u.id, u.email, u.display_name, u.is_active, u.onboarding_status
        FROM users u
        WHERE u.id = $1
      `,
        [userId]
      );
      if (userResult.rows.length === 0) {
        return null;
      }
      const user = userResult.rows[0];
      // Get user roles
      const rolesResult = await client.query(
        `
        SELECT ur.id, ur.name, ur.level, ur.permissions
        FROM user_roles ur
        JOIN user_role_assignments ura ON ur.id = ura.role_id
        WHERE ura.user_id = $1 AND ura.is_active = true
      `,
        [userId]
      );
      user.roles = rolesResult.rows;
      // Cache for 5 minutes
      await this.redis.setex(`user:${userId}`, 300, JSON.stringify(user));
      return user;
    } finally {
      client.release();
    }
  }
  // Additional helper methods continue in the next part...
  /**
   * Create session record
   */
  async createSession(userId, refreshToken, clientInfo) {
    const client = await this.pool.connect();
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const expiresAt = new Date(
      Date.now() + this.parseExpiration(this.config.refresh.expiresIn) * 1000
    );
    try {
      const result = await client.query(
        `
        INSERT INTO auth_sessions (user_id, ip_address, user_agent, refresh_token_hash, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
        [
          userId,
          clientInfo.ip,
          clientInfo.userAgent,
          refreshTokenHash,
          expiresAt,
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }
  /**
   * Update session activity
   */
  async updateSession(sessionId, newRefreshToken, clientInfo) {
    const client = await this.pool.connect();
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    try {
      await client.query(
        `
        UPDATE auth_sessions
        SET refresh_token_hash = $1, last_activity_at = NOW(), ip_address = $2
        WHERE id = $3
      `,
        [refreshTokenHash, clientInfo.ip, sessionId]
      );
    } finally {
      client.release();
    }
  }
  /**
   * Get session by refresh token
   */
  async getSessionByRefreshToken(refreshToken) {
    const client = await this.pool.connect();
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    try {
      const result = await client.query(
        `
        SELECT id, user_id, ip_address, user_agent, created_at, last_activity_at,
               expires_at, is_active, refresh_token_hash
        FROM auth_sessions
        WHERE refresh_token_hash = $1 AND is_active = true
      `,
        [refreshTokenHash]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
  /**
   * Revoke all user sessions
   */
  async revokeUserSessions(userId, reason) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE auth_sessions
        SET is_active = false, revoked_at = NOW(), revoked_reason = $1
        WHERE user_id = $2 AND is_active = true
      `,
        [reason, userId]
      );
    } finally {
      client.release();
    }
  }
  /**
   * Cache user information in Redis
   */
  async cacheUserInfo(userId, userInfo) {
    await this.redis.setex(`user:${userId}`, 300, JSON.stringify(userInfo)); // 5 minute cache
  }
  /**
   * Check rate limiting for login attempts
   */
  async checkRateLimit(email, ip) {
    const maxAttempts = this.config.security.maxLoginAttempts || 5;
    const lockoutDuration = this.config.security.lockoutDuration || 900; // 15 minutes
    const emailKey = `rate_limit:email:${email}`;
    const ipKey = `rate_limit:ip:${ip}`;
    const [emailAttempts, ipAttempts] = await Promise.all([
      this.redis.get(emailKey),
      this.redis.get(ipKey),
    ]);
    const emailCount = parseInt(emailAttempts || '0');
    const ipCount = parseInt(ipAttempts || '0');
    if (emailCount >= maxAttempts || ipCount >= maxAttempts * 2) {
      return {
        allowed: false,
        attempts: Math.max(emailCount, ipCount),
        lockout_until: new Date(Date.now() + lockoutDuration * 1000),
      };
    }
    return {
      allowed: true,
      attempts: Math.max(emailCount, ipCount),
    };
  }
  /**
   * Record login attempt
   */
  async recordLoginAttempt(email, ip, success, errorCode, userAgent) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO login_attempts (email, ip_address, success, error_code, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [email, ip, success, errorCode, userAgent]
      );
      if (!success) {
        // Increment rate limit counters
        const emailKey = `rate_limit:email:${email}`;
        const ipKey = `rate_limit:ip:${ip}`;
        await Promise.all([
          this.redis.incr(emailKey),
          this.redis.incr(ipKey),
          this.redis.expire(emailKey, 900), // 15 minutes
          this.redis.expire(ipKey, 900),
        ]);
      }
    } finally {
      client.release();
    }
  }
  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId) {
    const client = await this.pool.connect();
    const maxAttempts = this.config.security.maxLoginAttempts || 5;
    const lockoutDuration = this.config.security.lockoutDuration || 900; // 15 minutes
    try {
      const result = await client.query(
        `
        UPDATE users
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
            locked_until = CASE 
              WHEN COALESCE(failed_login_attempts, 0) + 1 >= $1 
              THEN NOW() + INTERVAL '${lockoutDuration} seconds'
              ELSE locked_until
            END
        WHERE id = $2
        RETURNING failed_login_attempts, locked_until
      `,
        [maxAttempts, userId]
      );
      if (result.rows[0]?.failed_login_attempts >= maxAttempts) {
        await this.logSecurityEvent({
          user_id: userId,
          event_type: 'ACCOUNT_LOCKED',
          description: `Account locked due to ${maxAttempts} failed login attempts`,
          success: false,
        });
      }
    } finally {
      client.release();
    }
  }
  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(userId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = $1
      `,
        [userId]
      );
    } finally {
      client.release();
    }
  }
  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE users
        SET last_login = NOW()
        WHERE id = $1
      `,
        [userId]
      );
    } finally {
      client.release();
    }
  }
  /**
   * Log security events
   */
  async logSecurityEvent(event) {
    if (!this.config.security.enableAuditLogging) {
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO security_audit_log 
        (user_id, event_type, description, ip_address, user_agent, success, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          event.user_id || null,
          event.event_type,
          event.description,
          event.ip_address || null,
          event.user_agent || null,
          event.success,
          event.metadata ? JSON.stringify(event.metadata) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    } finally {
      client.release();
    }
  }
  /**
   * Parse expiration string to seconds
   */
  parseExpiration(expiration) {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }
    const [, amount, unit] = match;
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(amount) * multipliers[unit];
  }
  /**
   * Cleanup expired sessions and tokens
   */
  async cleanupExpiredSessions() {
    const client = await this.pool.connect();
    try {
      // Mark expired sessions as inactive
      const result = await client.query(`
        UPDATE auth_sessions
        SET is_active = false, revoked_at = NOW(), revoked_reason = 'EXPIRED'
        WHERE expires_at < NOW() AND is_active = true
      `);
      if (result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} expired sessions`);
      }
      // Clean up old login attempts (older than 24 hours)
      await client.query(`
        DELETE FROM login_attempts
        WHERE attempted_at < NOW() - INTERVAL '24 hours'
      `);
      // Clean up used password reset tokens (older than 24 hours)
      await client.query(`
        DELETE FROM password_reset_tokens
        WHERE (used_at IS NOT NULL OR expires_at < NOW()) 
        AND created_at < NOW() - INTERVAL '24 hours'
      `);
    } finally {
      client.release();
    }
  }
  /**
   * Close connections
   */
  async close() {
    await this.pool.end();
    await this.redis.quit();
  }
}
export { AuthJWTLib as default };
//# sourceMappingURL=index.js.map
