import { logger } from '$lib/utils/logger';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { type UserRoleAssignment, createRBACManager } from '$lib/auth/rbac';
import { secureAuthService } from '$lib/auth/secure-auth-service';
import { createUrqlClient } from '$lib/graphql/client';
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
import { GET_EMPLOYEE_BY_ID_QUERY } from '$lib/graphql/employee-operations';
import { createClientServices } from '$lib/client/services';
import type { Role } from '$domain/RBAC/entities/Role';

// User interface
export interface User {
	id: string;
	email: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
	first_name?: string;
	last_name?: string;
	display_name?: string;
	onboardingStatus: string;
	isActive: boolean;
	role?: string;
	role_assignments?: UserRoleAssignment[];
	job_title?: string;
	jobTitle?: string;
	username?: string;
	profile_image?: string;
	profileImage?: string;
	job_information?: {
		department?: {
			id?: string;
			name?: string;
		};
	};
	department?: {
		id?: string;
		name?: string;
	};
	manager?: {
		id: string;
		display_name?: string;
		displayName?: string;
	};
}

class AuthStore {
	// State
	user = $state<User | null>(null);
	roles = $state<UserRoleAssignment[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Derived State
	isAuthenticated = $derived(!!this.user);

	// RBAC Manager
	rbac = $derived(createRBACManager(this.roles, this.user?.id ?? null));

	// Permission Checks
	canViewUsers = $derived(this.safeCheck(() => this.rbac.hasPermission('view_users')));
	canManageUsers = $derived(this.safeCheck(() => this.rbac.hasPermission('update_users')));
	canViewSensitiveData = $derived(
		this.safeCheck(() => this.rbac.hasPermission('view_sensitive_data'))
	);
	canManageRoles = $derived(this.safeCheck(() => this.rbac.hasPermission('assign_roles')));
	canApproveLeave = $derived(
		this.safeCheck(() => this.rbac.hasPermission('approve_leave_requests'))
	);
	canManageWorkflows = $derived(this.safeCheck(() => this.rbac.hasPermission('manage_workflows')));
	canManageCompliance = $derived(
		this.safeCheck(() => this.rbac.hasPermission('manage_compliance'))
	);

	userHighestRole = $derived.by(() => {
		try {
			const roleNames = this.rbac.getRoleNames();
			const highestLevel = this.rbac.getHighestRoleLevel();
			return {
				name: roleNames.length > 0 ? roleNames[0] : 'hr_guest',
				level: highestLevel
			};
		} catch {
			return {
				name: 'hr_guest',
				level: 0
			};
		}
	});

	/**
	 * Client-side service container
	 *
	 * Provides access to domain services (RBACService, etc.) with proper
	 * hexagonal architecture. Created once and reused.
	 */
	private services = createClientServices();

	private safeCheck(check: () => boolean): boolean {
		try {
			return check();
		} catch {
			return false;
		}
	}

	// Actions
	setLoading(loading: boolean) {
		this.isLoading = loading;
	}

	setError(error: string | null) {
		this.error = error;
	}

	async login(email: string, password: string, _rememberMe: boolean = false): Promise<boolean> {
		this.setLoading(true);
		this.setError(null);

		try {
			const result = await secureAuthService.login({ email, password });

			if (result.success && result.user) {
				// Check for force_password_change flag
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if ((result.user as any).force_password_change === true) {
					logger.info('[Auth] User must change password on first login');

					const user: User = {
						id: result.user.id,
						email: result.user.email,

						displayName:
							(result.user as any).displayName ?? result.user.email.split('@')[0] ?? 'User',
						onboardingStatus: 'Active',
						isActive: true,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						role: (result.user as any).role
					};

					this.user = user;
					this.isLoading = false;

					if (browser) {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						await goto('/change-password?required=true', { replaceState: true });
					}

					return true;
				}

				const user: User = {
					id: result.user.id,
					email: result.user.email,

					displayName:
						(result.user as any).displayName ?? result.user.email.split('@')[0] ?? 'User',
					onboardingStatus: 'Active',
					isActive: true,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					role: (result.user as any).role
				};

				// Apply theme in background (non-blocking) - login succeeds even if this fails
				this.applyUserTheme(user.id).catch((err) => {
					logger.warn(`Theme loading failed, using system default: ${err}`);
				});

				await this.setUser(user);
				return true;
			} else {
				this.setError(result.error ?? 'Login failed');
				return false;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Network error during login';
			this.setError(errorMessage);
			return false;
		} finally {
			this.setLoading(false);
		}
	}

	async logout(currentUrl?: string): Promise<void> {
		try {
			if (typeof window !== 'undefined' && currentUrl) {
				if (!currentUrl.includes('/login') && currentUrl !== '/') {
					localStorage.setItem('hr_return_url', currentUrl);
				}
			}

			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			}).catch((err) => logger.warn(`Logout endpoint failed: ${err}`));

			// Use dynamic import to avoid circular dependency if permission-test imports auth
			// (Assuming permission-test is already runes-based or compatible)
			const { clearTestModeOnLogout } = await import('$lib/stores/permission-test.svelte');
			clearTestModeOnLogout();
		} catch (error) {
			logger.warn(`Logout error: ${error}`);
		} finally {
			this.reset();
		}
	}

