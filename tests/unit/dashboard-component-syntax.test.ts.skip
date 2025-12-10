import { render } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import DashboardPage from '../../src/routes/dashboard/+page.svelte';

describe('Dashboard Component Syntax Compatibility - RED Phase', () => {
	test('dynamic component rendering works without deprecated svelte:component', () => {
		// RED PHASE: This should fail initially due to <svelte:component> deprecation warnings
		// Mock console.warn to capture deprecation warnings
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const mockData = {
			metrics: [
				{
					title: 'Test Metric',
					value: '100',
					icon: vi.fn(() => null) // Mock icon component
				}
			],
			activities: [
				{
					type: 'success',
					icon: vi.fn(() => null),
					description: 'Test activity'
				}
			]
		};

		try {
			const component = render(DashboardPage, { data: mockData });

			// Test that components render properly
			expect(component.getByText('Test Metric')).toBeInTheDocument();

			// RED PHASE: This will fail initially due to <svelte:component> deprecation warnings
			expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('svelte:component'));
		} finally {
			consoleWarnSpy.mockRestore();
		}
	});

	test('metric icons render dynamically without svelte:component deprecation', () => {
		// RED PHASE: This test specifically targets the metric icon rendering issue
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const mockData = {
			metrics: [
				{
					title: 'Active Employees',
					value: '1,234',
					icon: vi.fn(() => null)
				},
				{
					title: 'Departments',
					value: '12',
					icon: vi.fn(() => null)
				}
			],
			activities: []
		};

		try {
			render(DashboardPage, { data: mockData });

			// RED PHASE: This will fail because dashboard/+page.svelte line 123 uses <svelte:component>
			expect(consoleWarnSpy).not.toHaveBeenCalledWith(
				expect.stringMatching(/svelte:component.*is deprecated/)
			);
		} finally {
			consoleWarnSpy.mockRestore();
		}
	});
});
