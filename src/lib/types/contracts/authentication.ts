// =============================================================================
// Authentication Operation Contracts
// =============================================================================

export interface AuthUser {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	isActive: boolean;
	emailVerified: boolean;
	profileImage?: string;
	lastLoginAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthRole {
	id: string;
	name: string;
	displayName: string;
	description: string;
	permissions: string[];
}

export interface AuthTokenInfo {
	expiresAt: string;
	issuedAt: string;
	needsRefresh: boolean;
	refreshToken?: string | null;
}

export interface AuthSessionInfo {
	sessionId: string;
	ipAddress?: string;
	userAgent?: string;
	deviceInfo?: {
		type: string;
		os: string;
		browser: string;
	};
}

export interface AuthData {
	isValid: boolean;
	user: AuthUser | null;
	roles: AuthRole[];
	permissions: string[];
	tokenInfo: AuthTokenInfo;
	sessionInfo: AuthSessionInfo | null;
}

export interface VerifyUserAuthenticationVariables {
	token: string;
	includePermissions?: boolean;
	includeRoles?: boolean;
}

export type VerifyUserAuthenticationRequest = VerifyUserAuthenticationVariables;

export interface VerifyUserAuthenticationResponse {
	success?: boolean;
	data?: any;
	authData: AuthData;
	// Legacy properties for backward compatibility
	currentUser?: AuthenticatedUser;
	authStatus?: AuthStatus;
}

export interface AuthenticatedUser {
	id: string;
	email: string;
	displayName: string;
	role: string;
	permissions: string[];
	isActive: boolean;
	lastLogin?: string;
	profileImage?: string;
	department: {
		id: string;
		name: string;
	};
}

export interface AuthStatus {
	isAuthenticated: boolean;
	tokenExpiry?: string;
	needsRefresh: boolean;
	sessionId: string;
}
