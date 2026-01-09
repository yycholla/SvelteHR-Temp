import type { EventVisibilityType, RsvpStatus } from './enums';

/**
 * Grouped data for display (e.g., activities by date)
 */
export interface GroupedItems<T> {
	groupKey: string;
	groupLabel: string;
	items: T[];
	count: number;
}

/**
 * Badge configuration for status/priority display
 */
export interface BadgeConfig {
	text: string;
	color: string;
	icon?: string;
}

/**
 * Calendar event for FullCalendar
 */
export interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end: string;
	allDay?: boolean;
	backgroundColor?: string;
	borderColor?: string;
	extendedProps?: {
		location?: string;
		rsvpStatus?: RsvpStatus;
		visibilityType?: EventVisibilityType;
		isOrganizer?: boolean;
	};
}
