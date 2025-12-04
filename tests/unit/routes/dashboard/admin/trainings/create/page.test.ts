import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Page from '$routes/dashboard/admin/trainings/create/+page.svelte';

// Mock logic for standard SvelteKit imports if needed,
// but standard component testing usually works fine for UI rendering.
// We might need to mock $app/forms for enhance.

vi.mock('$app/forms', () => ({
	enhance: () => ({
		destroy: () => {}
	})
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Create Training Page', () => {
	it('renders the create training form correctly', () => {
		const { container } = render(Page, { form: null });

		// Check for key elements by text content to avoid JSDOM accessibility computation issues
		expect(container.textContent).toContain('Create Training');
		expect(container.textContent).toContain('Title');
		expect(container.textContent).toContain('Description');
		expect(container.textContent).toContain('Start Date');
		expect(container.textContent).toContain('End Date');
		expect(container.textContent).toContain('Active Status');
	});

	it('displays error message when form has error', () => {
		render(Page, { form: { error: 'Submission failed', values: {} } });
		expect(screen.getByText('Submission failed')).toBeTruthy();
	});

	it('pre-fills values when form has values (e.g. after error)', () => {
		const values = {
			title: 'Test Training',
			description: 'Test Description',
			startDate: '2023-01-01T10:00',
			endDate: '2023-01-02T10:00'
		};

		render(Page, { form: { error: 'Some error', values } });

		expect(screen.getByDisplayValue('Test Training')).toBeTruthy();
		expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
	});
});
