/**
 * JWT Authentication Middleware for PostGraphile
 *
 * PostgreSQL-native JWT authentication with role switching
 * and comprehensive security features for SvelteHR
 */
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
// Environment configuration
const JWT_SECRET =
  process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || '900', 10); // 15 minutes
const JWT_REFRESH_EXPIRY = parseInt(
  process.env.JWT_REFRESH_EXPIRY || '2592000',
  10
); // 30 days
const BLACKLIST_PREFIX = 'jwt:blacklist:';
export class JWTAuthMiddleware {
  logger;
  redis;
  jwtSecret;
  jwtRefreshSecret;
  constructor(redis, logger) {
    this.redis = redis;
    this.logger = logger;
    this.jwtSecret = JWT_SECRET;
    this.jwtRefreshSecret = JWT_REFRESH_SECRET;
  }
  /**
   * Create JWT token for authenticated user
   */
  createToken(payload) {
    const now = Date.now();
    const tokenPayload = {
      ...payload,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + JWT_EXPIRY * 1000) / 1000),
    };
    return jwt.sign(tokenPayload, this.jwtSecret, { algorithm: 'HS256' });
  }
  /**
   * Create refresh token for token renewal
   */
  createRefreshToken(userId) {
    return jwt.sign(
      { user_id: userId, type: 'refresh' },
      this.jwtRefreshSecret,
      { algorithm: 'HS256', expiresIn: `${JWT_REFRESH_EXPIRY}s` }
    );
  }
  /**
   * Verify JWT token and return payload
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      // Check if token is blacklisted
      return this.isTokenBlacklisted(token).then((isBlacklisted) => {
        if (isBlacklisted) {
          this.logger.warn('Attempt to use blacklisted token', {
            user_id: decoded.user_id,
            token_hash: this.hashToken(token),
          });
          return null;
        }
        return decoded;
      });
    } catch (error) {
      this.logger.debug('JWT verification failed', {
        error: error.message,
        token_hash: token ? this.hashToken(token) : 'none',
      });
      return Promise.resolve(null);
    }
  }
  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.jwtRefreshSecret);
    } catch (error) {
      this.logger.debug('Refresh token verification failed', {
        error: error.message,
      });
      return null;
    }
  }
  /**
   * Blacklist token (for logout/revocation)
   */
  async blacklistToken(token) {
    try {
      const payload = jwt.decode(token);
      if (!payload || !payload.exp) return;
      const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
      if (ttl <= 0) return; // Token already expired
      const tokenHash = this.hashToken(token);
      await this.redis.setex(`${BLACKLIST_PREFIX}${tokenHash}`, ttl, '1');
      this.logger.info('Token blacklisted', {
        user_id: payload.user_id,
        token_hash: tokenHash,
        ttl_remaining: ttl,
      });
    } catch (error) {
      this.logger.error('Failed to blacklist token', { error: error.message });
    }
  }
  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      const tokenHash = this.hashToken(token);
      const result = await this.redis.exists(`${BLACKLIST_PREFIX}${tokenHash}`);
      return result === 1;
    } catch (error) {
      this.logger.warn('Failed to check token blacklist', {
        error: error.message,
      });
      return false;
    }
  }
  /**
   * Hash token for Redis storage
   */
  hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
  }
  /**
   * Extract token from request headers
   */
  extractToken(req) {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Check for token in cookies
    if (req.cookies && req.cookies.jwt_token) {
      return req.cookies.jwt_token;
    }
    return null;
  }
  /**
   * Create PostgreSQL settings for authenticated user
   */
  createPgSettings(payload) {
    return {
      role: payload.role,
      'jwt.claims.user_id': payload.user_id.toString(),
      'jwt.claims.employee_id': payload.employee_id?.toString() || '',
      'jwt.claims.role': payload.role,
      'jwt.claims.role_level': payload.role_level.toString(),
      'jwt.claims.department_id': payload.department_id?.toString() || '',
      'jwt.claims.email': payload.email,
      'jwt.claims.exp': payload.exp.toString(),
    };
  }
  /**
   * Verify token authentication and create context
   */
  async authenticate(req) {
    const token = this.extractToken(req);
    if (!token) {
      return {
        isAuthenticated: false,
        pgSettings: {
          role: 'hr_guest',
          'jwt.claims.role': 'hr_guest',
          'jwt.claims.role_level': '0',
        },
      };
    }
    const payload = await this.verifyToken(token);
    if (!payload) {
      return {
        isAuthenticated: false,
        pgSettings: {
          role: 'hr_guest',
          'jwt.claims.role': 'hr_guest',
          'jwt.claims.role_level': '0',
        },
      };
    }
    // Log successful authentication
    this.logger.debug('JWT authentication successful', {
      user_id: payload.user_id,
      role: payload.role,
      role_level: payload.role_level,
      email: payload.email,
    });
    return {
      isAuthenticated: true,
      user: payload,
      pgSettings: this.createPgSettings(payload),
    };
  }
}
/**
 * PostGraphile plugin hook for JWT integration
 */
