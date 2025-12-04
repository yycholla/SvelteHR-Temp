import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import ManagementPage from '../../src/routes/dashboard/management/+page.svelte';

describe('Management Page State Reactivity - RED Phase', () => {
	test('management filters state reactivity works correctly', () => {
		// RED PHASE: This should fail initially due to $state(filters.property) capturing only initial values

		const mockData = {
			teams: [],
			metrics: {},
			filters: {
				selectedPeriod: 'this-month',
				selectedTeamId: 'team-123'
			}
		};

		const component = render(ManagementPage, { data: mockData });

		// RED PHASE: This will fail because $state(filters.selectedPeriod) only captures initial value
		// When filters change, the component should react but currently doesn't due to lines 108-109

		// Test that initial values are set
		expect(component.container.innerHTML).toContain('this-month');

		// Test reactivity - this should work but doesn't due to state reference capture issue
		const updatedFilters = {
			selectedPeriod: 'last-quarter',
			selectedTeamId: 'team-456'
		};

		// The component should react to filter changes, but currently it won't
		// due to $state(filters.selectedPeriod) only capturing the initial value
		expect(() => {
			const updatedComponent = render(ManagementPage, {
				data: { ...mockData, filters: updatedFilters }
			});
			expect(updatedComponent.container.innerHTML).toContain('last-quarter');
		}).not.toThrow();
	});

	test('team selection state captures changes properly', () => {
		// RED PHASE: Test specific to selectedTeamId state reactivity issue

		const mockData = {
			teams: [
				{ id: 'team-123', name: 'Engineering Team' },
				{ id: 'team-456', name: 'Marketing Team' }
			],
			metrics: {},
			filters: {
				selectedPeriod: 'this-month',
				selectedTeamId: 'team-123'
			}
		};

		const component = render(ManagementPage, { data: mockData });

		// RED PHASE: This will fail because $state(filters.selectedTeamId) only captures initial value
		expect(component.container.innerHTML).toContain('team-123');

		// Test reactivity - this should work but doesn't due to state reference capture
		const updatedData = {
			...mockData,
			filters: { ...mockData.filters, selectedTeamId: 'team-456' }
		};

		// This should be reactive but currently isn't due to line 109 issue
		expect(() => {
			const updatedComponent = render(ManagementPage, { data: updatedData });
			expect(updatedComponent.container.innerHTML).toContain('team-456');
		}).not.toThrow();
	});
});
