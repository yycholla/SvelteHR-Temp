export const usersQuery = `
	query GetUsers {
		users(limit: 20) {
			id
			firstName
			lastName
			isActive
		}
	}
`;

export const departmentsQuery = `
	query GetDepartments {
		departments(limit: 10) {
			id
			name
		}
	}
`;

export const attendanceQuery = `
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

export const leaveRequestsQuery = `
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

export const goalsQuery = `
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

export const tasksQuery = `
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

export const eventsQuery = `
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

export const activityLogsQuery = `
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

export const systemAuditLogsQuery = `
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

export const rollbackRequestsQuery = `
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

export const rollbackStatsQuery = `
	query GetRollbackStats {
		rollbackRequestsCount
	}
`;
