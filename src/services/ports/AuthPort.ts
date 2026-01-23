/**
 * Port (interface) for authentication operations.
 */
export interface AuthPort {
	/**
	 * Get current user session
	 * @returns User session or null if not authenticated
	 */
	getSession(): Promise<UserSession | null>;

	/**
	 * Authenticate with credentials
	 * @param email - User email
	 * @param password - User password
	 * @returns User session
	 */
	login(email: string, password: string): Promise<UserSession>;

	/**
	 * End current session
	 */
	logout(): Promise<void>;

	/**
	 * Check if user has permission
	 * @param permission - Permission string to check
	 * @returns True if user has permission
	 */
	hasPermission(permission: string): boolean;
}

export interface UserSession {
	userId: string;
	email: string;
	role: string;
	permissions: string[];
}
