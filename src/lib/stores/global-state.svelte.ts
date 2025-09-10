/**
 * Global State Management with Svelte 5 Runes
 * 
 * Advanced global state management system built with Svelte 5 runes.
 * Provides centralized state management, computed values, and optimized reactivity
 * for the entire SvelteHR application.
 */

import { createLocalStorageState, ReactiveArray, createPerformanceMonitor } from '$lib/utils/reactivity.svelte';
import type { User } from '$lib/auth/index';

// Performance monitoring
const stateMonitor = createPerformanceMonitor('GlobalState');

// Application-wide state interfaces
interface AppSettings {
	theme: 'light' | 'dark' | 'system';
	language: 'en' | 'es' | 'fr';
	timezone: string;
	notifications: {
		enabled: boolean;
		sound: boolean;
		desktop: boolean;
		email: boolean;
	};
	accessibility: {
		reducedMotion: boolean;
		highContrast: boolean;
		fontSize: 'small' | 'medium' | 'large';
	};
	dashboard: {
		refreshInterval: number;
		compactMode: boolean;
		showWelcome: boolean;
	};
}

interface NavigationState {
	currentPage: string;
	breadcrumbs: Array<{ label: string; href: string }>;
	sidebarCollapsed: boolean;
	mobileMenuOpen: boolean;
}

interface NotificationItem {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	title: string;
	message: string;
	timestamp: Date;
	read: boolean;
	actions?: Array<{ label: string; action: () => void }>;
}

interface GlobalAppState {
	// User and authentication state
	user: User | null;
	isAuthenticated: boolean;
	permissions: string[];
	
	// Application settings
	settings: AppSettings;
	
	// Navigation state
	navigation: NavigationState;
	
	// Notifications
	notifications: NotificationItem[];
	unreadCount: number;
	
	// Loading and error states
	globalLoading: boolean;
	errors: string[];
	
	// Performance metrics
	performanceMetrics: {
		renderTime: number;
		apiCalls: number;
		cacheHits: number;
		cacheMisses: number;
	};
}

// Default state values
const defaultSettings: AppSettings = {
	theme: 'system',
	language: 'en',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	notifications: {
		enabled: true,
		sound: true,
		desktop: true,
		email: false
	},
	accessibility: {
		reducedMotion: false,
		highContrast: false,
		fontSize: 'medium'
	},
	dashboard: {
		refreshInterval: 300,
		compactMode: false,
		showWelcome: true
	}
};

const defaultNavigationState: NavigationState = {
	currentPage: '/',
	breadcrumbs: [],
	sidebarCollapsed: false,
	mobileMenuOpen: false
};

// Global state using Svelte 5 runes
class GlobalStateManager {
	// Core state
	private _user = $state<User | null>(null);
	private _permissions = $state<string[]>([]);
	private _globalLoading = $state<boolean>(false);
	private _errors = new ReactiveArray<string>();
	
	// Settings with localStorage persistence
	private _settingsStorage = createLocalStorageState('svelteHR-settings', defaultSettings);
	
	// Navigation state
	private _navigation = $state<NavigationState>(defaultNavigationState);
	
	// Notifications with optimized array operations
	private _notifications = new ReactiveArray<NotificationItem>();
	
	// Performance metrics
	private _performanceMetrics = $state({
		renderTime: 0,
		apiCalls: 0,
		cacheHits: 0,
		cacheMisses: 0
	});

	// Computed values using $derived
	readonly isAuthenticated = $derived(this._user !== null);
	readonly currentUser = $derived(() => this._user);
	readonly userPermissions = $derived(() => this._permissions);
	readonly settings = $derived(() => this._settingsStorage.value);
	readonly navigation = $derived(() => this._navigation);
	readonly notifications = $derived(() => this._notifications.value);
	readonly unreadCount = $derived(() => 
		this._notifications.value.filter(n => !n.read).length
	);
	readonly globalLoading = $derived(() => this._globalLoading);
	readonly errors = $derived(() => this._errors.value);
	readonly performanceMetrics = $derived(() => this._performanceMetrics);
	
	// Advanced computed values
	readonly hasAdminAccess = $derived(() => 
		this._permissions.includes('*') || this._permissions.includes('admin:*')
	);
	
	readonly hasHRAccess = $derived(() => 
		this.hasAdminAccess() || 
		this._permissions.some(p => p.startsWith('employees:') || p.startsWith('hr:'))
	);
	
	readonly canManageUsers = $derived(() =>
		this.hasAdminAccess() || this._permissions.includes('users:manage')
	);
	
	readonly theme = $derived(() => {
		const theme = this.settings().theme;
		if (theme === 'system') {
			return typeof window !== 'undefined' && 
				   window.matchMedia('(prefers-color-scheme: dark)').matches 
				? 'dark' 
				: 'light';
		}
		return theme;
	});

	// User management methods
	setUser(user: User | null, permissions: string[] = []) {
		this._user = user;
		this._permissions = permissions;
	}

