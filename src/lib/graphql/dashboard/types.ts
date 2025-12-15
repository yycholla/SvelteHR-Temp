/**
 * TypeScript Types for Dashboard Components
 */
export interface DashboardMetric {
	id: string;
	title: string;
	value: string | number;
	change?: number;
	trend?: 'up' | 'down' | 'stable';
	icon?: string;
	color?: string;
}

export interface ActivityItem {
	id: string;
	type: 'leave_request' | 'employee_update' | 'system_event' | 'review' | 'goal';
	title: string;
	description: string;
	timestamp: string;
	user?: {
		id: string;
		name: string;
		avatar?: string;
	};
	severity?: 'low' | 'medium' | 'high';
	actionUrl?: string;
}

export interface UpcomingEvent {
	id: string;
	title: string;
	description?: string;
	date: string;
	time?: string;
	type: 'meeting' | 'deadline' | 'review' | 'birthday' | 'anniversary';
	priority: 'low' | 'medium' | 'high';
	attendees?: string[];
	location?: string;
}