export function createJWTAuthMiddleware(redis, logger) {
  const jwtAuth = new JWTAuthMiddleware(redis, logger);
  return (build) => {
    build.hook('postgraphile:http:handler', async (req, { pgSettings }) => {
      const authContext = await jwtAuth.authenticate(req);
      // Apply PostgreSQL settings
      Object.assign(pgSettings, authContext.pgSettings);
      // Add auth context to request for GraphQL resolvers
      req.authContext = authContext;
      return req;
    });
    // Add custom GraphQL context
    build.hook('build', (build) => {
      build.graphqlContext = build.graphqlContext || {};
      build.graphqlContext.getAuthContext = () => {
        return (req) => req.authContext;
      };
      return build;
    });
    return build;
  };
}
/**
 * Session validation helper for authentication logging
 */
export class SessionManager {
  redis;
  logger;
  constructor(redis, logger) {
    this.redis = redis;
    this.logger = logger;
  }
  /**
   * Track active sessions for security monitoring
   */
  async trackActiveSession(userId, sessionId, deviceInfo) {
    const sessionKey = `session:active:${userId}:${sessionId}`;
    const sessionData = {
      user_id: userId,
      session_id: sessionId,
      created_at: Date.now(),
      last_activity: Date.now(),
      device_info: deviceInfo || {},
    };
    await this.redis.setex(
      sessionKey,
      JWT_REFRESH_EXPIRY,
      JSON.stringify(sessionData)
    );
    // Add to user's active sessions set
    await this.redis.sadd(`user:sessions:${userId}`, sessionId);
  }
  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(userId, sessionId) {
    const sessionKey = `session:active:${userId}:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.last_activity = Date.now();
      await this.redis.setex(
        sessionKey,
        JWT_REFRESH_EXPIRY,
        JSON.stringify(session)
      );
    }
  }
  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId) {
    const sessionIds = await this.redis.smembers(`user:sessions:${userId}`);
    const sessions = [];
    for (const sessionId of sessionIds) {
      const sessionKey = `session:active:${userId}:${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      }
    }
    return sessions.sort((a, b) => b.last_activity - a.last_activity);
  }
  /**
   * Terminate specific session
   */
  async terminateSession(userId, sessionId) {
    const sessionKey = `session:active:${userId}:${sessionId}`;
    try {
      await this.redis.del(sessionKey);
      await this.redis.srem(`user:sessions:${userId}`, sessionId);
      this.logger.info('Session terminated', {
        user_id: userId,
        session_id: sessionId,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to terminate session', {
        user_id: userId,
        session_id: sessionId,
        error: error.message,
      });
      return false;
    }
  }
  /**
   * Terminate all user sessions except current
   */
  async terminateOtherSessions(userId, currentSessionId) {
    const sessions = await this.getUserActiveSessions(userId);
    let terminatedCount = 0;
    for (const session of sessions) {
      if (session.session_id !== currentSessionId) {
        if (await this.terminateSession(userId, session.session_id)) {
          terminatedCount++;
        }
      }
    }
    return terminatedCount;
  }
}
export default JWTAuthMiddleware;
//# sourceMappingURL=jwt-middleware.js.map
