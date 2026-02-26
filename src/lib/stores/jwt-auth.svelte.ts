import { type Client, type CombinedError } from '@urql/core';
import { browser } from '$app/environment';
import { AccessToken } from '$domain/Auth/value-objects/AccessToken';

export interface AuthUser {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	forcePasswordChange: boolean;
	onboardingStatus?: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	refreshTokenPlaintext: string;
	tokenType: string;
	expiresIn: number;
}

interface LoginApiResponse {
	success: boolean;
	error?: string;
	user?: AuthUser;
	accessToken?: string;
	expiresIn?: number;
}

const LOGIN_MUTATION = `
	mutation Login($email: String!, $password: String!, $deviceInfo: String, $ipAddress: String) {
		login(input: { email: $email, password: $password, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const REFRESH_TOKEN_MUTATION = `
	mutation RefreshToken($refreshToken: String!, $refreshTokenPlaintext: String!, $deviceInfo: String, $ipAddress: String) {
		refreshToken(input: { refreshToken: $refreshToken, refreshTokenPlaintext: $refreshTokenPlaintext, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const LOGOUT_MUTATION = `
	mutation Logout {
		logout {
			success
			message
		}
	}
`;

function canUseServerAuthApi(): boolean {
	return browser && process.env.NODE_ENV !== 'test';
}

class JwtAuthStore {
	accessToken = $state<string | null>(null);
	user = $state<AuthUser | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);

	isAuthenticated = $derived(!!this.accessToken && !!this.user);

	private refreshTokenData = $state<{ jwt: string; plaintext: string } | null>(null);
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;
	private graphqlClient: Client | null = null;
	private tokenExpiresAt: Date | null = null;

	initialize(client: Client) {
		this.graphqlClient = client;
		if (browser) {
			void this.restoreSession();
		}
	}

	async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
		this.isLoading = true;
		this.error = null;

		try {
			if (canUseServerAuthApi()) {
				return await this.loginViaServerApi(email, password);
			}
			return await this.loginViaGraphQLClient(email, password);
		} finally {
			this.isLoading = false;
		}
	}

	async refreshAccessToken(): Promise<boolean> {
		try {
			if (canUseServerAuthApi()) {
				return await this.refreshViaServerApi();
			}
			return await this.refreshViaGraphQLClient();
		} catch {
			this.clearAuthData();
			return false;
		}
	}

	async logout(): Promise<void> {
		try {
			if (canUseServerAuthApi()) {
				await fetch('/api/auth/logout', {
					method: 'POST',
					credentials: 'include'
				});
				return;
			}

			if (this.graphqlClient) {
				await this.graphqlClient.mutation(LOGOUT_MUTATION, {});
			}
		} catch {
			// Logout should always clear local state even if backend call fails.
		} finally {
			this.clearAuthData();
		}
	}

	hasPermission(permission: string): boolean {
		return this.user?.permissions.includes(permission) ?? false;
	}

	hasRole(role: string): boolean {
		return this.user?.roles.includes(role) ?? false;
	}

	hasAnyRole(roles: string[]): boolean {
		return roles.some((role) => this.hasRole(role));
	}

	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((permission) => this.hasPermission(permission));
	}

	toDomainAccessToken(): AccessToken | null {
		if (!this.accessToken || !this.user) return null;

		const result = AccessToken.create({
			token: this.accessToken,
			userId: this.user.id,
			expiresAt: this.tokenExpiresAt ?? new Date(0),
			permissions: this.user.permissions,
			roles: this.user.roles
		});

		return result.isOk ? result.value : null;
	}

	private async loginViaServerApi(
		email: string,
		password: string
	): Promise<{ success: boolean; error?: string }> {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ email, password })
		});

		const payload = (await response.json()) as LoginApiResponse;

		if (
			!response.ok ||
			!payload.success ||
			!payload.user ||
			!payload.accessToken ||
			!payload.expiresIn
		) {
			const errorMessage = payload.error || 'Login failed';
			this.error = errorMessage;
			return { success: false, error: errorMessage };
		}

		this.setAuthDataFromApi(payload.user, payload.accessToken, payload.expiresIn);
		return { success: true };
	}

	private async loginViaGraphQLClient(
		email: string,
		password: string
	): Promise<{ success: boolean; error?: string }> {
		if (!this.graphqlClient) {
			return { success: false, error: 'GraphQL client not initialized' };
		}

		try {
			const result = await this.graphqlClient.mutation(LOGIN_MUTATION, {
				email,
				password,
				deviceInfo: this.getDeviceInfo(),
				ipAddress: null
			});

			if (result.error) {
				const errorMessage = this.formatGraphQLError(result.error);
				this.error = errorMessage;
				return { success: false, error: errorMessage };
			}

			const loginResult = result.data?.login;
			if (loginResult?.__typename === 'AuthError') {
				this.error = loginResult.message;
				return { success: false, error: loginResult.message };
			}

			if (loginResult?.__typename === 'AuthSuccess') {
				this.setAuthData(loginResult.user, loginResult.tokens);
				return { success: true };
			}

			return { success: false, error: 'Unknown login response' };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Login failed';
			this.error = errorMessage;
			return { success: false, error: errorMessage };
		}
	}

	private async refreshViaServerApi(): Promise<boolean> {
		const response = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'include'
		});

		if (!response.ok) {
			this.clearAuthData();
			return false;
		}

		const payload = (await response.json()) as LoginApiResponse;
		if (!payload.success || !payload.user || !payload.accessToken || !payload.expiresIn) {
			this.clearAuthData();
			return false;
		}

		this.setAuthDataFromApi(payload.user, payload.accessToken, payload.expiresIn);
		return true;
	}

	private async refreshViaGraphQLClient(): Promise<boolean> {
		if (!this.graphqlClient || !this.refreshTokenData) {
			return false;
		}

		const result = await this.graphqlClient.mutation(REFRESH_TOKEN_MUTATION, {
			refreshToken: this.refreshTokenData.jwt,
			refreshTokenPlaintext: this.refreshTokenData.plaintext,
			deviceInfo: this.getDeviceInfo(),
			ipAddress: null
		});

		if (result.error) {
			this.clearAuthData();
			return false;
		}

		const refreshResult = result.data?.refreshToken;
		if (refreshResult?.__typename === 'AuthError') {
			this.clearAuthData();
			return false;
		}

		if (refreshResult?.__typename === 'AuthSuccess') {
			this.setAuthData(refreshResult.user, refreshResult.tokens);
			return true;
		}

		return false;
	}

	private setAuthData(user: AuthUser, tokens: TokenPair) {
		this.user = user;
		this.accessToken = tokens.accessToken;
		this.tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
		this.refreshTokenData = {
			jwt: tokens.refreshToken,
			plaintext: tokens.refreshTokenPlaintext
		};
		this.scheduleTokenRefresh(tokens.expiresIn);
	}

	private setAuthDataFromApi(user: AuthUser, accessToken: string, expiresInSeconds: number) {
		this.user = user;
		this.accessToken = accessToken;
		this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
		this.scheduleTokenRefresh(expiresInSeconds);
	}

	private clearAuthData() {
		this.user = null;
		this.accessToken = null;
		this.tokenExpiresAt = null;
		this.refreshTokenData = null;
		this.error = null;

		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	private scheduleTokenRefresh(expiresInSeconds: number) {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		const refreshInMs = Math.max((expiresInSeconds - 60) * 1000, 0);
		if (refreshInMs <= 0) return;

		this.refreshTimer = setTimeout(async () => {
			const success = await this.refreshAccessToken();
			if (!success) {
				this.clearAuthData();
			}
		}, refreshInMs);
	}

	private async restoreSession() {
		await this.refreshAccessToken();
	}

	private getDeviceInfo(): string {
		if (!browser) return 'SSR';
		return navigator.userAgent;
	}

	private formatGraphQLError(error: CombinedError): string {
		if (error.networkError) {
			return 'Network error. Please check your connection.';
		}
		if (error.graphQLErrors.length > 0) {
			return error.graphQLErrors[0].message;
		}
		return 'An unexpected error occurred';
	}
}

export const jwtAuth = new JwtAuthStore();
