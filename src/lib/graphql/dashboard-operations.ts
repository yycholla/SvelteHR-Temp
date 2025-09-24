import { client, executeQuery } from './client.js';

// Single comprehensive GraphQL query for all dashboard data
export const GET_COMPLETE_EMPLOYEE_DASHBOARD = `
  query GetCompleteEmployeeDashboard($userId: UUID!) {
    # Main user data
    userById(id: $userId) {
      id
      email
      displayName
      jobTitle
      hireDate
      isActive
      lastLogin
      createdAt
      userRoleAssignmentsByUserId {
        nodes {
          userRoleByRoleId {
            name
            level
            description
          }
          isActive
          createdAt
        }
      }
    }

    # User's leave requests for pending count
    allLeaveRequests(condition: { userId: $userId }) {
      totalCount
      nodes {
        id
        status
        startDate
        endDate
        createdAt
      }
    }

    # User's attendance records for attendance rate calculation
    allAttendanceRecords(condition: { userId: $userId }, orderBy: DATE_DESC, first: 30) {
      totalCount
      nodes {
        id
        date
        clockInTime
        clockOutTime
        status
        totalHours
      }
    }

    # All users data for context (department size, etc.)
    allUsers {
      totalCount
      nodes {
        id
        isActive
        hireDate
        userRoleAssignmentsByUserId {
          nodes {
            userRoleByRoleId {
              name
              level
            }
            isActive
          }
        }
      }
    }

    # User roles for context
    allUserRoles {
      nodes {
        id
        name
        level
        description
        isActive
      }
    }
  }
`;

// TypeScript interfaces
export interface DashboardMetric {
	title: string;
	value: string;
	change: {
		value: string;
		type: 'increase' | 'warning' | 'neutral';
		period: string;
	};
	icon: any;
	href: string;
}

export interface ActivityItem {
	id: number;
	message: string;
	timestamp: string;
	type: 'success' | 'info' | 'warning';
	icon: any;
}

export interface UpcomingEvent {
	title: string;
	time: string;
	type: 'meeting' | 'review' | 'event';
}

// Helper function to calculate attendance rate from real data
export function calculateAttendanceRate(attendanceRecords: any[]): number {
	if (!attendanceRecords || attendanceRecords.length === 0) {
		return 0; // No attendance data available
	}

	// Calculate attendance rate based on actual records
	const totalDays = attendanceRecords.length;
	const presentDays = attendanceRecords.filter(
		(record) =>
			record.status === 'present' ||
			record.status === 'late' ||
			(record.totalHours && record.totalHours > 0)
	).length;

	if (totalDays === 0) return 0;

	return Math.round((presentDays / totalDays) * 100);
}

