/**
 * JWT Authentication Middleware for PostGraphile
 *
 * PostgreSQL-native JWT authentication with role switching
 * and comprehensive security features for SvelteHR
 */
import { Redis } from 'ioredis';
import winston from 'winston';
interface JWTPayload {
  user_id: number;
  employee_id?: number;
  role: string;
  role_level: number;
  email: string;
  department_id?: number;
  exp: number;
  iat: number;
}
export interface AuthContext {
  isAuthenticated: boolean;
  user?: JWTPayload;
  pgSettings: Record<string, string>;
}
export declare class JWTAuthMiddleware {
  private logger;
  private redis;
  private jwtSecret;
  private jwtRefreshSecret;
  constructor(redis: Redis, logger: winston.Logger);
  /**
   * Create JWT token for authenticated user
   */
  createToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string;
  /**
   * Create refresh token for token renewal
   */
  createRefreshToken(userId: number): string;
  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JWTPayload | null;
  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): {
    user_id: number;
    type: string;
  } | null;
  /**
   * Blacklist token (for logout/revocation)
   */
  blacklistToken(token: string): Promise<void>;
  /**
   * Check if token is blacklisted
   */
  private isTokenBlacklisted;
  /**
   * Hash token for Redis storage
   */
  private hashToken;
  /**
   * Extract token from request headers
   */
  extractToken(req: any): string | null;
  /**
   * Create PostgreSQL settings for authenticated user
   */
  createPgSettings(payload: JWTPayload): Record<string, string>;
  /**
   * Verify token authentication and create context
   */
  authenticate(req: any): Promise<AuthContext>;
}
/**
 * PostGraphile plugin hook for JWT integration
 */
export declare function createJWTAuthMiddleware(
  redis: Redis,
  logger: winston.Logger
): any;
/**
 * Session validation helper for authentication logging
 */
export declare class SessionManager {
  private redis;
  private logger;
  constructor(redis: Redis, logger: winston.Logger);
  /**
   * Track active sessions for security monitoring
   */
  trackActiveSession(
    userId: number,
    sessionId: string,
    deviceInfo?: any
  ): Promise<void>;
  /**
   * Update session activity timestamp
   */
  updateSessionActivity(userId: number, sessionId: string): Promise<void>;
  /**
   * Get user's active sessions
   */
  getUserActiveSessions(userId: number): Promise<any[]>;
  /**
   * Terminate specific session
   */
  terminateSession(userId: number, sessionId: string): Promise<boolean>;
  /**
   * Terminate all user sessions except current
   */
  terminateOtherSessions(
    userId: number,
    currentSessionId: string
  ): Promise<number>;
}
export default JWTAuthMiddleware;
