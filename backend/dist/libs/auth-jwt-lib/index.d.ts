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
export interface AuthConfig {
  jwt: {
    secret: string;
    algorithm?: jwt.Algorithm;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  refresh: {
    secret: string;
    expiresIn: string;
    cookieName?: string;
  };
  database: {
    connectionString: string;
    poolConfig?: {
      max?: number;
      idleTimeoutMillis?: number;
      connectionTimeoutMillis?: number;
    };
  };
  redis: {
    connectionString: string;
    keyPrefix?: string;
  };
  security: {
    maxLoginAttempts?: number;
    lockoutDuration?: number;
    sessionTimeout?: number;
    enableAuditLogging?: boolean;
  };
  hasura: {
    defaultRole: string;
    allowedRoles: string[];
    userIdClaim: string;
    roleClaim: string;
  };
}
export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  is_active: boolean;
  onboarding_status: string;
  failed_login_attempts?: number;
  locked_until?: Date;
  last_login?: Date;
  roles?: UserRole[];
}
export interface UserRole {
  id: string;
  name: string;
  level: number;
  permissions: string[];
}
export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: PublicUserInfo;
}
export interface PublicUserInfo {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  permissions: string[];
}
export interface HasuraJWTClaims {
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
    'x-hasura-role-level': string;
    'x-hasura-department-id'?: string;
    'x-hasura-organization-id'?: string;
  };
}
export interface JWTPayload extends HasuraJWTClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  email: string;
  roles: string[];
  permissions: string[];
}
export interface SessionInfo {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  is_active: boolean;
  refresh_token_hash: string;
}
export interface AuthenticationResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
  lockout?: {
    locked_until: Date;
    attempts_remaining: number;
  };
}
export interface ValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expired?: boolean;
}
export declare class AuthJWTLib {
  private pool;
  private redis;
  private config;
  constructor(config: AuthConfig);
  /**
   * Initialize authentication system
   * Create required database tables and indexes
   */
  initialize(): Promise<void>;
  /**
   * Authenticate user with email and password
   */
  authenticate(
    credentials: LoginCredentials,
    clientInfo: {
      ip: string;
      userAgent: string;
    }
  ): Promise<AuthenticationResult>;
  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(
    user: User,
    clientInfo: {
      ip: string;
      userAgent: string;
    }
  ): Promise<AuthTokens>;
  /**
   * Validate JWT token
   */
  validateToken(token: string): Promise<ValidationResult>;
  /**
   * Refresh access token using refresh token
   */
  refreshToken(
    refreshToken: string,
    clientInfo: {
      ip: string;
      userAgent: string;
    }
  ): Promise<AuthTokens | null>;
  /**
   * Revoke token (logout)
   */
  revokeToken(
    token: string,
    clientInfo?: {
      ip: string;
      userAgent: string;
    }
  ): Promise<boolean>;
  /**
   * Get user by email
   */
  private getUserByEmail;
  /**
   * Get user by ID
   */
  private getUserById;
  /**
   * Create session record
   */
  private createSession;
  /**
   * Update session activity
   */
  private updateSession;
  /**
   * Get session by refresh token
   */
  private getSessionByRefreshToken;
  /**
   * Revoke all user sessions
   */
  private revokeUserSessions;
  /**
   * Cache user information in Redis
   */
  private cacheUserInfo;
  /**
   * Check rate limiting for login attempts
   */
  private checkRateLimit;
  /**
   * Record login attempt
   */
  private recordLoginAttempt;
  /**
   * Handle failed login attempt
   */
  private handleFailedLogin;
  /**
   * Reset failed login attempts
   */
  private resetFailedAttempts;
  /**
   * Update last login timestamp
   */
  private updateLastLogin;
  /**
   * Log security events
   */
  private logSecurityEvent;
  /**
   * Parse expiration string to seconds
   */
  private parseExpiration;
  /**
   * Cleanup expired sessions and tokens
   */
  cleanupExpiredSessions(): Promise<void>;
  /**
   * Close connections
   */
  close(): Promise<void>;
}
export { AuthJWTLib as default };
