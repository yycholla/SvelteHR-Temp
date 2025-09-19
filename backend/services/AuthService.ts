import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { RedisClient } from '../lib/redis';

/**
 * Authentication Service for HR System
 * Handles user authentication, role management, and session handling
 */

interface UserRole {
  id: string;
  name: string;
  level: number;
  permissions: string[];
}

interface UserAuthData {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  onboardingStatus: string;
  roles: UserRole[];
  defaultRole: string;
  maxRoleLevel: number;
  departmentId?: string;
  managerId?: string;
  displayName: string;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    defaultRole: string;
  };
  error?: string;
  lockedUntil?: Date;
}

export class AuthService {
  private db: Pool;
  private redis: RedisClient;
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
  private readonly SESSION_PREFIX = 'session:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh:';

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
    this.redis = new RedisClient();
  }

  /**
   * Authenticate user with email/password
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const client = await this.db.connect();

    try {
      // Check if account is locked
      const lockCheck = await this.checkAccountLock(credentials.email);
      if (lockCheck.isLocked) {
        return {
          success: false,
          error:
            'Account temporarily locked due to multiple failed login attempts',
          lockedUntil: lockCheck.lockedUntil,
        };
      }

      // Get user data with roles
      const userQuery = `
        SELECT 
          u.id, u.email, u.password_hash, u.display_name,
          u.is_active, u.onboarding_status, u.last_login_at,
          u.failed_login_attempts, u.locked_until,
          ji.department_id, d.manager_id,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ur.id,
                'name', ur.name,
                'level', ur.level,
                'permissions', ur.permissions
              )
            ) FILTER (WHERE ur.id IS NOT NULL),
            '[]'::json
          ) as roles
        FROM users u
        LEFT JOIN job_information ji ON u.id = ji.employee_id
        LEFT JOIN departments d ON ji.department_id = d.id
        LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
        LEFT JOIN user_roles ur ON ura.role_id = ur.id
        WHERE u.email = $1 AND u.is_active = true
        GROUP BY u.id, ji.department_id, d.manager_id
      `;

      const userResult = await client.query(userQuery, [credentials.email]);

      if (userResult.rows.length === 0) {
        await this.recordFailedLogin(credentials.email);
        return { success: false, error: 'Invalid credentials' };
      }

      const userData = userResult.rows[0] as any;

      // Verify password
      const passwordValid = await bcrypt.compare(
        credentials.password,
        userData.password_hash
      );

      if (!passwordValid) {
        await this.recordFailedLogin(credentials.email);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user can login (active, not locked, etc.)
      if (!userData.is_active) {
        return { success: false, error: 'Account deactivated' };
      }

      if (userData.onboarding_status !== 'Active') {
        return { success: false, error: 'Account not fully activated' };
      }

      // Reset failed login attempts
      await this.resetFailedLogins(userData.id);

      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [userData.id]
      );

      // Generate tokens
      const { JWTMiddleware } = await import('../auth/jwt-middleware');
      const accessToken = await JWTMiddleware.generateToken(userData.id);
      const refreshToken = JWTMiddleware.generateRefreshToken(userData.id);

      // Store refresh token in Redis
      await this.redis.setex(
        `${this.REFRESH_TOKEN_PREFIX}${userData.id}`,
        credentials.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
        refreshToken
      );

      // Prepare user roles
      const roles = Array.isArray(userData.roles) ? userData.roles : [];
      const defaultRole = this.getDefaultRole(roles);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: userData.id,
          email: userData.email,
          displayName: userData.display_name,
          roles: roles.map((r: any) => r.name),
          defaultRole,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Authentication service error' };
    } finally {
      client.release();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<Partial<LoginResult>> {
    try {
      const { JWTMiddleware } = await import('../auth/jwt-middleware');
      const userId = JWTMiddleware.verifyRefreshToken(refreshToken);

      if (!userId) {
        return { success: false, error: 'Invalid refresh token' };
      }

      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(
        `${this.REFRESH_TOKEN_PREFIX}${userId}`
      );
      if (storedToken !== refreshToken) {
        return { success: false, error: 'Refresh token not found or expired' };
      }

      // Generate new access token
      const newAccessToken = await JWTMiddleware.generateToken(userId);

      return {
        success: true,
        accessToken: newAccessToken,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string): Promise<{ success: boolean }> {
    try {
      // Remove refresh token from Redis
      await this.redis.del(`${this.REFRESH_TOKEN_PREFIX}${userId}`);

      // Mark user sessions as inactive
      const client = await this.db.connect();
      try {
        await client.query(
          'UPDATE auth_sessions SET is_active = false, revoked_at = NOW() WHERE user_id = $1 AND is_active = true',
          [userId]
        );
      } finally {
        client.release();
      }

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  /**
   * Get user authentication data for JWT generation
   */
  async getUserAuthData(userId: string): Promise<UserAuthData | null> {
    const client = await this.db.connect();

    try {
      const query = `
        SELECT 
          u.id, u.email, u.password_hash, u.display_name,
          u.is_active, u.onboarding_status, u.last_login_at,
          u.failed_login_attempts, u.locked_until,
          ji.department_id, d.manager_id,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ur.id,
                'name', ur.name,
                'level', ur.level,
                'permissions', ur.permissions
              )
            ) FILTER (WHERE ur.id IS NOT NULL),
            '[]'::json
          ) as roles
        FROM users u
        LEFT JOIN job_information ji ON u.id = ji.employee_id
        LEFT JOIN departments d ON ji.department_id = d.id
        LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
        LEFT JOIN user_roles ur ON ura.role_id = ur.id
        WHERE u.id = $1
        GROUP BY u.id, ji.department_id, d.manager_id
      `;

      const result = await client.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const roles = Array.isArray(row.roles) ? row.roles : [];

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        isActive: row.is_active,
        onboardingStatus: row.onboarding_status,
        roles,
        defaultRole: this.getDefaultRole(roles),
        maxRoleLevel: Math.max(...roles.map((r: any) => r.level), 0),
        departmentId: row.department_id,
        managerId: row.manager_id,
        displayName: row.display_name,
        lastLoginAt: row.last_login_at,
        failedLoginAttempts: row.failed_login_attempts,
        lockedUntil: row.locked_until,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check if account is locked due to failed login attempts
   */
  private async checkAccountLock(
    email: string
  ): Promise<{ isLocked: boolean; lockedUntil?: Date }> {
    const client = await this.db.connect();

    try {
      const result = await client.query(
        'SELECT failed_login_attempts, locked_until FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return { isLocked: false };
      }

      const { failed_login_attempts, locked_until } = result.rows[0];

      if (locked_until && new Date(locked_until) > new Date()) {
        return { isLocked: true, lockedUntil: new Date(locked_until) };
      }

      return { isLocked: false };
    } finally {
      client.release();
    }
  }

  /**
   * Record failed login attempt and potentially lock account
   */
  private async recordFailedLogin(email: string): Promise<void> {
    const client = await this.db.connect();

    try {
      const result = await client.query(
        'SELECT id, failed_login_attempts FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) return;

      const { id, failed_login_attempts } = result.rows[0];
      const newAttempts = failed_login_attempts + 1;

      let query = 'UPDATE users SET failed_login_attempts = $1';
      let params = [newAttempts, id];

      if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        query += ", locked_until = NOW() + INTERVAL '15 minutes'";
      }

      query += ' WHERE id = $2';

      await client.query(query, params);
    } finally {
      client.release();
    }
  }

  /**
   * Reset failed login attempts after successful login
   */
  private async resetFailedLogins(userId: string): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get default role based on role hierarchy
   */
  private getDefaultRole(roles: UserRole[]): string {
    if (roles.length === 0) return 'employee';

    // Sort by level descending and return highest level role
    const sortedRoles = roles.sort((a, b) => b.level - a.level);
    return sortedRoles[0].name;
  }

  /**
   * Hash password for storage
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Create new user session record
   */
  async createSession(
    userId: string,
    sessionData: {
      sessionToken: string;
      ipAddress?: string;
      userAgent?: string;
      deviceInfo?: string;
    }
  ): Promise<string> {
    const client = await this.db.connect();

    try {
      const result = await client.query(
        `INSERT INTO auth_sessions (
          user_id, session_token, ip_address, user_agent, device_info, expires_at
        ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '15 minutes') 
        RETURNING id`,
        [
          userId,
          sessionData.sessionToken,
          sessionData.ipAddress,
          sessionData.userAgent,
          sessionData.deviceInfo,
        ]
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }
}
