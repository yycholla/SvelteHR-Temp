/**
 * T023: UserSession Entity Model
 *
 * Implements the UserSession entity with comprehensive authentication state management.
 * Integrates with existing auth store and RBAC system for session validation.
 */

import type { UserCredentials } from './data-request';

/**
 * JWT token payload interface
 */
export interface JWTPayload {
	sub: string; // userId
	exp: number; // expiration timestamp
	iat: number; // issued at timestamp
	aud: string; // audience
	iss: string; // issuer
	roles: string[];
	permissions: string[];
	departmentId?: string;
	sessionId: string;
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
	lastLoginAt: string;
	lastActiveAt: string;
	loginCount: number;
	deviceInfo?: {
		userAgent: string;
		platform: string;
		browser: string;
		ipAddress: string;
	};
	location?: {
		country?: string;
		city?: string;
		timezone?: string;
	};
}

/**
 * Session security metadata
 */
export interface SessionSecurity {
	isSecure: boolean;
	requiresMFA: boolean;
	hasElevatedPrivileges: boolean;
	riskScore: number; // 0-100, higher = more risky
	securityEvents: Array<{
		type: 'login' | 'permission_change' | 'suspicious_activity' | 'token_refresh';
		timestamp: string;
		details: Record<string, unknown>;
	}>;
}

/**
 * UserSession entity model implementing comprehensive authentication state management
 */
export class UserSession {
	readonly id: string;
	readonly userId: string;
	readonly jwtToken?: string; // Optional for session-based auth
	readonly refreshToken?: string;
	readonly permissions: string[];
	readonly roles: string[];
	readonly isAuthenticated: boolean;
	readonly expiresAt: string;
	readonly createdAt: string;

	private _lastActivity: string;
	private _activity: SessionActivity;
	private _security: SessionSecurity;
	private _metadata: Record<string, unknown>;

	/**
	 * Creates a new UserSession instance
	 *
	 * @param config - Configuration object for the user session
	 * @throws {Error} When validation rules are violated
	 */
	constructor(config: {
		id?: string;
		userId: string;
		jwtToken?: string; // Optional for session-based auth
		refreshToken?: string;
		permissions: string[];
		roles: string[];
		expiresAt: string;
		activity?: Partial<SessionActivity>;
		security?: Partial<SessionSecurity>;
		metadata?: Record<string, unknown>;
	}) {
		// Validation Rules (as specified in T023)
		this.validateConfig(config);

		// IMPORTANT: Assign userId BEFORE generating session ID
		// generateSessionId() uses this.userId, so it must be set first
		this.userId = config.userId;
		this.jwtToken = config.jwtToken;
		this.refreshToken = config.refreshToken;
		this.permissions = [...config.permissions]; // Defensive copy
		this.roles = [...config.roles]; // Defensive copy
		this.expiresAt = config.expiresAt;
		this.createdAt = new Date().toISOString();

		// Generate session ID after userId is assigned
		this.id = config.id || this.generateSessionId();

		// Determine authentication status
		this.isAuthenticated = this.determineAuthenticationStatus();

		// Initialize activity tracking
		this._lastActivity = new Date().toISOString();
		this._activity = {
			lastLoginAt: this.createdAt,
			lastActiveAt: this._lastActivity,
			loginCount: 1,
			...config.activity
		};

		// Initialize security metadata
		this._security = {
			isSecure: this.isSecureSession(),
			requiresMFA: false,
			hasElevatedPrivileges: this.hasElevatedPermissions(),
			riskScore: this.calculateRiskScore(),
			securityEvents: [
				{
					type: 'login',
					timestamp: this.createdAt,
					details: {
						userId: this.userId,
						roles: this.roles,
						sessionId: this.id
					}
				}
			],
			...config.security
		};

		// Additional metadata
		this._metadata = config.metadata || {};
	}

	/**
	 * Current session activity information
	 */
	get activity(): SessionActivity {
		return { ...this._activity }; // Defensive copy
	}

	/**
	 * Current session security information
	 */
	get security(): SessionSecurity {
		return { ...this._security }; // Defensive copy
	}

	/**
	 * Session metadata
	 */
	get metadata(): Record<string, unknown> {
		return { ...this._metadata }; // Defensive copy
	}

	/**
	 * Last activity timestamp
	 */
	get lastActivity(): string {
		return this._lastActivity;
	}

	/**
	 * Whether the session is currently valid
	 */
	get isValid(): boolean {
		return this.isAuthenticated && !this.isExpired && !this.isInactive;
	}

	/**
	 * Whether the session has expired
	 */
	get isExpired(): boolean {
		const now = Date.now();
		const expiresAt = new Date(this.expiresAt).getTime();
		return now >= expiresAt;
	}

	/**
	 * Whether the session is inactive (no activity for extended period)
	 */
	get isInactive(): boolean {
		const inactivityThresholdMs = 30 * 60 * 1000; // 30 minutes
		const now = Date.now();
		const lastActivityTime = new Date(this._lastActivity).getTime();
		return now - lastActivityTime > inactivityThresholdMs;
	}

