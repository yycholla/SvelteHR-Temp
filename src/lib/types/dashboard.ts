// Dashboard Types

export interface DashboardUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	isActive: boolean;
	departmentId?: string;
}

export interface DashboardDepartment {
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

export interface DashboardMetrics {
	attendanceRate: number;
	pendingRequests: number;
	taskCount: number;
	remainingVacationDays: number;
}

export interface ActivityLog {
	id: string;
	action: string;
	resourceType: string;
	resourceId: string;
	details: any;
	createdAt: string;
}

export interface DashboardData {
	user: {
		id: string;
		email: string;
		displayName: string;
		roles: string[];
	};
	userSession: {
		userId: string;
		userEmail: string;
		roles: string[];
		accessToken: string;
	};
	dashboardData: {
		metrics: DashboardMetrics;
		activities: ActivityLog[];
		tasks: Task[];
		events: any[]; // Define specific event type if needed
	};
	dashboardMetrics: any[]; // Legacy/Specific metrics array
	recentActivities: ActivityLog[];
	upcomingEvents: any[];
	quickActions: any[];
	preferences: {
		selectedPeriod: string;
		viewMode: string;
		theme: string;
		showWelcome: boolean;
	};
	permissions: string[];
	userPerms: any;
	canManageUsers: boolean;
	canViewReports: boolean;
	canApproveLeave: boolean;
	weatherPromise: Promise<string | null>;
	loadedAt: string;
	error?: {
		message: string;
		details: string;
		retryable: boolean;
	};
}
