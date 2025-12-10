// Dashboard Type Definitions

export interface User {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	isActive?: boolean;
	departmentId?: string;
}

export interface Department {
	id: string;
	name: string;
	managerId?: string;
}

export interface AttendanceRecord {
	id: string;
	date: string;
	clockIn: string;
	clockOut: string | null;
	hoursWorked: number | null;
	status: string;
}

export interface LeaveType {
	id: string;
	name: string;
	color: string;
}

export interface LeaveRequest {
	id: string;
	leaveType: LeaveType | null;
	startDate: string;
	endDate: string;
	daysRequested: number;
	status: string;
	createdAt: string;
}

export interface EmployeeGoal {
	id: string;
	employeeId: string;
	goalTitle: string;
	goalDescription: string | null;
	status: string;
	targetDate: string | null;
	createdAt: string;
}

export interface Task {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	dueDate: string | null;
	createdAt: string;
}

export interface DashboardActivity {
	id: string;
	title: string;
	description: string;
	icon: string;
	color: string;
	type: string;
	timestamp: string;
	user: { id: string; name: string };
}

export interface ActivityLog {
	id: string;
	action: string;
	resourceType: string;
	resourceId: string;
	details: Record<string, unknown>;
	createdAt: string;
	userByEmployeeId?: User;
}

export interface SystemAuditLog extends ActivityLog {
	isRollback?: boolean;
}

export interface RollbackRequest {
	id: string;
	entityType: string;
	status: string;
	reason: string;
	createdAt: string;
	requester: User | null;
}

export interface RollbackStats {
	rollbackRequestsCount: number;
}

export interface DashboardEvent {
	id: string;
	title: string;
	description: string;
	type: string;
	date: string;
	time: string;
	location: string;
	icon: string;
	color: string;
	priority: string;
	organizer: string;
	isPublic: boolean;
	rsvpStatus: string;
}

export interface ApiEvent {
	id: string;
	title: string;
	description: string | null;
	eventType: string;
	startTime: string;
	endTime: string;
	allDay: boolean;
	location: string | null;
	isPublic: boolean;
	status: string;
	color: string | null;
	organizerId: string;
	attendees: Array<{ id: string; employeeId: string; responseStatus: string }>;
	userByOrganizerId?: User;
}