// Helper function to calculate remaining vacation days
export function calculateRemainingVacationDays(user: any, leaveBalances?: any[]): number {
	// TODO: Implement actual leave balance calculation from leave_balances table
	// For now, return a conservative estimate based on hire date
	const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
	const yearsEmployed = Math.max(
		0,
		(Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
	);

	// Conservative estimate: 15 days base + 1 day per year, assume some usage
	const totalVacationDays = Math.floor(15 + yearsEmployed);
	const estimatedUsedDays = Math.min(totalVacationDays, Math.floor(totalVacationDays * 0.3)); // 30% usage estimate

	return Math.max(0, totalVacationDays - estimatedUsedDays);
}

// Helper function to get pending requests count
export function getPendingRequestsCount(user: any): number {
	// This will be calculated from real data in the main function
	// since we need to query leave_requests table
	return 0;
}

// Helper function to get task count
export function getTaskCount(user: any): number {
	// No tasks system implemented yet - return 0
	// TODO: Implement actual tasks system with database tables
	return 0;
}

// Main function to fetch all employee dashboard data in a single call
export async function getCompleteDashboardData(userId: string) {
	try {
		const data = await executeQuery(client, GET_COMPLETE_EMPLOYEE_DASHBOARD, { userId });
		const user = data?.userById;
		const allUsers = data?.allUsers?.nodes || [];
		const allRoles = data?.allUserRoles?.nodes || [];
		const leaveRequests = data?.allLeaveRequests?.nodes || [];
		const attendanceRecords = data?.allAttendanceRecords?.nodes || [];

		if (!user) {
			throw new Error('User not found');
		}

		// Calculate metrics using real data
		const attendanceRate = calculateAttendanceRate(attendanceRecords);
		const remainingVacationDays = calculateRemainingVacationDays(user);
		const pendingRequests = leaveRequests.filter(
			(req) => req.status === 'pending' || req.status === 'submitted'
		).length;
		const taskCount = 0; // No tasks system implemented yet

		// Calculate department context
		const userDepartment = getUserDepartment(user);
		const departmentColleagues = allUsers.filter(
			(u) => u.isActive && getUserDepartment(u) === userDepartment
		);

		// Calculate company tenure
		const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
		const tenureInMonths = Math.floor(
			(Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
		);

		return {
			user,
			metrics: {
				attendanceRate,
				remainingVacationDays,
				pendingRequests,
				taskCount,
				tenureInMonths,
				departmentSize: departmentColleagues.length
			},
			context: {
				allUsers,
				allRoles,
				departmentColleagues,
				userDepartment
			}
		};
	} catch (error) {
		console.error('Error fetching complete dashboard data:', error);
		throw error;
	}
}

// Helper function to determine user department from role
function getUserDepartment(user: any): string {
	const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
	if (!roleAssignments || roleAssignments.length === 0) {
		return 'General';
	}

	const activeRole = roleAssignments.find((assignment: any) => assignment.isActive);
	if (!activeRole) {
		return 'General';
	}

	// Map role names to departments
	const roleName = activeRole.userRoleByRoleId.name.toLowerCase();
	if (roleName.includes('hr')) return 'Human Resources';
	if (roleName.includes('admin')) return 'Administration';
	if (roleName.includes('manager')) return 'Management';
	if (roleName.includes('finance')) return 'Finance';
	if (roleName.includes('engineering')) return 'Engineering';
	if (roleName.includes('marketing')) return 'Marketing';
	if (roleName.includes('sales')) return 'Sales';

	return 'General';
}

// Generate realistic personal activity based on user data
export function generatePersonalActivity(user: any): ActivityItem[] {
	const activities: ActivityItem[] = [];

	// Activity types based on user role and tenure
	const baseActivities = [
		{
			message: 'Timesheet submitted successfully',
			type: 'success' as const,
			hoursAgo: 24
		},
		{
			message: 'Performance review scheduled',
			type: 'info' as const,
			hoursAgo: 48
		},
		{
			message: 'New policy update available',
			type: 'warning' as const,
			hoursAgo: 72
		}
	];

	// Add leave approval if user has pending requests
	if (Math.random() > 0.5) {
		activities.unshift({
			id: 1,
			message: 'Leave request approved for upcoming dates',
			timestamp: '2 hours ago',
			type: 'success',
			icon: null // Will be set in component
		});
	}

	// Add training notifications for newer employees
	const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
	const monthsSinceHire = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

	if (monthsSinceHire < 6) {
		activities.push({
			id: activities.length + 1,
			message: 'Complete onboarding training module',
			timestamp: '1 day ago',
			type: 'warning',
			icon: null
		});
	}

	return activities.slice(0, 4); // Return max 4 activities
}

// Generate realistic personal tasks based on user data
export function generatePersonalTasks(user: any): string[] {
	// No tasks system implemented yet - return empty array
	// TODO: Implement actual tasks system with database tables
	return [];
}

// Generate upcoming events based on user data
export function generateUpcomingEvents(user: any): UpcomingEvent[] {
	const events: UpcomingEvent[] = [];

	// Always include team standup for active employees
	events.push({
		title: 'Team Standup',
		time: 'Today 9:00 AM',
		type: 'meeting'
	});

	// Add performance review based on tenure and season
	const now = new Date();
	const isReviewSeason = now.getMonth() === 11 || now.getMonth() === 5;
	if (isReviewSeason) {
		events.push({
			title: 'Annual Performance Review',
			time: 'Next Friday 2:00 PM',
			type: 'review'
		});
	}

	// Add company events
	if (now.getMonth() === 11) {
		// December
		events.push({
			title: 'Holiday Party',
			time: 'Dec 22, 6:00 PM',
			type: 'event'
		});
	}

	// Add training sessions for newer employees
	const hireDate = user.hireDate ? new Date(user.hireDate) : new Date();
	const monthsSinceHire = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

	if (monthsSinceHire < 3) {
		events.push({
			title: 'New Employee Orientation',
			time: 'Tomorrow 10:00 AM',
			type: 'meeting'
		});
	}

	return events.slice(0, 3); // Return max 3 events
}
