/**
 * Permission Test Mode Store
 * Allows administrators to temporarily test permissions by viewing the system as if they had a specific role
 */

import { writable, derived, get } from 'svelte/store';
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

// Load from localStorage if available
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

// Create the store
const permissionTestStore = writable<PermissionTestState>(loadFromStorage());

// Subscribe to store changes to persist to localStorage
if (browser) {
	permissionTestStore.subscribe((state) => {
		saveToStorage(state);
	});
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
		permissionTestStore.set({
			isActive: true,
			testRoleId: roleId,
			testRoleName: roleName,
			testPermissions: rolePermissions,
			originalPermissions: currentPermissions,
			timestamp: Date.now(),
			version: STORAGE_VERSION
		});

		console.log(`🧪 Started testing permissions as "${roleName}"`, {
			testPermissions: rolePermissions.length,
			originalPermissions: currentPermissions.length
		});
	},

	/**
	 * End test mode and restore original permissions
	 */
	endTestMode(): void {
		const current = get(permissionTestStore);
		if (!current.isActive) return;

		console.log(`✓ Ended test mode for "${current.testRoleName}"`);

		permissionTestStore.set(initialState);
	},

	/**
	 * Check if test mode is currently active
	 */
	isTestModeActive(): boolean {
		return get(permissionTestStore).isActive;
	},

	/**
	 * Get the current test role name (or null if not testing)
	 */
	getTestRoleName(): string | null {
		return get(permissionTestStore).testRoleName;
	},

	/**
	 * Get test permissions (or empty array if not testing)
	 */
	getTestPermissions(): string[] {
		const state = get(permissionTestStore);
		return state.isActive ? state.testPermissions : [];
	}
};

// Derived stores for convenience
export const isTestModeActive = derived(
	permissionTestStore,
	($testMode) => $testMode.isActive
);

export const testRoleName = derived(
	permissionTestStore,
	($testMode) => $testMode.testRoleName
);

export const effectivePermissions = derived(
	permissionTestStore,
	($testMode) => {
		if ($testMode.isActive) {
			return $testMode.testPermissions;
		}
		return null; // Return null to indicate "use original permissions"
	}
);

// Export the store
export { permissionTestStore };

// Export utility functions
export function getEffectivePermissions(originalPermissions: string[]): string[] {
	const state = get(permissionTestStore);
	return state.isActive ? state.testPermissions : originalPermissions;
}

export function clearTestModeOnLogout(): void {
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
		permissionTestStore.set(initialState);
	}
}