	async applyUserTheme(userId: string): Promise<void> {
		if (!browser) return;

		try {
			const { createSettingsOperations } = await import('$lib/graphql/settings-operations');
			const { setMode } = await import('mode-watcher');

			const urqlClient = createUrqlClient();
			const settingsOps = createSettingsOperations(urqlClient);

			const userSettings = await settingsOps.getUserSettings({
				userCredentials: {
					userId,
					roles: [],
					permissions: [],
					isAuthenticated: true,
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
				}
			});

			if (userSettings?.preferences?.theme) {
				setMode(userSettings.preferences.theme as 'light' | 'dark' | 'system');
				logger.info(`✓ Applied user theme on login: ${userSettings.preferences.theme}`);
			} else {
				logger.info('ℹ No theme preference found, using system default');
			}
		} catch (error) {
			logger.warn(`Unable to load theme preference, using system default: ${error}`);
		}
	}

	async setUser(user: User): Promise<void> {
		this.user = user;
		// Load roles and await completion - ensures isLoading updates correctly
		try {
			await this.loadUserRoles(user.id);
		} catch (err) {
			logger.warn(`Role loading failed, using guest permissions: ${err}`);
			this.isLoading = false;
		}
	}

	/**
	 * Load user roles from the backend via RBACService
	 *
	 * Uses domain service layer instead of direct GraphQL access.
	 * Errors are handled gracefully - role loading failures do not block login.
	 *
	 * @param userId - The ID of the user to load roles for
	 */
	async loadUserRoles(userId: string): Promise<void> {
		// Skip during SSR - no jwtGraphQLClient available
		if (!browser) {
			return;
		}

		this.isLoading = true;

		// Use RBACService instead of direct GraphQL
		const result = await this.services.rbacService.getAllRoles();

		if (result.isError) {
			// All role loading failures are non-critical (matches current behavior)
			logger.warn(`[Auth] Could not load roles: ${result.error.message}`);
			this.isLoading = false;
			return;
		}

		// Success - process domain entities
		const roles = result.value;
		this.processRoles(roles, userId);
		this.isLoading = false;
	}

	/**
	 * Process Role domain entities into store state
	 *
	 * Maps domain entities to serializable store state. Finds the role
	 * that matches the current user's role name (case-insensitive).
	 *
	 * @param roles - Array of Role domain entities
	 * @param userId - The user ID for the role assignment
	 */
	private processRoles(roles: Role[], userId: string): void {
		if (!this.user?.role) {
			logger.warn('[Auth] No user role set, skipping role assignment');
			this.roles = [];
			return;
		}

		const userRoleName = this.user.role;

		// Find matching role (case-insensitive)
		const matchingRole = roles.find((r) => r.name.toLowerCase() === userRoleName.toLowerCase());

		if (!matchingRole) {
			logger.warn(`[Auth] Role definition not found for user role: ${userRoleName}`);
			this.roles = [];
			return;
		}

		// Map domain entity to UserRoleAssignment format
		const roleWithPermissionNames = {
			id: matchingRole.id,
			name: matchingRole.name,
			level: matchingRole.hierarchy.level,
			description: matchingRole.description,
			isActive: true,
			permissions: matchingRole.permissions.map((p) => ({
				id: p.toString(),
				name: p.toString(),
				resource: p.resource,
				action: p.action,
				isActive: true
			}))
		};

		this.roles = [
			{
				id: `assignment-${userId}`,
				userId,
				roleId: matchingRole.id,
				role: roleWithPermissionNames,
				assignedAt: new Date().toISOString(),
				isActive: true
			}
		];

		logger.info(
			`[Auth] Loaded ${roleWithPermissionNames.permissions.length} permissions for role: ${matchingRole.name}`
		);
	}

	async validateSession(): Promise<boolean> {
		logger.info('validateSession: Starting session validation');
		if (!browser) {
			logger.info('validateSession: Not in browser, returning false');
			return false;
		}

		try {
			const response = await fetch('/api/auth/verify', {
				method: 'GET',
				credentials: 'include'
			});

			if (!response.ok) {
				logger.info('validateSession: Session validation failed, clearing auth state');
				this.reset();
				return false;
			}

			const data = await response.json();
			logger.info('validateSession: Session is valid');

			if (!this.user && data.user) {
				const user: User = {
					id: data.user.id,
					email: data.user.email,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					displayName: (data.user as any).displayName ?? data.user.email.split('@')[0] ?? 'User',
					onboardingStatus: 'Active',
					isActive: true,
					role: data.user.role
				};

				await this.applyUserTheme(user.id);
				this.user = user;
			}

			logger.info('validateSession: Validation successful, user is authenticated');
			return true;
		} catch (error) {
			logger.error('Catch failed', error as Error);
			this.reset();
			return false;
		}
	}

	async refreshUser(): Promise<void> {
		if (!this.user?.id) return;

		this.setLoading(true);

		try {
			const client = createUrqlClient();
			const userResult = await client
				.query(GET_EMPLOYEE_BY_ID_QUERY, { id: this.user.id })
				.toPromise();

			if (userResult.data?.user) {
				await this.setUser(userResult.data.user);
			}
		} catch (error) {
			logger.error('Catch failed', error as Error);
			this.setError('Failed to refresh user data');
		} finally {
			this.setLoading(false);
		}
	}

	hasPermission(permission: string): boolean {
		return this.rbac.hasPermission(permission);
	}

	hasMinimumRoleLevel(level: number): boolean {
		return this.rbac.hasMinimumRoleLevel(level);
	}

	canManageUser(targetUserId: string, requiredPermission: string): boolean {
		return this.rbac.canManage(requiredPermission.split(':')[0]);
	}

	hasRole(roleName: string): boolean {
		return this.rbac.hasRole(roleName);
	}

	reset() {
		this.user = null;
		this.roles = [];
		this.isLoading = false;
		this.error = null;
	}
}

export const auth = new AuthStore();