	updateUserProfile(updates: Partial<User>) {
		if (this._user) {
			this._user = { ...this._user, ...updates };
		}
	}

	// Settings management methods
	updateSettings(updates: Partial<AppSettings>) {
		this._settingsStorage.value = { ...this._settingsStorage.value, ...updates };
	}

	resetSettings() {
		this._settingsStorage.value = defaultSettings;
	}

	// Navigation methods
	setCurrentPage(page: string, breadcrumbs: Array<{ label: string; href: string }> = []) {
		this._navigation = {
			...this._navigation,
			currentPage: page,
			breadcrumbs
		};
	}

	toggleSidebar() {
		this._navigation = {
			...this._navigation,
			sidebarCollapsed: !this._navigation.sidebarCollapsed
		};
	}

	setSidebarCollapsed(collapsed: boolean) {
		this._navigation = {
			...this._navigation,
			sidebarCollapsed: collapsed
		};
	}

	toggleMobileMenu() {
		this._navigation = {
			...this._navigation,
			mobileMenuOpen: !this._navigation.mobileMenuOpen
		};
	}

	// Notification methods
	addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) {
		const newNotification: NotificationItem = {
			...notification,
			id: crypto.randomUUID(),
			timestamp: new Date(),
			read: false
		};
		
		this._notifications.unshift(newNotification);
		
		// Limit notifications to 100 items
		if (this._notifications.length > 100) {
			this._notifications.splice(100);
		}
	}

	markNotificationRead(id: string) {
		const index = this._notifications.findIndex(n => n.id === id);
		if (index !== -1) {
			const notification = this._notifications.value[index];
			this._notifications.splice(index, 1, { ...notification, read: true });
		}
	}

	markAllNotificationsRead() {
		const updatedNotifications = this._notifications.value.map(n => ({ ...n, read: true }));
		this._notifications.replace(updatedNotifications);
	}

	removeNotification(id: string) {
		const index = this._notifications.findIndex(n => n.id === id);
		if (index !== -1) {
			this._notifications.splice(index, 1);
		}
	}

	clearAllNotifications() {
		this._notifications.clear();
	}

	// Loading state methods
	setGlobalLoading(loading: boolean) {
		this._globalLoading = loading;
	}

	// Error management methods
	addError(error: string) {
		this._errors.push(error);
		
		// Auto-remove errors after 10 seconds
		setTimeout(() => {
			this.removeError(error);
		}, 10000);
	}

	removeError(error: string) {
		const index = this._errors.findIndex(e => e === error);
		if (index !== -1) {
			this._errors.splice(index, 1);
		}
	}

	clearErrors() {
		this._errors.clear();
	}

	// Performance tracking methods
	updatePerformanceMetrics(updates: Partial<typeof this._performanceMetrics>) {
		this._performanceMetrics = { ...this._performanceMetrics, ...updates };
	}

	incrementApiCall() {
		this._performanceMetrics.apiCalls++;
	}

	incrementCacheHit() {
		this._performanceMetrics.cacheHits++;
	}

	incrementCacheMiss() {
		this._performanceMetrics.cacheMisses++;
	}

	// Utility methods
	checkPermission(permission: string): boolean {
		return this._permissions.includes('*') || this._permissions.includes(permission);
	}

	checkAnyPermission(permissions: string[]): boolean {
		return permissions.some(permission => this.checkPermission(permission));
	}

	checkAllPermissions(permissions: string[]): boolean {
		return permissions.every(permission => this.checkPermission(permission));
	}

	// Development helpers
	getDebugInfo() {
		return stateMonitor.monitor(() => ({
			user: this._user,
			permissions: this._permissions,
			settings: this._settingsStorage.value,
			navigation: this._navigation,
			notificationCount: this._notifications.length,
			errorCount: this._errors.length,
			performance: this._performanceMetrics,
			stats: stateMonitor.getStats()
		}));
	}

	// Batch operations for performance
	batchUpdate(updates: {
		user?: User | null;
		permissions?: string[];
		settings?: Partial<AppSettings>;
		navigation?: Partial<NavigationState>;
	}) {
		// Use untrack to prevent intermediate updates
		$effect.pre(() => {
			if (updates.user !== undefined) {
				this._user = updates.user;
			}
			if (updates.permissions) {
				this._permissions = updates.permissions;
			}
			if (updates.settings) {
				this._settingsStorage.value = { ...this._settingsStorage.value, ...updates.settings };
			}
			if (updates.navigation) {
				this._navigation = { ...this._navigation, ...updates.navigation };
			}
		});
	}
}

// Create and export the global state manager instance
export const globalState = new GlobalStateManager();

// Export types for external use
export type { 
	AppSettings, 
	NavigationState, 
	NotificationItem, 
	GlobalAppState 
};

// Development mode helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	(window as any).globalState = globalState;
	console.info('🔍 Global state manager available at window.globalState');
}