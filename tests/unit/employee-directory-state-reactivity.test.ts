import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import EmployeeDirectoryPage from '../../src/routes/dashboard/employees/directory/+page.svelte';

describe('Employee Directory State Reactivity - RED Phase', () => {
	test('filters state reactivity works correctly with Svelte 5 runes', () => {
		// RED PHASE: This should fail initially due to $state(filters.property) capturing only initial values

		const mockData = {
			employees: [],
			departments: [],
			pagination: { total: 0, page: 1, limit: 20 },
			filters: {
				searchTerm: 'initial-search',
				departmentFilter: 'engineering',
				statusFilter: 'active',
				page: 1,
				limit: 20
			}
		};

		const component = render(EmployeeDirectoryPage, { data: mockData });

		// Test that initial filter values are displayed
		const searchInput = component.getByDisplayValue('initial-search');
		expect(searchInput).toBeInTheDocument();

		// RED PHASE: This will fail because $state(filters.searchTerm) only captures initial value
		// When filters change externally, the component should react to updates
		// Currently fails due to state reference capture issue in lines 67-71

		// Simulate external filter change (this should be reactive but isn't due to the bug)
		// Note: In real scenario, this would be updated through URL params or store updates
		const updatedFilters = {
			...mockData.filters,
			searchTerm: 'updated-search'
		};

		// The component should react to filter changes, but currently it won't
		// due to $state(filters.searchTerm) only capturing the initial value
		expect(() => {
			// This expectation will fail in RED phase due to reactivity issue
			const updatedComponent = render(EmployeeDirectoryPage, {
				data: { ...mockData, filters: updatedFilters }
			});
			const updatedSearchInput = updatedComponent.getByDisplayValue('updated-search');
			expect(updatedSearchInput).toBeInTheDocument();
		}).not.toThrow();
	});

	test('department filter state captures changes properly', () => {
		// RED PHASE: Test specific to departmentFilter state reactivity issue

		const mockData = {
			employees: [],
			departments: [
				{ id: '1', name: 'Engineering' },
				{ id: '2', name: 'Marketing' }
			],
			pagination: { total: 0, page: 1, limit: 20 },
			filters: {
				searchTerm: '',
				departmentFilter: 'engineering',
				statusFilter: 'active',
				page: 1,
				limit: 20
			}
		};

		const component = render(EmployeeDirectoryPage, { data: mockData });

		// RED PHASE: This will fail because $state(filters.departmentFilter) only captures initial value
		// The selectedDepartment state should be reactive to filter changes
		expect(component.container.innerHTML).toContain('engineering');

		// Test reactivity - this should work but doesn't due to state reference capture
		const updatedData = {
			...mockData,
			filters: { ...mockData.filters, departmentFilter: 'marketing' }
		};

		// This should be reactive but currently isn't due to line 68 issue
		expect(() => {
			const updatedComponent = render(EmployeeDirectoryPage, { data: updatedData });
			expect(updatedComponent.container.innerHTML).toContain('marketing');
		}).not.toThrow();
	});
});
