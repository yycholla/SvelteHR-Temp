/**
 * SessionPort - Interface for session management
 *
 * This port abstracts session management from specific implementations
 * (e.g., SvelteKit cookies, Redis, JWT). This enables dependency injection
 * and makes AuthService testable without framework coupling.
 */

export interface SessionData {
	userId: string;
	sessionId: string;
	email?: string;
	roles?: string[];
	createdAt: string;
}

export interface SessionPort {
	/**
	 * Retrieves the current session data
	 * @returns Session data if exists, null otherwise
	 */
	getSession(): Promise<SessionData | null>;

	/**
	 * Creates a new session with the provided data
	 * @param data - Session data (sessionId and createdAt will be generated)
	 * @returns Complete session data including generated fields
	 */
	createSession(data: Omit<SessionData, 'sessionId' | 'createdAt'>): Promise<SessionData>;

	/**
	 * Updates an existing session
	 * @param sessionId - The session identifier
	 * @param data - Partial session data to update
	 */
	updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;

	/**
	 * Destroys a session
	 * @param sessionId - The session identifier to destroy
	 */
	destroySession(sessionId: string): Promise<void>;
}
