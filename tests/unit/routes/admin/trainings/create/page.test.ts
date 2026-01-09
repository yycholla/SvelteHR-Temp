import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Page from '$routes/admin/trainings/create/+page.svelte';

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

// Define types based on the component's expected props structure
// These match the ActionData type inferred from the fail() calls in +page.server.ts
interface FormValues {
	title: string | undefined;
	description: string | undefined;
	startDate: string | undefined;
	endDate: string | undefined;
	isActive: boolean;
	metaTitle: string | undefined;
	metaDescription: string | undefined;
}

interface FormData {
	error: string;
	values: FormValues;
}

interface User {
	id: string;
	email: string;
	display_name?: string;
	displayName?: string;
	role?: string;
	first_name?: string;
	last_name?: string;
	firstName?: string;
	lastName?: string;
	department_id?: string;
	departmentId?: string;
	department_name?: string;
	departmentName?: string;
	full_name?: string;
	fullName?: string;
	job_title?: string;
	jobTitle?: string;
	username?: string;
	profile_image?: string;
	profileImage?: string;
	job_information?: {
		department?: {
			name?: string;
		};
	};
}

interface Notification {
	id: string;
	title: string;
	message: string;
	type: string;
	isRead: boolean;
	createdAt: string;
	actionUrl?: string;
}

interface PageData {
	user: User;
	roles: string[];
	permissions: string[];
	isAdmin: boolean;
	notifications: Notification[];
	systemName: string;
	meta: {
		title: string;
	};
}

interface ComponentProps {
	form: FormData | null;
	data: PageData;
}

// Helper to create mock PageData
function createMockPageData(): PageData {
	return {
		user: {
			id: 'test-user-id',
			email: 'test@example.com',
			displayName: 'Test User',
			fullName: 'Test User'
		},
		roles: ['Admin'],
		permissions: ['*'],
		isAdmin: true,
		notifications: [],
		systemName: 'MountainHR',
		meta: {
			title: 'Create Training Module'
		}
	};
}

describe('Create Training Page', () => {
	it('renders the create training form correctly', () => {
		const props: ComponentProps = {
			form: null,
			data: createMockPageData()
		};
		const { container } = render(Page, { props });

		// Check for key elements by text content to avoid JSDOM accessibility computation issues
		expect(container.textContent).toContain('Create Training');
		expect(container.textContent).toContain('Title');
		expect(container.textContent).toContain('Description');
		expect(container.textContent).toContain('Start Date');
		expect(container.textContent).toContain('End Date');
		expect(container.textContent).toContain('Active Status');
	});

	it('displays error message when form has error', () => {
		const props: ComponentProps = {
			form: {
				error: 'Submission failed',
				values: {
					title: undefined,
					description: undefined,
					startDate: undefined,
					endDate: undefined,
					isActive: false,
					metaTitle: undefined,
					metaDescription: undefined
				}
			},
			data: createMockPageData()
		};
		render(Page, { props });
		expect(screen.getByText('Submission failed')).toBeTruthy();
	});

	it('pre-fills values when form has values (e.g. after error)', () => {
		const values: FormValues = {
			title: 'Test Training',
			description: 'Test Description',
			startDate: '2023-01-01T10:00',
			endDate: '2023-01-02T10:00',
			isActive: true,
			metaTitle: '',
			metaDescription: ''
		};

		const props: ComponentProps = {
			form: { error: 'Some error', values },
			data: createMockPageData()
		};
		render(Page, { props });

		expect(screen.getByDisplayValue('Test Training')).toBeTruthy();
		expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
	});
});