	/**
	 * Time until session expires in milliseconds
	 */
	get timeUntilExpiry(): number {
		const now = Date.now();
		const expiresAt = new Date(this.expiresAt).getTime();
		return Math.max(0, expiresAt - now);
	}

	/**
	 * Whether the session needs refresh soon
	 */
	get needsRefresh(): boolean {
		const refreshThresholdMs = 5 * 60 * 1000; // 5 minutes
		return this.timeUntilExpiry <= refreshThresholdMs;
	}

	/**
	 * Whether user has specific permission
	 */
	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission) || this.permissions.includes('*') || this.permissions.includes('*:*');
	}

	/**
	 * Whether user has specific role
	 */
	hasRole(role: string): boolean {
		return this.roles.includes(role);
	}

	/**
	 * Whether user has any of the specified permissions
	 */
	hasAnyPermission(permissions: string[]): boolean {
		return permissions.some((permission) => this.hasPermission(permission));
	}

	/**
	 * Whether user has all of the specified permissions
	 */
	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((permission) => this.hasPermission(permission));
	}

	/**
	 * Update last activity timestamp
	 */
	updateActivity(activityData?: Partial<SessionActivity>): void {
		this._lastActivity = new Date().toISOString();
		this._activity = {
			...this._activity,
			lastActiveAt: this._lastActivity,
			...activityData
		};
	}

	/**
	 * Add security event to session
	 */
	addSecurityEvent(event: {
		type: 'login' | 'permission_change' | 'suspicious_activity' | 'token_refresh';
		details: Record<string, unknown>;
	}): void {
		this._security.securityEvents.push({
			...event,
			timestamp: new Date().toISOString()
		});

		// Recalculate risk score after security events
		this._security.riskScore = this.calculateRiskScore();
	}

	/**
	 * Update session permissions (typically after role changes)
	 */
	updatePermissions(newPermissions: string[], newRoles: string[]): void {
		const oldPermissions = [...this.permissions];
		const oldRoles = [...this.roles];

		// Update permissions and roles
		(this.permissions as string[]).length = 0;
		(this.permissions as string[]).push(...newPermissions);

		(this.roles as string[]).length = 0;
		(this.roles as string[]).push(...newRoles);

		// Update security metadata
		this._security.hasElevatedPrivileges = this.hasElevatedPermissions();

		// Record permission change event
		this.addSecurityEvent({
			type: 'permission_change',
			details: {
				oldPermissions,
				newPermissions,
				oldRoles,
				newRoles
			}
		});
	}

	/**
	 * Refresh session with new token
	 */
	refresh(newToken: string, newExpiresAt: string, newRefreshToken?: string): UserSession {
		const refreshedSession = new UserSession({
			id: this.id, // Keep same session ID
			userId: this.userId,
			jwtToken: newToken,
			refreshToken: newRefreshToken || this.refreshToken,
			permissions: this.permissions,
			roles: this.roles,
			expiresAt: newExpiresAt,
			activity: {
				...this._activity,
				lastActiveAt: new Date().toISOString()
			},
			security: this._security,
			metadata: this._metadata
		});

		// Record token refresh event
		refreshedSession.addSecurityEvent({
			type: 'token_refresh',
			details: {
				previousExpiresAt: this.expiresAt,
				newExpiresAt: newExpiresAt
			}
		});

		return refreshedSession;
	}

	/**
	 * Convert to UserCredentials for DataRequest compatibility
	 */
	toUserCredentials(): UserCredentials {
		return {
			userId: this.userId,
			jwtToken: this.jwtToken || '', // Empty string for session-based auth
			roles: this.roles,
			permissions: this.permissions,
			departmentId: this.extractDepartmentId(),
			isAuthenticated: this.isAuthenticated,
			expiresAt: this.expiresAt
		};
	}

	/**
	 * Convert to safe JSON representation (excludes sensitive data)
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			userId: this.userId,
			roles: this.roles,
			permissions: this.permissions,
			isAuthenticated: this.isAuthenticated,
			isValid: this.isValid,
			isExpired: this.isExpired,
			isInactive: this.isInactive,
			needsRefresh: this.needsRefresh,
			expiresAt: this.expiresAt,
			createdAt: this.createdAt,
			lastActivity: this._lastActivity,
			activity: this._activity,
			security: {
				...this._security,
				securityEvents: this._security.securityEvents.slice(-10) // Only recent events
			},
			timeUntilExpiry: this.timeUntilExpiry
			// Exclude sensitive data like JWT tokens
		};
	}

	/**
	 * Validate configuration according to T023 requirements
	 */
	private validateConfig(config: {
		userId: string;
		jwtToken?: string;
		permissions: string[];
		roles: string[];
		expiresAt: string;
	}): void {
		// Validation Rule: userId (exists when authenticated)
		if (!config.userId || config.userId.trim().length === 0) {
			throw new Error('userId must be non-empty');
		}

		// Validation Rule: jwtToken (optional - only validate if provided)
		if (config.jwtToken && config.jwtToken.trim().length > 0) {
			// Basic JWT format validation (header.payload.signature)
			const jwtParts = config.jwtToken.split('.');
			if (jwtParts.length !== 3) {
				throw new Error('jwtToken must be a valid JWT format');
			}
		}

		// Validation Rule: permissions (non-empty when authenticated)
		if (!Array.isArray(config.permissions)) {
			throw new Error('permissions must be an array');
		}

		// Validation Rule: roles (array)
		if (!Array.isArray(config.roles)) {
			throw new Error('roles must be an array');
		}

		// Validation Rule: expiresAt (future when authenticated)
		const expiresAt = new Date(config.expiresAt);
		if (isNaN(expiresAt.getTime())) {
			throw new Error('expiresAt must be a valid ISO timestamp');
		}

		const now = new Date();
		if (expiresAt <= now) {
			throw new Error('expiresAt must be in the future for authenticated sessions');
		}
	}

	/**
	 * Determine if session should be considered authenticated
	 */
	private determineAuthenticationStatus(): boolean {
		return (
			this.userId.length > 0 &&
			!this.isExpired &&
			this.permissions.length > 0
		);
	}

	/**
	 * Check if this is a secure session
	 */
	private isSecureSession(): boolean {
		// Consider secure if user is authenticated with permissions
		return this.permissions.length > 0 && !this.isExpired;
	}

	/**
	 * Check if user has elevated permissions
	 */
	private hasElevatedPermissions(): boolean {
		const elevatedPermissions = [
			'*', // Global admin
			'admin:*',
			'system:*',
			'users:delete',
			'roles:write',
			'permissions:write',
			'system:configure'
		];

		return elevatedPermissions.some((permission) => this.hasPermission(permission));
	}

	/**
	 * Calculate session risk score based on various factors
	 */
	private calculateRiskScore(): number {
		let riskScore = 0;

		// Elevated permissions increase risk
		if (this.hasElevatedPermissions()) {
			riskScore += 30;
		}

		// Multiple security events increase risk
		const recentEvents =
			this._security?.securityEvents?.filter((event) => {
				const eventTime = new Date(event.timestamp).getTime();
				const hourAgo = Date.now() - 60 * 60 * 1000;
				return eventTime > hourAgo;
			}) || [];

		riskScore += Math.min(recentEvents.length * 10, 40);

		// Long session duration increases risk slightly
		const sessionAge = Date.now() - new Date(this.createdAt).getTime();
		const hoursOld = sessionAge / (60 * 60 * 1000);
		if (hoursOld > 8) {
			riskScore += 15;
		}

		return Math.min(riskScore, 100);
	}

	/**
	 * Extract department ID from JWT payload or metadata
	 */
	private extractDepartmentId(): string | undefined {
		// Try to extract from JWT payload if JWT token exists
		if (this.jwtToken && this.jwtToken.length > 0) {
			try {
				const payloadPart = this.jwtToken.split('.')[1];
				const payload = JSON.parse(atob(payloadPart)) as Partial<JWTPayload>;
				return payload.departmentId;
			} catch {
				// Fallback to metadata
			}
		}
		// Fallback to metadata
		return this._metadata.departmentId as string | undefined;
	}

	/**
	 * Generate secure session identifier
	 */
	private generateSessionId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 12);
		const userHash = this.hashUserId(this.userId);
		return `sess_${timestamp}_${userHash}_${random}`;
	}

	/**
	 * Create a short hash of user ID for session ID
	 */
	private hashUserId(userId: string): string {
		// Handle undefined userId gracefully
		if (!userId) {
			console.warn('UserSession.hashUserId called with undefined userId, using fallback');
			userId = 'anonymous-user';
		}

		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36).substr(0, 6);
	}
}

