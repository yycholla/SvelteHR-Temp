/**
 * GraphQL Operations for Attendance Tracking
 * Generated for PostGraphile schema introspection
 */

import { gql } from '@urql/svelte';

// Fragments for reusable field sets
export const ATTENDANCE_RECORD_BASIC_FIELDS = gql`
	fragment AttendanceRecordBasicFields on AttendanceRecord {
		id
		employeeId
		date
		clockIn
		clockOut
		totalHours
		status
		createdAt
		updatedAt
	}
`;

export const ATTENDANCE_RECORD_FULL_FIELDS = gql`
	fragment AttendanceRecordFullFields on AttendanceRecord {
		...AttendanceRecordBasicFields
		breakDuration
		overtimeHours
		notes
		location
		ipAddress
		metadata
	}
	${ATTENDANCE_RECORD_BASIC_FIELDS}
`;

export const USER_BASIC_FIELDS = gql`
	fragment UserBasicFields on User {
		id
		email
		displayName
		isActive
	}
`;

// Query: Get attendance records for employee
export const GET_EMPLOYEE_ATTENDANCE_QUERY = gql`
	query GetEmployeeAttendance(
		$employeeId: UUID!
		$startDate: Date
		$endDate: Date
		$first: Int
		$offset: Int
		$orderBy: [AttendanceRecordsOrderBy!]
	) {
		allAttendanceRecords(
			first: $first
			offset: $offset
			condition: { employeeId: $employeeId }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
			orderBy: $orderBy
		) {
			nodes {
				...AttendanceRecordFullFields
				userByEmployeeId {
					...UserBasicFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get current day attendance record
export const GET_TODAY_ATTENDANCE_QUERY = gql`
	query GetTodayAttendance($employeeId: UUID!, $date: Date!) {
		attendanceRecordByEmployeeIdAndDate(employeeId: $employeeId, date: $date) {
			...AttendanceRecordFullFields
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// Query: Get attendance record by ID
export const GET_ATTENDANCE_RECORD_BY_ID_QUERY = gql`
	query GetAttendanceRecordById($id: UUID!) {
		attendanceRecordById(id: $id) {
			...AttendanceRecordFullFields
			userByEmployeeId {
				...UserBasicFields
			}
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get team attendance for manager view
export const GET_TEAM_ATTENDANCE_QUERY = gql`
	query GetTeamAttendance(
		$employeeIds: [UUID!]!
		$startDate: Date!
		$endDate: Date!
		$first: Int
		$offset: Int
	) {
		allAttendanceRecords(
			first: $first
			offset: $offset
			filter: {
				and: [
					{ employeeId: { in: $employeeIds } }
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
			orderBy: [DATE_DESC, EMPLOYEE_ID_ASC]
		) {
			nodes {
				...AttendanceRecordFullFields
				userByEmployeeId {
					...UserBasicFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get attendance summary for employee
export const GET_ATTENDANCE_SUMMARY_QUERY = gql`
	query GetAttendanceSummary($employeeId: UUID!, $startDate: Date!, $endDate: Date!) {
		totalRecords: allAttendanceRecords(
			condition: { employeeId: $employeeId }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
		) {
			totalCount
		}
		presentRecords: allAttendanceRecords(
			condition: { employeeId: $employeeId, status: PRESENT }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
		) {
			totalCount
		}
		absentRecords: allAttendanceRecords(
			condition: { employeeId: $employeeId, status: ABSENT }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
		) {
			totalCount
		}
		lateRecords: allAttendanceRecords(
			condition: { employeeId: $employeeId, status: LATE }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
		) {
			totalCount
		}
		halfDayRecords: allAttendanceRecords(
			condition: { employeeId: $employeeId, status: HALF_DAY }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
				]
			}
		) {
			totalCount
		}
	}
`;

// Query: Get weekly attendance overview
export const GET_WEEKLY_ATTENDANCE_QUERY = gql`
	query GetWeeklyAttendance($employeeId: UUID!, $weekStart: Date!, $weekEnd: Date!) {
		allAttendanceRecords(
			condition: { employeeId: $employeeId }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $weekStart } }
					{ date: { lessThanOrEqualTo: $weekEnd } }
				]
			}
			orderBy: DATE_ASC
		) {
			nodes {
				...AttendanceRecordBasicFields
			}
		}
	}
	${ATTENDANCE_RECORD_BASIC_FIELDS}
`;

// Query: Get monthly attendance report
export const GET_MONTHLY_ATTENDANCE_QUERY = gql`
  query GetMonthlyAttendance(
    $employeeId: UUID!
    $month: Int!
    $year: Int!
  ) {
    allAttendanceRecords(
      condition: { employeeId: $employeeId }
      filter: {
        and: [
          { date: { greaterThanOrEqualTo: "${year}-${month.toString().padStart(2, '0')}-01" } }
          { date: { lessThan: "${month === 12 ? year + 1 : year}-${(month === 12 ? 1 : month + 1).toString().padStart(2, '0')}-01" } }
        ]
      }
      orderBy: DATE_ASC
    ) {
      nodes {
        ...AttendanceRecordFullFields
      }
      totalCount
    }
  }
  ${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// Query: Get attendance statistics for dashboard
export const GET_ATTENDANCE_STATS_QUERY = gql`
	query GetAttendanceStats($employeeIds: [UUID!], $startDate: Date!, $endDate: Date!) {
		totalEmployees: allUsers(condition: { isActive: true }, filter: { id: { in: $employeeIds } }) {
			totalCount
		}
		presentToday: allAttendanceRecords(
			condition: { status: PRESENT, date: $endDate }
			filter: { employeeId: { in: $employeeIds } }
		) {
			totalCount
		}
		absentToday: allAttendanceRecords(
			condition: { status: ABSENT, date: $endDate }
			filter: { employeeId: { in: $employeeIds } }
		) {
			totalCount
		}
		lateToday: allAttendanceRecords(
			condition: { status: LATE, date: $endDate }
			filter: { employeeId: { in: $employeeIds } }
		) {
			totalCount
		}
	}
`;

// Query: Get employees who haven't clocked in today
export const GET_MISSING_ATTENDANCE_QUERY = gql`
	query GetMissingAttendance($date: Date!, $employeeIds: [UUID!]!) {
		allUsers(condition: { isActive: true }, filter: { id: { in: $employeeIds } }) {
			nodes {
				...UserBasicFields
				hasAttendanceToday: attendanceRecordsByEmployeeId(condition: { date: $date }, first: 1) {
					totalCount
				}
			}
		}
	}
	${USER_BASIC_FIELDS}
`;

// Query: Get overtime records
export const GET_OVERTIME_RECORDS_QUERY = gql`
	query GetOvertimeRecords(
		$employeeId: UUID
		$startDate: Date!
		$endDate: Date!
		$first: Int
		$offset: Int
	) {
		allAttendanceRecords(
			first: $first
			offset: $offset
			condition: { employeeId: $employeeId }
			filter: {
				and: [
					{ date: { greaterThanOrEqualTo: $startDate } }
					{ date: { lessThanOrEqualTo: $endDate } }
					{ overtimeHours: { greaterThan: 0 } }
				]
			}
			orderBy: DATE_DESC
		) {
			nodes {
				...AttendanceRecordFullFields
				userByEmployeeId {
					...UserBasicFields
				}
			}
			totalCount
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Mutation: Clock in
export const CLOCK_IN_MUTATION = gql`
	mutation ClockIn($input: CreateAttendanceRecordInput!) {
		createAttendanceRecord(input: $input) {
			attendanceRecord {
				...AttendanceRecordFullFields
			}
			clientMutationId
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// Mutation: Clock out
export const CLOCK_OUT_MUTATION = gql`
	mutation ClockOut(
		$employeeId: UUID!
		$date: Date!
		$clockOut: Datetime!
		$totalHours: BigFloat
		$overtimeHours: BigFloat
		$status: AttendanceStatusEnum
		$notes: String
	) {
		updateAttendanceRecordByEmployeeIdAndDate(
			input: {
				employeeId: $employeeId
				date: $date
				attendanceRecordPatch: {
					clockOut: $clockOut
					totalHours: $totalHours
					overtimeHours: $overtimeHours
					status: $status
					notes: $notes
				}
			}
		) {
			attendanceRecord {
				...AttendanceRecordFullFields
			}
			clientMutationId
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// Mutation: Update attendance record
export const UPDATE_ATTENDANCE_RECORD_MUTATION = gql`
	mutation UpdateAttendanceRecord($input: UpdateAttendanceRecordByIdInput!) {
		updateAttendanceRecordById(input: $input) {
			attendanceRecord {
				...AttendanceRecordFullFields
			}
			clientMutationId
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// Mutation: Mark absent
export const MARK_ABSENT_MUTATION = gql`
	mutation MarkAbsent($input: CreateAttendanceRecordInput!) {
		createAttendanceRecord(input: $input) {
			attendanceRecord {
				...AttendanceRecordBasicFields
			}
			clientMutationId
		}
	}
	${ATTENDANCE_RECORD_BASIC_FIELDS}
`;

// Mutation: Bulk create attendance records
export const BULK_CREATE_ATTENDANCE_MUTATION = gql`
  mutation BulkCreateAttendance($records: [CreateAttendanceRecordInput!]!) {
    # Note: This would require a custom function in PostGraphile
    # For now, we'll handle bulk operations on the client side
  }
`;

// Mutation: Approve attendance modification
export const APPROVE_ATTENDANCE_MODIFICATION_MUTATION = gql`
	mutation ApproveAttendanceModification($id: UUID!, $approvedData: AttendanceRecordPatch!) {
		updateAttendanceRecordById(input: { id: $id, attendanceRecordPatch: $approvedData }) {
			attendanceRecord {
				...AttendanceRecordFullFields
			}
			clientMutationId
		}
	}
	${ATTENDANCE_RECORD_FULL_FIELDS}
`;

// TypeScript interfaces for type safety
export interface AttendanceRecord {
	id: string;
	employeeId: string;
	date: string;
	clockIn?: string;
	clockOut?: string;
	totalHours?: number;
	breakDuration?: number;
	overtimeHours?: number;
	status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
	notes?: string;
	location?: string;
	ipAddress?: string;
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
}

export interface AttendanceRecordsConnection {
	nodes: AttendanceRecord[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface AttendanceSummary {
	totalRecords: { totalCount: number };
	presentRecords: { totalCount: number };
	absentRecords: { totalCount: number };
	lateRecords: { totalCount: number };
	halfDayRecords: { totalCount: number };
}

export interface AttendanceStats {
	totalEmployees: { totalCount: number };
	presentToday: { totalCount: number };
	absentToday: { totalCount: number };
	lateToday: { totalCount: number };
}

export interface CreateAttendanceRecordInput {
	attendanceRecord: {
		employeeId: string;
		date: string;
		clockIn?: string;
		clockOut?: string;
		totalHours?: number;
		breakDuration?: number;
		overtimeHours?: number;
		status?: string;
		notes?: string;
		location?: string;
		ipAddress?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface UpdateAttendanceRecordInput {
	id: string;
	attendanceRecordPatch: {
		clockIn?: string;
		clockOut?: string;
		totalHours?: number;
		breakDuration?: number;
		overtimeHours?: number;
		status?: string;
		notes?: string;
		location?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

export interface GetEmployeeAttendanceVariables {
	employeeId: string;
	startDate?: string;
	endDate?: string;
	first?: number;
	offset?: number;
	orderBy?: string[];
}

export interface GetTeamAttendanceVariables {
	employeeIds: string[];
	startDate: string;
	endDate: string;
	first?: number;
	offset?: number;
}

export interface GetAttendanceSummaryVariables {
	employeeId: string;
	startDate: string;
	endDate: string;
}

// Utility functions for attendance management
export const AttendanceUtils = {
	/**
	 * Calculate total hours between clock in and clock out
	 */
	calculateTotalHours: (clockIn: Date, clockOut: Date): number => {
		const diffMs = clockOut.getTime() - clockIn.getTime();
		return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
	},

	/**
	 * Calculate overtime hours based on standard work hours
	 */
	calculateOvertimeHours: (totalHours: number, standardHours: number = 8): number => {
		return Math.max(0, totalHours - standardHours);
	},

	/**
	 * Determine attendance status based on clock in time and total hours
	 */
	determineAttendanceStatus: (
		clockIn?: Date,
		clockOut?: Date,
		standardStartTime: string = '09:00',
		minimumHours: number = 4
	): 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' => {
		if (!clockIn) return 'ABSENT';

		const [hours, minutes] = standardStartTime.split(':').map(Number);
		const standardStart = new Date(clockIn);
		standardStart.setHours(hours, minutes, 0, 0);

		const isLate = clockIn > standardStart;

		if (!clockOut) {
			return isLate ? 'LATE' : 'PRESENT';
		}

		const totalHours = AttendanceUtils.calculateTotalHours(clockIn, clockOut);

		if (totalHours < minimumHours) return 'HALF_DAY';
		if (isLate) return 'LATE';
		return 'PRESENT';
	},

	/**
	 * Format time for display
	 */
	formatTime: (time: string | Date): string => {
		const date = typeof time === 'string' ? new Date(time) : time;
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	},

	/**
	 * Format duration in hours to HH:MM format
	 */
	formatDuration: (hours: number): string => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	},

	/**
	 * Get status color for UI
	 */
	getStatusColor: (status: string): string => {
		switch (status) {
			case 'PRESENT':
				return 'success';
			case 'LATE':
				return 'warning';
			case 'HALF_DAY':
				return 'info';
			case 'ABSENT':
				return 'error';
			case 'ON_LEAVE':
				return 'secondary';
			default:
				return 'default';
		}
	},

	/**
	 * Check if employee can clock out
	 */
	canClockOut: (record: AttendanceRecord): boolean => {
		return !!record.clockIn && !record.clockOut;
	},

	/**
	 * Get current week date range
	 */
	getCurrentWeekRange: (): { start: Date; end: Date } => {
		const now = new Date();
		const dayOfWeek = now.getDay();
		const start = new Date(now);
		start.setDate(now.getDate() - dayOfWeek);
		start.setHours(0, 0, 0, 0);

		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		end.setHours(23, 59, 59, 999);

		return { start, end };
	},

	/**
	 * Get current month date range
	 */
	getCurrentMonthRange: (): { start: Date; end: Date } => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		end.setHours(23, 59, 59, 999);

		return { start, end };
	}
};
