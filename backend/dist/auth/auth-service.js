/**
 * PostgreSQL Native Authentication Service
 *
 * Database operations for JWT authentication, user management,
 * and session handling for SvelteHR system
 */
import { JWTAuthMiddleware, SessionManager } from './jwt-middleware';
export class AuthService {
    pool;
    redis;
    jwtAuth;
    sessionManager;
    logger;
    constructor(pool, redis, logger) {
        this.pool = pool;
        this.redis = redis;
        this.logger = logger;
        this.jwtAuth = new JWTAuthMiddleware(redis, logger);
        this.sessionManager = new SessionManager(redis, logger);
    }
    /**
     * Authenticate user with email and password
     */
    async login(credentials) {
        try {
            const { email, password, deviceInfo } = credentials;
            // Call database authentication function
            const query = `
        SELECT 
          hr_public.authenticate_email($1, $2) as auth_result
      `;
            const result = await this.pool.query(query, [email, password]);
            const authResult = result.rows[0]?.auth_result;
            if (!authResult) {
                this.logger.warn('Authentication failed - invalid credentials', {
                    email,
                    ip: deviceInfo?.ip
                });
                // Track failed login attempt
                await this.trackFailedLogin(email, deviceInfo?.ip);
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            // Parse authentication result
            const userData = this.parseAuthResult(authResult);
            if (userData.error) {
                return {
                    success: false,
                    error: userData.error,
                    requiresPasswordChange: userData.requiresPasswordChange
                };
            }
            // Generate JWT tokens
            const jwtPayload = {
                user_id: userData.user_id,
                employee_id: userData.employee_id,
                role: userData.role,
                role_level: userData.role_level,
                email: userData.email,
                department_id: userData.department_id
            };
            const accessToken = this.jwtAuth.createToken(jwtPayload);
            const refreshToken = this.jwtAuth.createRefreshToken(userData.user_id);
            // Track successful login
            const sessionId = this.generateSessionId();
            await this.trackSuccessfulLogin(userData.user_id, sessionId, deviceInfo);
            this.logger.info('User authenticated successfully', {
                user_id: userData.user_id,
                role: userData.role,
                email: userData.email,
                session_id: sessionId
            });
            return {
                success: true,
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: 900 // 15 minutes
                },
                user: {
                    id: userData.user_id,
                    employee_id: userData.employee_id,
                    email: userData.email,
                    role: userData.role,
                    role_level: userData.role_level,
                    department_id: userData.department_id
                },
                requiresPasswordChange: userData.requiresPasswordChange
            };
        }
        catch (error) {
            this.logger.error('Login authentication error', {
                error: error.message,
                email: credentials.email
            });
            return {
                success: false,
                error: 'Authentication service temporarily unavailable'
            };
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const refreshTokenData = this.jwtAuth.verifyRefreshToken(refreshToken);
            if (!refreshTokenData || refreshTokenData.type !== 'refresh') {
                this.logger.warn('Invalid refresh token attempt');
                return {
                    success: false,
                    error: 'Invalid refresh token'
                };
            }
            // Verify user still exists and is active
            const userQuery = `
        SELECT 
          u.id,
          u.employee_id,
          u.email,
          r.name as role,
          r.level as role_level,
          e.department_id,
          u.is_active
        FROM hr_public.users u
        JOIN hr_public.roles r ON u.role_id = r.id
        LEFT JOIN hr_public.employees e ON u.employee_id = e.id
        WHERE u.id = $1 AND u.is_active = true
      `;
            const userResult = await this.pool.query(userQuery, [refreshTokenData.user_id]);
            if (userResult.rows.length === 0) {
                this.logger.warn('Refresh token - user not found or inactive', {
                    user_id: refreshTokenData.user_id
                });
                return {
                    success: false,
                    error: 'User not found or inactive'
                };
            }
            const userData = userResult.rows[0];
            // Generate new access token
            const jwtPayload = {
                user_id: userData.id,
                employee_id: userData.employee_id,
                role: userData.role,
                role_level: userData.role_level,
                email: userData.email,
                department_id: userData.department_id
            };
            const accessToken = this.jwtAuth.createToken(jwtPayload);
            this.logger.debug('Access token refreshed', {
                user_id: userData.id,
                role: userData.role
            });
            return {
                success: true,
                tokens: {
                    accessToken,
                    refreshToken, // Keep same refresh token
                    expiresIn: 900
                },
                user: {
                    id: userData.id,
                    employee_id: userData.employee_id,
                    email: userData.email,
                    role: userData.role,
                    role_level: userData.role_level,
                    department_id: userData.department_id
                }
            };
        }
        catch (error) {
            this.logger.error('Refresh token error', { error: error.message });
            return {
                success: false,
                error: 'Failed to refresh access token'
            };
        }
    }
    /**
     * Logout user - blacklist tokens and cleanup sessions
     */
    async logout(accessToken, sessionId, userId) {
        try {
            // Blacklist the access token
            await this.jwtAuth.blacklistToken(accessToken);
            // Cleanup session if provided
            if (sessionId && userId) {
                await this.sessionManager.terminateSession(userId, sessionId);
            }
            this.logger.info('User logged out successfully', {
                user_id: userId,
                session_id: sessionId
            });
            return true;
        }
        catch (error) {
            this.logger.error('Logout error', { error: error.message, user_id: userId });
            return false;
        }
    }
    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const query = `
        SELECT hr_public.change_password($1, $2, $3) as result
      `;
            const result = await this.pool.query(query, [userId, currentPassword, newPassword]);
            const success = result.rows[0]?.result;
            if (success) {
                this.logger.info('Password changed successfully', { user_id: userId });
                // Blacklist all existing sessions for security
                await this.blacklistAllUserTokens(userId);
                return { success: true };
            }
            else {
                return {
                    success: false,
                    error: 'Current password is incorrect'
                };
            }
        }
        catch (error) {
            this.logger.error('Password change error', {
                user_id: userId,
                error: error.message
            });
            return {
                success: false,
                error: 'Failed to change password'
            };
        }
    }
    /**
     * Reset password (forgot password flow)
     */
    async resetPassword(email, token, newPassword) {
        try {
            const query = `
        SELECT hr_public.reset_password($1, $2, $3) as result
      `;
            const result = await this.pool.query(query, [email, token, newPassword]);
            const success = result.rows[0]?.result;
            if (success) {
                this.logger.info('Password reset successful', { email });
                return { success: true };
            }
            else {
                return {
                    success: false,
                    error: 'Invalid or expired reset token'
                };
            }
        }
        catch (error) {
            this.logger.error('Password reset error', {
                email,
                error: error.message
            });
            return {
                success: false,
                error: 'Failed to reset password'
            };
        }
    }
    /**
     * Get user's active sessions
     */
    async getUserSessions(userId) {
        return await this.sessionManager.getUserActiveSessions(userId);
    }
    /**
     * Terminate specific session
     */
    async terminateSession(userId, sessionId) {
        return await this.sessionManager.terminateSession(userId, sessionId);
    }
    /**
     * Terminate all other sessions (except current)
     */
    async terminateOtherSessions(userId, currentSessionId) {
        return await this.sessionManager.terminateOtherSessions(userId, currentSessionId);
    }
    /**
     * Helper: Parse database authentication result
     */
    parseAuthResult(authResult) {
        // The PostgreSQL authenticate_email function returns JSON with user data
        try {
            // If it's a string, try to parse it as JSON
            if (typeof authResult === 'string') {
                return JSON.parse(authResult);
            }
            // If it's already an object, return it
            return authResult;
        }
        catch (error) {
            this.logger.error('Failed to parse auth result', {
                authResult,
                error: error.message
            });
            return { error: 'Authentication data parsing failed' };
        }
    }
    /**
     * Helper: Generate unique session ID
     */
    generateSessionId() {
        return require('crypto').randomBytes(16).toString('hex');
    }
    /**
     * Helper: Track failed login attempt (for rate limiting and security)
     */
    async trackFailedLogin(email, ip) {
        const key = `login:failed:${email}`;
        const ipKey = `login:failed:ip:${ip || 'unknown'}`;
        // Increment counters with 1-hour TTL
        await this.redis.incr(key);
        await this.redis.expire(key, 3600);
        if (ip) {
            await this.redis.incr(ipKey);
            await this.redis.expire(ipKey, 3600);
        }
    }
    /**
     * Helper: Track successful login
     */
    async trackSuccessfulLogin(userId, sessionId, deviceInfo) {
        // Clear failed login attempts for this user
        const userEmailKey = `login:failed:user:${userId}`;
        await this.redis.del(userEmailKey);
        // Track session
        await this.sessionManager.trackActiveSession(userId, sessionId, deviceInfo);
    }
    /**
     * Helper: Blacklist all user tokens (for password changes)
     */
    async blacklistAllUserTokens(userId) {
        try {
            const sessions = await this.sessionManager.getUserActiveSessions(userId);
            for (const session of sessions) {
                // Terminate all sessions
                await this.sessionManager.terminateSession(userId, session.session_id);
            }
            this.logger.info('All user sessions terminated', { user_id: userId });
        }
        catch (error) {
            this.logger.error('Failed to blacklist user tokens', {
                user_id: userId,
                error: error.message
            });
        }
    }
    /**
     * Validate user permissions for specific action
     */
    async checkPermission(userId, action, resource, resourceOwnerId) {
        try {
            const query = `
        SELECT hr_public.check_permission(
          p_user_id := $1,
          p_action := $2,
          p_resource := $3,
          p_resource_owner_id := $4
        ) as result
      `;
            const result = await this.pool.query(query, [
                userId,
                action,
                resource,
                resourceOwnerId || null
            ]);
            const allowed = result.rows[0]?.result || false;
            return {
                allowed,
                reason: allowed ? undefined : 'Permission denied'
            };
        }
        catch (error) {
            this.logger.error('Permission check error', {
                user_id: userId,
                action,
                resource,
                error: error.message
            });
            return {
                allowed: false,
                reason: 'Permission check failed'
            };
        }
    }
}
export default AuthService;
//# sourceMappingURL=auth-service.js.map