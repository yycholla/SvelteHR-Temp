/**
 * PostgreSQL Native Authentication Service
 *
 * Database operations for JWT authentication, user management,
 * and session handling for SvelteHR system
 */
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import winston from 'winston';
interface LoginCredentials {
    email: string;
    password: string;
    deviceInfo?: any;
}
interface AuthResult {
    success: boolean;
    tokens?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    user?: {
        id: number;
        employee_id: number;
        email: string;
        role: string;
        role_level: number;
        department_id?: number;
    };
    error?: string;
    requiresPasswordChange?: boolean;
}
export declare class AuthService {
    private pool;
    private redis;
    private jwtAuth;
    private sessionManager;
    private logger;
    constructor(pool: Pool, redis: Redis, logger: winston.Logger);
    /**
     * Authenticate user with email and password
     */
    login(credentials: LoginCredentials): Promise<AuthResult>;
    /**
     * Refresh access token using refresh token
     */
    refreshAccessToken(refreshToken: string): Promise<AuthResult>;
    /**
     * Logout user - blacklist tokens and cleanup sessions
     */
    logout(accessToken: string, sessionId?: string, userId?: number): Promise<boolean>;
    /**
     * Change user password
     */
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Reset password (forgot password flow)
     */
    resetPassword(email: string, token: string, newPassword: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get user's active sessions
     */
    getUserSessions(userId: number): Promise<any[]>;
    /**
     * Terminate specific session
     */
    terminateSession(userId: number, sessionId: string): Promise<boolean>;
    /**
     * Terminate all other sessions (except current)
     */
    terminateOtherSessions(userId: number, currentSessionId: string): Promise<number>;
    /**
     * Helper: Parse database authentication result
     */
    private parseAuthResult;
    /**
     * Helper: Generate unique session ID
     */
    private generateSessionId;
    /**
     * Helper: Track failed login attempt (for rate limiting and security)
     */
    private trackFailedLogin;
    /**
     * Helper: Track successful login
     */
    private trackSuccessfulLogin;
    /**
     * Helper: Blacklist all user tokens (for password changes)
     */
    private blacklistAllUserTokens;
    /**
     * Validate user permissions for specific action
     */
    checkPermission(userId: number, action: string, resource: string, resourceOwnerId?: number): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
}
export default AuthService;
