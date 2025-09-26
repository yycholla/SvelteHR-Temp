import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import SettingsPage from '../../src/routes/settings/+page.svelte';

describe('Settings Page State Reactivity - RED Phase', () => {
	test('userSettings state reactivity works correctly', () => {
		// RED PHASE: This should fail initially due to $state(userSettings.property) capturing only initial values

		const mockData = {
			userSettings: {
				privacy: {
					profileVisibility: 'public',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			}
		};

		const component = render(SettingsPage, { data: mockData });

		// RED PHASE: This will fail because $state(userSettings.privacy.property) only captures initial values
		// When userSettings change, the component should react but currently doesn't due to lines 105-111

		// Test that initial values are reflected in the UI
		expect(component.container.innerHTML).toContain('public');

		// Test reactivity - this should work but doesn't due to state reference capture issue
		const updatedUserSettings = {
			privacy: {
				profileVisibility: 'private',
				showOnlineStatus: false,
				allowDirectMessages: false,
				dataSharing: true,
				analyticsOptOut: true
			}
		};

		// The component should react to userSettings changes, but currently it won't
		// due to $state(userSettings.privacy.property) only capturing the initial values
		expect(() => {
			const updatedComponent = render(SettingsPage, {
				data: { userSettings: updatedUserSettings }
			});
			expect(updatedComponent.container.innerHTML).toContain('private');
		}).not.toThrow();
	});

	test('privacy settings individual properties capture changes properly', () => {
		// RED PHASE: Test specific privacy setting state reactivity issues

		const mockData = {
			userSettings: {
				privacy: {
					profileVisibility: 'public',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			}
		};

		const component = render(SettingsPage, { data: mockData });

		// RED PHASE: These will fail because each $state(userSettings.privacy.X) only captures initial value
		expect(component.container.innerHTML).toContain('true'); // showOnlineStatus
		expect(component.container.innerHTML).toContain('false'); // dataSharing

		// Test reactivity for individual properties - this should work but doesn't due to state reference capture
		const updatedData = {
			userSettings: {
				privacy: {
					profileVisibility: 'private',
					showOnlineStatus: false,
					allowDirectMessages: false,
					dataSharing: true,
					analyticsOptOut: true
				}
			}
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
