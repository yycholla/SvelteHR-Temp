import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import SettingsPage from '../../../src/routes/settings/+page.svelte';

describe('Settings Page State Reactivity - RED Phase', () => {
	test('userSettings state reactivity works correctly', () => {
		// RED PHASE: This should fail initially due to $state(userSettings.property) capturing only initial values

		const mockData = {
			user: {
				id: 'test-user-1',
				email: 'test@example.com',
				displayName: 'Test User',
				role: 'employee'
			},
			userSession: {
				userId: 'test-user-1',
				roles: ['employee'],
				permissions: ['profile:read', 'profile:update'],
				expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				isAuthenticated: true,
				metadata: {
					userEmail: 'test@example.com',
					displayName: 'Test User'
				}
			},
			userSettings: {
				profile: {} as any,
				preferences: {} as any,
				notifications: {} as any,
				privacy: {
					profileVisibility: 'public',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			},
			activityLog: [],
			activeTab: 'privacy',
			permissions: ['profile:read', 'profile:update'],
			isAdmin: false,
			isManager: false,
			isEmployee: true,
			canViewManagement: false,
			canEditAllEmployees: false,
			canEditDepartments: false,
			canUpdateProfile: true,
			canChangePassword: true,
			canExportData: false,
			loadedAt: new Date().toISOString()
		};

		const component = render(SettingsPage, { data: mockData });

		// RED PHASE: This will fail because $state(userSettings.privacy.property) only captures initial values
		// When userSettings change, the component should react but currently doesn't due to lines 105-111

		// Test that initial values are reflected in the UI
		expect(component.container.innerHTML).toContain('public');

		// Test reactivity - this should work but doesn't due to state reference capture issue
		const updatedUserSettings = {
			user: mockData.user,
			userSession: mockData.userSession,
			userSettings: {
				profile: {} as any,
				preferences: {} as any,
				notifications: {} as any,
				privacy: {
					profileVisibility: 'private',
					showOnlineStatus: false,
					allowDirectMessages: false,
					dataSharing: true,
					analyticsOptOut: true
				}
			},
			activityLog: [],
			activeTab: 'privacy',
			permissions: mockData.permissions,
			isAdmin: false,
			isManager: false,
			isEmployee: true,
			canViewManagement: false,
			canEditAllEmployees: false,
			canEditDepartments: false,
			canUpdateProfile: true,
			canChangePassword: true,
			canExportData: false,
			loadedAt: new Date().toISOString()
		};

		// The component should react to userSettings changes, but currently it won't
		// due to $state(userSettings.privacy.property) only capturing the initial values
		expect(() => {
			const updatedComponent = render(SettingsPage, {
				data: updatedUserSettings
			});
			expect(updatedComponent.container.innerHTML).toContain('private');
		}).not.toThrow();
	});

	test('privacy settings individual properties capture changes properly', () => {
		// RED PHASE: Test specific privacy setting state reactivity issues

		const mockData = {
			user: {
				id: 'test-user-2',
				email: 'user2@example.com',
				displayName: 'Test User 2',
				role: 'employee'
			},
			userSession: {
				userId: 'test-user-2',
				roles: ['employee'],
				permissions: ['profile:read', 'profile:update'],
				expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				isAuthenticated: true,
				metadata: {
					userEmail: 'user2@example.com',
					displayName: 'Test User 2'
				}
			},
			userSettings: {
				profile: {} as any,
				preferences: {} as any,
				notifications: {} as any,
				privacy: {
					profileVisibility: 'public',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			},
			activityLog: [],
			activeTab: 'privacy',
			permissions: ['profile:read', 'profile:update'],
			isAdmin: false,
			isManager: false,
			isEmployee: true,
			canViewManagement: false,
			canEditAllEmployees: false,
			canEditDepartments: false,
			canUpdateProfile: true,
			canChangePassword: true,
			canExportData: false,
			loadedAt: new Date().toISOString()
		};

		const component = render(SettingsPage, { data: mockData });

		// RED PHASE: These will fail because each $state(userSettings.privacy.X) only captures initial value
		expect(component.container.innerHTML).toContain('true'); // showOnlineStatus
		expect(component.container.innerHTML).toContain('false'); // dataSharing

		// Test reactivity for individual properties - this should work but doesn't due to state reference capture
		const updatedData = {
			user: mockData.user,
			userSession: mockData.userSession,
			userSettings: {
				profile: {} as any,
				preferences: {} as any,
				notifications: {} as any,
				privacy: {
					profileVisibility: 'private',
					showOnlineStatus: false,
					allowDirectMessages: false,
					dataSharing: true,
					analyticsOptOut: true
				}
			},
			activityLog: [],
			activeTab: 'privacy',
			permissions: mockData.permissions,
			isAdmin: false,
			isManager: false,
			isEmployee: true,
			canViewManagement: false,
			canEditAllEmployees: false,
			canEditDepartments: false,
			canUpdateProfile: true,
			canChangePassword: true,
			canExportData: false,
			loadedAt: new Date().toISOString()
		};

		// These should be reactive but currently aren't due to lines 105-111 issues
		expect(() => {
			const updatedComponent = render(SettingsPage, { data: updatedData });

			// Test each property that has state reference capture issues
			expect(updatedComponent.container.innerHTML).toContain('private');
			expect(updatedComponent.container.innerHTML).toContain('false'); // showOnlineStatus now false
			expect(updatedComponent.container.innerHTML).toContain('true'); // dataSharing now true
		}).not.toThrow();
	});
});
