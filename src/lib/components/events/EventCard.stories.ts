// EventCard Storybook Stories
// Feature: 019-we-need-to - Task T019

import type { Meta, StoryObj } from '@storybook/svelte';
import EventCard from './EventCard.svelte';
import type { Event } from '$lib/graphql/types';

// Mock event data
const baseEvent: Event = {
	id: '1',
	title: 'Q4 Planning Meeting',
	description: 'Quarterly planning session to review goals, budgets, and strategic initiatives for the upcoming quarter.',
	type: 'meeting',
	startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
	endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
	allDay: false,
	location: 'Conference Room A',
	organizerId: 'org-1',
	organizer: {
		id: 'org-1',
		displayName: 'Sarah Johnson',
		email: 'sarah.johnson@company.com',
		jobTitle: 'VP of Operations'
	},
	departmentId: 'dept-1',
	department: {
		id: 'dept-1',
		name: 'Operations'
	},
	visibilityType: 'department',
	status: 'scheduled',
	color: '#3b82f6',
	reminderMinutes: 30,
	notes: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	eventAttendees: {
		nodes: [
			{
				id: 'att-1',
				eventId: '1',
				employeeId: 'user-1',
				employee: {
					id: 'user-1',
					displayName: 'John Doe',
					email: 'john.doe@company.com'
				},
				responseStatus: 'accepted',
				isOrganizer: false,
				isRequired: true,
				respondedAt: new Date().toISOString(),
				createdAt: new Date().toISOString()
			},
			{
				id: 'att-2',
				eventId: '1',
				employeeId: 'user-2',
				employee: {
					id: 'user-2',
					displayName: 'Jane Smith',
					email: 'jane.smith@company.com'
				},
				responseStatus: 'tentative',
				isOrganizer: false,
				isRequired: true,
				respondedAt: null,
				createdAt: new Date().toISOString()
			},
			{
				id: 'att-3',
				eventId: '1',
				employeeId: 'user-3',
				employee: {
					id: 'user-3',
					displayName: 'Mike Wilson',
					email: 'mike.wilson@company.com'
				},
				responseStatus: 'pending',
				isOrganizer: false,
				isRequired: false,
				respondedAt: null,
				createdAt: new Date().toISOString()
			}
		]
	}
};

const meta = {
	title: 'Events/EventCard',
	component: EventCard,
	tags: ['autodocs'],
	argTypes: {
		event: {
			control: 'object',
			description: 'Event object with all event details'
		},
		userId: {
			control: 'text',
			description: 'Current user ID to show RSVP status'
		},
		showRsvp: {
			control: 'boolean',
			description: 'Show RSVP status indicator'
		},
		compact: {
			control: 'boolean',
			description: 'Compact view with minimal details'
		},
		onClick: {
			action: 'clicked',
			description: 'Click handler for the card'
		}
	}
} satisfies Meta<EventCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default event card
export const Default: Story = {
	args: {
		event: baseEvent,
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Event with accepted RSVP
export const AcceptedRSVP: Story = {
	args: {
		event: baseEvent,
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Event with declined RSVP
export const DeclinedRSVP: Story = {
	args: {
		event: {
			...baseEvent,
			eventAttendees: {
				nodes: [
					{
						...baseEvent.eventAttendees!.nodes[0],
						employeeId: 'user-1',
						responseStatus: 'declined'
					}
				]
			}
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Event with pending RSVP
export const PendingRSVP: Story = {
	args: {
		event: {
			...baseEvent,
			eventAttendees: {
				nodes: [
					{
						...baseEvent.eventAttendees!.nodes[0],
						employeeId: 'user-1',
						responseStatus: 'pending'
					}
				]
			}
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Compact view
export const Compact: Story = {
	args: {
		event: baseEvent,
		userId: 'user-1',
		showRsvp: true,
		compact: true
	}
};

// Without RSVP status
export const WithoutRSVP: Story = {
	args: {
		event: baseEvent,
		userId: undefined,
		showRsvp: false,
		compact: false
	}
};

// Company-wide event
export const CompanyWide: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Company All-Hands Meeting',
			type: 'company_event',
			visibilityType: 'company',
			color: '#8b5cf6',
			description: 'Monthly all-hands meeting to share company updates and celebrate team achievements.'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Training event
export const Training: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Leadership Development Workshop',
			type: 'training',
			color: '#10b981',
			allDay: true,
			location: 'Training Center',
			description: 'Full-day workshop focused on developing leadership skills and management techniques.'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Social event
export const Social: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Team Happy Hour',
			type: 'social',
			status: 'scheduled',
			color: '#f59e0b',
			location: 'The Local Pub',
			description: 'Monthly team social event to unwind and connect with colleagues.'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Ongoing event
export const Ongoing: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Sprint Planning',
			startDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Started 30 mins ago
			endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Ends in 1 hour
			status: 'ongoing'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Completed event
export const Completed: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Q3 Review Meeting',
			startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
			endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
			status: 'completed'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Cancelled event
export const Cancelled: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Budget Review (Cancelled)',
			status: 'cancelled',
			color: '#ef4444'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// All-day event
export const AllDay: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Company Holiday',
			type: 'holiday',
			allDay: true,
			location: null,
			color: '#ec4899',
			description: 'Company-wide holiday - offices closed.'
		},
		userId: 'user-1',
		showRsvp: false,
		compact: false
	}
};

// No location
export const NoLocation: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Virtual Standup',
			location: null,
			description: 'Daily team standup via video conference.'
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Many attendees
export const ManyAttendees: Story = {
	args: {
		event: {
			...baseEvent,
			title: 'Annual Company Meeting',
			type: 'company_event',
			eventAttendees: {
				nodes: Array.from({ length: 50 }, (_, i) => ({
					id: `att-${i}`,
					eventId: '1',
					employeeId: `user-${i}`,
					employee: {
						id: `user-${i}`,
						displayName: `Employee ${i + 1}`,
						email: `employee${i + 1}@company.com`
					},
					responseStatus: 'accepted' as const,
					isOrganizer: false,
					isRequired: true,
					respondedAt: new Date().toISOString(),
					createdAt: new Date().toISOString()
				}))
			}
		},
		userId: 'user-1',
		showRsvp: true,
		compact: false
	}
};

// Clickable card
export const Clickable: Story = {
	args: {
		event: baseEvent,
		userId: 'user-1',
		showRsvp: true,
		compact: false,
		onClick: () => alert('Event card clicked!')
	}
};
