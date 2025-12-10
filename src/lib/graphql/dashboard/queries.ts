// Dashboard GraphQL Queries

export const GET_USERS_QUERY = `
	query GetUsers {
		users(limit: 20) {
			id
			firstName
			lastName
			isActive
		}
	}
`;

export const GET_DEPARTMENTS_QUERY = `
	query GetDepartments {
		departments(limit: 10) {
			id
			name
		}
	}
`;

export const GET_USER_ATTENDANCE_QUERY = `
	query GetUserAttendance($userId: UUID!) {
		attendanceRecords(userId: $userId, limit: 30) {
			id
			date
			clockIn
			clockOut
			hoursWorked
			status
		}
	}
`;

export const GET_USER_LEAVE_REQUESTS_QUERY = `
	query GetUserLeaveRequests {
		leaveRequests(limit: 10) {
			id
			leaveType {
				id
				name
				color
			}
			startDate
			endDate
			daysRequested
			status
			createdAt
		}
	}
`;

export const GET_USER_GOALS_QUERY = `
	query GetUserGoals($userId: UUID!) {
		employeeGoals(employeeId: $userId, limit: 10) {
			id
			employeeId
			goalTitle
			goalDescription
			status
			targetDate
			createdAt
		}
	}
`;

export const GET_USER_TASKS_QUERY = `
	query GetUserTasks($filter: TaskFilter!) {
		tasks(filter: $filter, limit: 10) {
			id
			title
			description
			status
			priority
			dueDate
			createdAt
		}
	}
`;

export const GET_UPCOMING_EVENTS_QUERY = `
	query GetUpcomingEvents($startTimeAfter: DateTime!, $startTimeBefore: DateTime!) {
		events(startTimeAfter: $startTimeAfter, startTimeBefore: $startTimeBefore, limit: 20) {
			id
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			isPublic
			status
			color
			organizerId
			attendees {
				id
				employeeId
				responseStatus
			}
		}
	}
`;

export const GET_RECENT_ACTIVITIES_QUERY = `
	query GetRecentActivities($userId: UUID!) {
		activityLogs(userId: $userId, limit: 20) {
			id
			action
			resourceType
			resourceId
			details
			createdAt
		}
	}
`;

export const GET_SYSTEM_AUDIT_LOGS_QUERY = `
	query GetSystemAuditLogs {
		activityLogs(limit: 10) {
			id
			action
			resourceType
			resourceId
			details
			createdAt
		}
	}
`;

export const GET_ROLLBACK_REQUESTS_QUERY = `
	query GetRollbackRequests {
		rollbackRequests(limit: 5, offset: 0) {
			id
			entityType
			status
			reason
			createdAt
			requester {
				id
				firstName
				lastName
			}
		}
	}
`;

export const GET_ROLLBACK_STATS_QUERY = `
	query GetRollbackStats {
		rollbackRequestsCount
	}
`;