/**
 * Factory function to create UserSession from authentication result
 */
export function createUserSession(authResult: {
	userId: string;
	jwtToken?: string; // Optional for session-based auth
	refreshToken?: string;
	roles: string[];
	permissions: string[];
	expiresAt: string;
	deviceInfo?: SessionActivity['deviceInfo'];
	metadata?: Record<string, unknown>;
}): UserSession {
	return new UserSession({
		userId: authResult.userId,
		jwtToken: authResult.jwtToken,
		refreshToken: authResult.refreshToken,
		roles: authResult.roles,
		permissions: authResult.permissions,
		expiresAt: authResult.expiresAt,
		activity: {
			lastLoginAt: new Date().toISOString(),
			lastActiveAt: new Date().toISOString(),
			loginCount: 1,
			deviceInfo: authResult.deviceInfo
		},
		metadata: authResult.metadata
	});
}

/**
 * Type guard to check if an object is a valid UserSession
 */
export function isUserSession(obj: unknown): obj is UserSession {
	return obj instanceof UserSession;
}

/**
 * Create anonymous/unauthenticated session
 */
export function createAnonymousSession(): UserSession {
	return new UserSession({
		userId: 'anonymous',
		jwtToken: undefined, // No token for anonymous session
		permissions: [],
		roles: [],
		expiresAt: new Date(Date.now() + 1000).toISOString() // Expire immediately
	});
}
