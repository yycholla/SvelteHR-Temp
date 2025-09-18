import { z } from 'zod';

/**
 * T029: AuthenticationSession entity implementation
 *
 * Implements the AuthenticationSession entity as defined in specs/006-now-we-have/data-model.md
 * This implementation will make the validation tests pass (T018 in auth-session.test.ts)
 */

// Validation schemas
const UUIDSchema = z.string().uuid('Must be valid UUID');
const UserRoleSchema = z.enum(['admin', 'hr_admin', 'manager', 'employee', 'guest']);

// JWT token validation - basic format check
const JWTTokenSchema = z.string().regex(
  /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
  'Must be valid JWT format (header.payload.signature)'
);

const CookieSchema = z.object({
  name: z.string().min(1, 'Cookie name cannot be empty'),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.date().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional()
});

const AuthenticationSessionSchema = z.object({
  id: UUIDSchema,
  userId: z.string().email('Must be valid email address'),
  userRole: UserRoleSchema,
  jwtToken: JWTTokenSchema.optional(),
  tokenExpiry: z.date().optional(),
  sessionStorage: z.record(z.string()).optional(),
  localStorage: z.record(z.string()).optional(),
  cookies: z.array(CookieSchema).optional(),
  isActive: z.boolean(),
  loginTime: z.date(),
  lastActivity: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionMetadata: z.record(z.any()).optional()
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type Cookie = z.infer<typeof CookieSchema>;
export type AuthenticationSessionData = z.infer<typeof AuthenticationSessionSchema>;

export class AuthenticationSession {
  private data: AuthenticationSessionData;

  constructor(input: Partial<AuthenticationSessionData> & {
    id: string;
    userId: string;
    userRole: UserRole;
    isActive: boolean;
    loginTime: Date;
    lastActivity: Date;
  }) {
    // Validate login time vs last activity
    if (input.loginTime > input.lastActivity) {
      throw new Error('loginTime must be before lastActivity');
    }

    // Validate JWT token format if present
    if (input.jwtToken && !JWTTokenSchema.safeParse(input.jwtToken).success) {
      throw new Error('jwtToken must be valid JWT format when present');
    }

    // Validate token expiry is future timestamp when token is active
    if (input.jwtToken && input.tokenExpiry && input.isActive) {
      if (input.tokenExpiry <= new Date()) {
        throw new Error('tokenExpiry must be future timestamp when token is active');
      }
    }

    // Validate with Zod schema
    const validation = AuthenticationSessionSchema.safeParse(input);
    if (!validation.success) {
      throw new Error(`AuthenticationSession validation failed: ${validation.error.message}`);
    }

    this.data = validation.data;
  }

  // Getters for accessing properties
  get id(): string { return this.data.id; }
  get userId(): string { return this.data.userId; }
  get userRole(): UserRole { return this.data.userRole; }
  get jwtToken(): string | undefined { return this.data.jwtToken; }
  get tokenExpiry(): Date | undefined { return this.data.tokenExpiry; }
  get sessionStorage(): Record<string, string> | undefined { return this.data.sessionStorage; }
  get localStorage(): Record<string, string> | undefined { return this.data.localStorage; }
  get cookies(): Cookie[] | undefined { return this.data.cookies; }
  get isActive(): boolean { return this.data.isActive; }
  get loginTime(): Date { return this.data.loginTime; }
  get lastActivity(): Date { return this.data.lastActivity; }
  get ipAddress(): string | undefined { return this.data.ipAddress; }
  get userAgent(): string | undefined { return this.data.userAgent; }
  get sessionMetadata(): Record<string, any> | undefined { return this.data.sessionMetadata; }

  /**
   * Check if session is expired based on token expiry or activity timeout
   */
  isExpired(): boolean {
    const now = new Date();

    // Check token expiry if present
    if (this.data.tokenExpiry && now > this.data.tokenExpiry) {
      return true;
    }

    // Check activity timeout (30 minutes default)
    const activityTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
    const timeSinceLastActivity = now.getTime() - this.data.lastActivity.getTime();

    if (timeSinceLastActivity > activityTimeout) {
      return true;
    }

    return false;
  }

  /**
   * Calculate session duration in minutes
   */
  getSessionDurationMinutes(): number {
    const durationMs = this.data.lastActivity.getTime() - this.data.loginTime.getTime();
    return Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }

  /**
   * Validate localStorage and sessionStorage structure
   */
  hasValidStorageStructure(): boolean {
    // Check localStorage structure
    if (this.data.localStorage) {
      // Should contain postgraphile JWT token
      if (!this.data.localStorage['postgraphile-jwt-token']) {
        return false;
      }

      // Validate user preferences format if present
      if (this.data.localStorage['user_preferences']) {
        try {
          JSON.parse(this.data.localStorage['user_preferences']);
        } catch {
          return false;
        }
      }
    }

    // Check sessionStorage structure
    if (this.data.sessionStorage) {
      // Basic validation - all values should be strings
      for (const value of Object.values(this.data.sessionStorage)) {
        if (typeof value !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract JWT token from localStorage
   */
  getJWTFromLocalStorage(): string | null {
    if (!this.data.localStorage) {
      return null;
    }

    return this.data.localStorage['postgraphile-jwt-token'] || null;
  }

  /**
   * Renew session with new token and expiry
   */
  renewSession(newToken: string, newExpiry: Date): void {
    // Validate new token format
    if (!JWTTokenSchema.safeParse(newToken).success) {
      throw new Error('New token must be valid JWT format');
    }

    // Validate new expiry is in the future
    if (newExpiry <= new Date()) {
      throw new Error('New expiry must be in the future');
    }

    // Update session data
    this.data = {
      ...this.data,
      jwtToken: newToken,
      tokenExpiry: newExpiry,
      lastActivity: new Date(),
      isActive: true
    };

    // Update localStorage if present
    if (this.data.localStorage) {
      this.data.localStorage['postgraphile-jwt-token'] = newToken;
    }
  }

  /**
   * Terminate session
   */
  terminate(): void {
    this.data = {
      ...this.data,
      isActive: false,
      jwtToken: undefined,
      tokenExpiry: undefined,
      lastActivity: new Date()
    };

    // Clear sensitive data from storage
    if (this.data.localStorage) {
      delete this.data.localStorage['postgraphile-jwt-token'];
    }

    if (this.data.sessionStorage) {
      // Clear sensitive session data
      delete this.data.sessionStorage['hr_navigation_state'];
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (!this.data.isActive) {
      throw new Error('Cannot update activity for inactive session');
    }

    this.data = {
      ...this.data,
      lastActivity: new Date()
    };
  }

  /**
   * Add or update session storage value
   */
  setSessionStorageValue(key: string, value: string): void {
    if (!this.data.isActive) {
      throw new Error('Cannot modify storage for inactive session');
    }

    this.data = {
      ...this.data,
      sessionStorage: {
        ...this.data.sessionStorage,
        [key]: value
      }
    };
  }

  /**
   * Add or update local storage value
   */
  setLocalStorageValue(key: string, value: string): void {
    if (!this.data.isActive) {
      throw new Error('Cannot modify storage for inactive session');
    }

    this.data = {
      ...this.data,
      localStorage: {
        ...this.data.localStorage,
        [key]: value
      }
    };
  }

  /**
   * Add or update cookie
   */
  setCookie(cookie: Cookie): void {
    if (!this.data.isActive) {
      throw new Error('Cannot modify cookies for inactive session');
    }

    const cookies = this.data.cookies || [];
    const existingIndex = cookies.findIndex(c => c.name === cookie.name);

    if (existingIndex >= 0) {
      // Update existing cookie
      cookies[existingIndex] = cookie;
    } else {
      // Add new cookie
      cookies.push(cookie);
    }

    this.data = {
      ...this.data,
      cookies
    };
  }

  /**
   * Get cookie by name
   */
  getCookie(name: string): Cookie | undefined {
    if (!this.data.cookies) {
      return undefined;
    }

    return this.data.cookies.find(c => c.name === name);
  }

  /**
   * Check if session has required authentication artifacts
   */
  hasRequiredAuthArtifacts(): {
    hasToken: boolean;
    hasValidToken: boolean;
    hasNonExpiredToken: boolean;
    hasAuthCookies: boolean;
    isFullyAuthenticated: boolean;
  } {
    const hasToken = !!this.data.jwtToken;
    const hasValidToken = hasToken && JWTTokenSchema.safeParse(this.data.jwtToken).success;
    const hasNonExpiredToken = hasValidToken &&
      (!this.data.tokenExpiry || this.data.tokenExpiry > new Date());

    const hasAuthCookies = !!(this.data.cookies &&
      this.data.cookies.some(c => c.name.includes('session') || c.name.includes('auth')));

    const isFullyAuthenticated = this.data.isActive && hasNonExpiredToken && !this.isExpired();

    return {
      hasToken,
      hasValidToken,
      hasNonExpiredToken,
      hasAuthCookies,
      isFullyAuthenticated
    };
  }

  /**
   * Get session security level based on configuration
   */
  getSecurityLevel(): 'low' | 'medium' | 'high' {
    let score = 0;

    // Check for secure cookies
    if (this.data.cookies?.some(c => c.secure && c.httpOnly)) {
      score += 2;
    }

    // Check for JWT token
    if (this.data.jwtToken) {
      score += 2;
    }

    // Check for proper expiry
    if (this.data.tokenExpiry && this.data.tokenExpiry > new Date()) {
      score += 1;
    }

    // Check for proper session timeout
    const sessionDuration = this.getSessionDurationMinutes();
    if (sessionDuration < 480) { // Less than 8 hours
      score += 1;
    }

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Create session snapshot for testing validation
   */
  createSnapshot(): {
    id: string;
    userId: string;
    userRole: UserRole;
    isActive: boolean;
    isExpired: boolean;
    durationMinutes: number;
    securityLevel: string;
    hasValidArtifacts: boolean;
    storageValid: boolean;
  } {
    const artifacts = this.hasRequiredAuthArtifacts();

    return {
      id: this.data.id,
      userId: this.data.userId,
      userRole: this.data.userRole,
      isActive: this.data.isActive,
      isExpired: this.isExpired(),
      durationMinutes: this.getSessionDurationMinutes(),
      securityLevel: this.getSecurityLevel(),
      hasValidArtifacts: artifacts.isFullyAuthenticated,
      storageValid: this.hasValidStorageStructure()
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AuthenticationSessionData {
    return {
      ...this.data
    };
  }

  /**
   * Create AuthenticationSession from JSON
   */
  static fromJSON(json: AuthenticationSessionData): AuthenticationSession {
    return new AuthenticationSession({
      ...json,
      loginTime: new Date(json.loginTime),
      lastActivity: new Date(json.lastActivity),
      tokenExpiry: json.tokenExpiry ? new Date(json.tokenExpiry) : undefined,
      cookies: json.cookies?.map(c => ({
        ...c,
        expires: c.expires ? new Date(c.expires) : undefined
      }))
    });
  }
}