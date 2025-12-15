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
