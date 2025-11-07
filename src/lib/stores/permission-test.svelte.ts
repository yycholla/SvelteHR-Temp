/**
 * Permission Test Mode State (Svelte 5 Runes)
 * Allows administrators to temporarily test permissions by viewing the system as if they had a specific role
 */

import { browser } from '$app/environment';

const STORAGE_KEY = 'hr_permission_test_mode';
const STORAGE_VERSION = 1;

export interface PermissionTestState {
	isActive: boolean;
	testRoleId: string | null;
	testRoleName: string | null;
	testPermissions: string[];
	originalPermissions: string[];
	timestamp: number; // When test mode was activated
	version: number; // Storage version for future compatibility
}

const initialState: PermissionTestState = {
	isActive: false,
	testRoleId: null,
	testRoleName: null,
	testPermissions: [],
	originalPermissions: [],
	timestamp: 0,
	version: STORAGE_VERSION
};

// Create reactive state using $state
// Initialize with default state to avoid localStorage read during SSR
let permissionTestState = $state<PermissionTestState>(initialState);
let isHydrated = $state(false);

// Load from localStorage (only called on client-side after mount)
function loadFromStorage(): PermissionTestState {
	if (!browser) return initialState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return initialState;

		const parsed = JSON.parse(stored) as PermissionTestState;

		// Validate storage version
		if (parsed.version !== STORAGE_VERSION) {
			console.warn('Permission test mode storage version mismatch, clearing');
			localStorage.removeItem(STORAGE_KEY);
			return initialState;
		}

		// Check if test mode is stale (> 24 hours old)
		const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
		if (Date.now() - parsed.timestamp > MAX_AGE) {
			console.warn('Permission test mode is stale, clearing');
			localStorage.removeItem(STORAGE_KEY);
			return initialState;
		}

		return parsed;
	} catch (error) {
		console.error('Error loading permission test mode from storage:', error);
		return initialState;
	}
}

// Save to localStorage
function saveToStorage(state: PermissionTestState): void {
	if (!browser) return;

	try {
		if (state.isActive) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch (error) {
		console.error('Error saving permission test mode to storage:', error);
	}
}

// Reactive persistence effect (only runs in browser)
$effect(() => {
	if (browser && isHydrated) {
		saveToStorage(permissionTestState);
	}
});

// Initialize from localStorage on client side (call this from onMount in components)
export function hydrateFromStorage(): void {
	if (!browser || isHydrated) return;

	permissionTestState = loadFromStorage();
	isHydrated = true;
}

// Actions
export const permissionTestActions = {
	/**
	 * Start test mode with a specific role's permissions
	 */
	startTestMode(
		roleId: string,
		roleName: string,
		rolePermissions: string[],
		currentPermissions: string[]
	): void {
		permissionTestState = {
			isActive: true,
			testRoleId: roleId,
			testRoleName: roleName,
			testPermissions: rolePermissions,
			originalPermissions: currentPermissions,
			timestamp: Date.now(),
			version: STORAGE_VERSION
		};

		console.log(`🧪 Started testing permissions as "${roleName}"`, {
			testPermissions: rolePermissions.length,
			originalPermissions: currentPermissions.length
		});
	},

	/**
	 * End test mode and restore original permissions
	 */
	endTestMode(): void {
		if (!permissionTestState.isActive) return;

		console.log(`✓ Ended test mode for "${permissionTestState.testRoleName}"`);

		permissionTestState = { ...initialState };
	},

	/**
	 * Check if test mode is currently active
	 */
	isTestModeActive(): boolean {
		return permissionTestState.isActive;
	},

	/**
	 * Get the current test role name (or null if not testing)
	 */
	getTestRoleName(): string | null {
		return permissionTestState.testRoleName;
	},

	/**
	 * Get test permissions (or empty array if not testing)
	 */
	getTestPermissions(): string[] {
		return permissionTestState.isActive ? permissionTestState.testPermissions : [];
	}
};

// Derived values for convenience (reactive getters)
export function isTestModeActive() {
	return permissionTestState.isActive;
}

export function testRoleName() {
	return permissionTestState.testRoleName;
}

export function effectivePermissions() {
	if (permissionTestState.isActive) {
		return permissionTestState.testPermissions;
	}
	return null; // Return null to indicate "use original permissions"
}

// Export the state (for direct access in components)
export function getPermissionTestState() {
	return permissionTestState;
}

// Export utility functions
export function getEffectivePermissions(originalPermissions: string[]): string[] {
	return permissionTestState.isActive
		? permissionTestState.testPermissions
		: originalPermissions;
}

export function clearTestModeOnLogout(): void {
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
		permissionTestState = { ...initialState };
	}
}
