// EventCalendar.stories.ts
// Feature: 019-we-need-to - Phase 4
// Storybook stories for EventCalendar component

import type { Meta, StoryObj } from '@storybook/svelte';
import EventCalendar from './EventCalendar.svelte';

const meta = {
	title: 'Feature 019/Events/EventCalendar',
	component: EventCalendar,
	tags: ['autodocs'],
	argTypes: {
		events: {
			control: 'object',
			description: 'Array of event objects to display'
		},
		userId: {
			control: 'text',
			description: 'Current user ID for RSVP status determination'
		},
		canManageEvents: {
			control: 'boolean',
			description: 'Whether user can create and edit events'
		},
		visibilityFilter: {
			control: 'select',
			options: ['all', 'company', 'department', 'specific'],
			description: 'Filter events by visibility type'
		},
		onEventClick: { action: 'eventClicked' },
		onDateClick: { action: 'dateClicked' },
		onEventDrop: { action: 'eventDropped' }
	}
} satisfies Meta<EventCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock event data
const mockEvents = [
	{
		id: '1',
		title: 'Team Meeting',
		startTime: new Date(2025, 9, 15, 10, 0).toISOString(),
		endTime: new Date(2025, 9, 15, 11, 0).toISOString(),
		isAllDay: false,
		visibilityType: 'company',
		eventType: 'meeting',
		organizerId: 'user1',
		organizerName: 'John Doe',
		attendees: [
			{ employeeId: 'current-user', rsvpStatus: 'accepted' },
			{ employeeId: 'user2', rsvpStatus: 'accepted' }
		]
	},
	{
		id: '2',
		title: 'All Hands Meeting',
		startTime: new Date(2025, 9, 20, 14, 0).toISOString(),
		endTime: new Date(2025, 9, 20, 15, 30).toISOString(),
		isAllDay: false,
		visibilityType: 'company',
		eventType: 'meeting',
		organizerId: 'user1',
		organizerName: 'Jane Smith',
		attendees: [
			{ employeeId: 'current-user', rsvpStatus: 'pending' },
			{ employeeId: 'user2', rsvpStatus: 'accepted' }
		]
	},
	{
		id: '3',
		title: 'Company Holiday',
		startTime: new Date(2025, 9, 25).toISOString(),
		endTime: new Date(2025, 9, 25).toISOString(),
		isAllDay: true,
		visibilityType: 'company',
		eventType: 'holiday',
		organizerId: 'admin',
		organizerName: 'HR Admin',
		attendees: [{ employeeId: 'current-user', rsvpStatus: 'no_response' }]
	},
	{
		id: '4',
		title: 'Training Workshop',
		startTime: new Date(2025, 9, 18, 9, 0).toISOString(),
		endTime: new Date(2025, 9, 18, 17, 0).toISOString(),
		isAllDay: false,
		visibilityType: 'department',
		eventType: 'training',
		organizerId: 'user3',
		organizerName: 'Training Lead',
		attendees: [
			{ employeeId: 'current-user', rsvpStatus: 'tentative' },
			{ employeeId: 'user2', rsvpStatus: 'accepted' }
		]
	},
	{
		id: '5',
		title: 'Client Presentation',
		startTime: new Date(2025, 9, 22, 13, 0).toISOString(),
		endTime: new Date(2025, 9, 22, 14, 0).toISOString(),
		isAllDay: false,
		visibilityType: 'specific',
		eventType: 'meeting',
		organizerId: 'user1',
		organizerName: 'Sales Manager',
		attendees: [
			{ employeeId: 'current-user', rsvpStatus: 'declined' },
			{ employeeId: 'user2', rsvpStatus: 'accepted' }
		]
	},
	{
		id: '6',
		title: 'Department Social',
		startTime: new Date(2025, 9, 28, 18, 0).toISOString(),
		endTime: new Date(2025, 9, 28, 21, 0).toISOString(),
		isAllDay: false,
		visibilityType: 'department',
		eventType: 'social',
		organizerId: 'user4',
		organizerName: 'Social Committee',
		attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
	}
];

// Story 1: Default calendar view
export const Default: Story = {
	args: {
		events: mockEvents,
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 2: Manager view with event management
export const ManagerView: Story = {
	args: {
		events: mockEvents,
		userId: 'current-user',
		canManageEvents: true,
		visibilityFilter: 'all'
	}
};

// Story 3: Empty calendar
export const Empty: Story = {
	args: {
		events: [],
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 4: Company events only
export const CompanyEventsOnly: Story = {
	args: {
		events: mockEvents,
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'company'
	}
};

// Story 5: Department events only
export const DepartmentEventsOnly: Story = {
	args: {
		events: mockEvents,
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'department'
	}
};

// Story 6: Single event
export const SingleEvent: Story = {
	args: {
		events: [mockEvents[0]],
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 7: All accepted events
export const AllAccepted: Story = {
	args: {
		events: mockEvents.map((e) => ({
			...e,
			attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
		})),
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 8: All declined events
export const AllDeclined: Story = {
	args: {
		events: mockEvents.map((e) => ({
			...e,
			attendees: [{ employeeId: 'current-user', rsvpStatus: 'declined' }]
		})),
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 9: All tentative events
export const AllTentative: Story = {
	args: {
		events: mockEvents.map((e) => ({
			...e,
			attendees: [{ employeeId: 'current-user', rsvpStatus: 'tentative' }]
		})),
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 10: All pending events
export const AllPending: Story = {
	args: {
		events: mockEvents.map((e) => ({
			...e,
			attendees: [{ employeeId: 'current-user', rsvpStatus: 'pending' }]
		})),
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 11: All-day events only
export const AllDayEventsOnly: Story = {
	args: {
		events: mockEvents
			.filter((e) => e.isAllDay)
			.concat([
				{
					id: '7',
					title: 'Conference',
					startTime: new Date(2025, 9, 17).toISOString(),
					endTime: new Date(2025, 9, 19).toISOString(),
					isAllDay: true,
					visibilityType: 'company',
					eventType: 'conference',
					organizerId: 'admin',
					organizerName: 'Event Coordinator',
					attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
				}
			]),
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};

// Story 12: Many events (busy calendar)
export const BusyCalendar: Story = {
	args: {
		events: [
			...mockEvents,
			{
				id: '8',
				title: 'Morning Standup',
				startTime: new Date(2025, 9, 16, 9, 0).toISOString(),
				endTime: new Date(2025, 9, 16, 9, 30).toISOString(),
				isAllDay: false,
				visibilityType: 'department',
				eventType: 'meeting',
				organizerId: 'user1',
				organizerName: 'Team Lead',
				attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
			},
			{
				id: '9',
				title: 'Project Review',
				startTime: new Date(2025, 9, 19, 10, 0).toISOString(),
				endTime: new Date(2025, 9, 19, 11, 30).toISOString(),
				isAllDay: false,
				visibilityType: 'company',
				eventType: 'meeting',
				organizerId: 'user2',
				organizerName: 'Project Manager',
				attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
			},
			{
				id: '10',
				title: 'Team Lunch',
				startTime: new Date(2025, 9, 21, 12, 0).toISOString(),
				endTime: new Date(2025, 9, 21, 13, 0).toISOString(),
				isAllDay: false,
				visibilityType: 'department',
				eventType: 'social',
				organizerId: 'user3',
				organizerName: 'Social Lead',
				attendees: [{ employeeId: 'current-user', rsvpStatus: 'accepted' }]
			}
		],
		userId: 'current-user',
		canManageEvents: false,
		visibilityFilter: 'all'
	}
};
