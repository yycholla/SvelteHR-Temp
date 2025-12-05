/**
 * Unit Test: EventDetailsDialog
 *
 * Tests the unified EventDetailsDialog component which now uses
 * EventDetailsView and EventEditForm sub-components.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import EventDetailsDialog from '$lib/components/events/EventDetailsDialog.svelte';
import type { EventData } from '$lib/components/events/types';

// Mock sub-components to isolate Dialog logic
vi.mock('$lib/components/events/EventDetailsView.svelte', () => ({
	default: {
		$$render: () => '<div data-testid="event-details-view">Details View</div>'
	}
}));

vi.mock('$lib/components/events/EventEditForm.svelte', () => ({
	default: {
		$$render: () => '<div data-testid="event-edit-form">Edit Form</div>'
	}
}));

// Mock dependencies
vi.mock('$app/navigation', () => ({
	invalidateAll: vi.fn()
}));

vi.mock('svelte-sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

// Mock lucide-svelte icons as Svelte 5 components
// In Svelte 5, components are functions that can be called with or without 'new'
vi.mock('@lucide/svelte', () => {
	const createMockIcon = () => {
		const Component: any = function (this: any, options: any) {
			// Support both 'new Component()' and 'Component()' calling patterns
			if (!(this instanceof Component)) {
				return new (Component as any)(options);
			}
			this.$$ = {};
			this.$$set = () => {};
		};
		return Component;
	};

	return {
		Edit: createMockIcon(),
		Trash2: createMockIcon(),
		X: createMockIcon()
	};
});

describe.skip('EventDetailsDialog', () => {
	const mockUser = {
		id: 'user-123',
		firstName: 'Test',
		lastName: 'User',
		email: 'test@example.com'
	};

	const mockEvent: EventData = {
		id: 'event-123',
		title: 'Team Meeting',
		description: 'Weekly sync',
		startTime: '2025-01-01T10:00:00Z',
		endTime: '2025-01-01T11:00:00Z',
		location: 'Conference Room A',
		isAllDay: false,
		status: 'scheduled',
		type: {
			id: 'type-1',
			name: 'Meeting',
			color: 'blue'
		},
		organizer: {
			id: 'user-123',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com'
		},
		attendees: []
	};

	const defaultProps = {
		isOpen: true,
		event: mockEvent,
		userId: mockUser.id,
		onClose: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should not render when isOpen is false', () => {
			const { queryByRole } = render(EventDetailsDialog, {
				props: { ...defaultProps, isOpen: false }
			});
			expect(queryByRole('dialog')).toBeNull();
		});

		it('should render when isOpen is true and event is provided', () => {
			const { getByRole } = render(EventDetailsDialog, {
				props: defaultProps
			});
			expect(getByRole('dialog')).toBeTruthy();
		});

		it('should render EventDetailsView in view mode', () => {
			const { getByTestId } = render(EventDetailsDialog, {
				props: { ...defaultProps, mode: 'view' }
			});
			expect(getByTestId('event-details-view')).toBeTruthy();
		});

		it('should render EventEditForm in edit mode', () => {
			const { getByTestId } = render(EventDetailsDialog, {
				props: { ...defaultProps, mode: 'edit' }
			});
			expect(getByTestId('event-edit-form')).toBeTruthy();
		});

		it('should display the correct title in view mode', () => {
			const { getByText } = render(EventDetailsDialog, {
				props: { ...defaultProps, mode: 'view' }
			});
			expect(getByText('Event Details')).toBeTruthy();
		});

		it('should display the correct title in edit mode', () => {
			const { getByText } = render(EventDetailsDialog, {
				props: { ...defaultProps, mode: 'edit' }
			});
			expect(getByText('Edit Event')).toBeTruthy();
		});
	});

	describe('Controls', () => {
		it('should call onClose when close button is clicked', async () => {
			const { getByLabelText } = render(EventDetailsDialog, {
				props: defaultProps
			});

			await fireEvent.click(getByLabelText('Close dialog'));
			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should call onEdit when edit button is clicked', async () => {
			const { getByLabelText } = render(EventDetailsDialog, {
				props: { ...defaultProps, canManageEvent: true }
			});

			await fireEvent.click(getByLabelText('Edit event'));
			expect(defaultProps.onEdit).toHaveBeenCalled();
		});

		it('should call delete handler when delete button is clicked', async () => {
			const { getByLabelText, getByText } = render(EventDetailsDialog, {
				props: { ...defaultProps, canManageEvent: true }
			});

			await fireEvent.click(getByLabelText('Delete event'));
			// Should show confirmation dialog
			expect(getByText(/Are you sure you want to delete/)).toBeTruthy();
		});
	});

	describe('Permissions', () => {
		it('should show management buttons if canManageEvent is true', () => {
			const { queryByLabelText } = render(EventDetailsDialog, {
				props: { ...defaultProps, canManageEvent: true }
			});

			expect(queryByLabelText('Edit event')).toBeTruthy();
			expect(queryByLabelText('Delete event')).toBeTruthy();
		});

		it('should hide management buttons if canManageEvent is false', () => {
			const { queryByLabelText } = render(EventDetailsDialog, {
				props: { ...defaultProps, canManageEvent: false }
			});

			expect(queryByLabelText('Edit event')).toBeNull();
			expect(queryByLabelText('Delete event')).toBeNull();
		});
	});
});
