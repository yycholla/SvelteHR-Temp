/**
 * Team Management GraphQL Operations
 * Handles manager's team view and team performance data
 */

import { gql } from '@urql/svelte';

// Team member interface
export interface TeamMember {
	id: string;
	displayName: string;
	email: string;
	jobTitle?: string;
	isActive: boolean;
	createdAt: string;
	// From job_information
	jobInformationsByEmployeeId?: {
		nodes: Array<{
			id: string;
			jobTitle?: string;
			employmentType?: string;
			startDate?: string;
			departmentByDepartmentId?: {
				id: string;
				name: string;
			};
		}>;
	};
	// Performance data
	performanceGoalsByEmployeeId?: {
		nodes: Array<{
			id: string;
			title: string;
			description?: string;
			targetDate?: string;
			status: string;
			progress?: number;
		}>;
	};
	performanceReviewsByEmployeeId?: {
		nodes: Array<{
			id: string;
			reviewPeriod: string;
			overallRating?: number;
			status: string;
			submittedAt?: string;
		}>;
	};
}

// Department with team info
export interface DepartmentTeam {
	id: string;
	name: string;
	description?: string;
	managerByManagerId?: {
		id: string;
		displayName: string;
		email: string;
	};
	// Team members
	jobInformationsByDepartmentId?: {
		nodes: Array<{
			id: string;
			employeeByEmployeeId: {
				id: string;
				displayName: string;
				email: string;
				jobTitle?: string;
				isActive: boolean;
			};
			jobTitle?: string;
			startDate?: string;
		}>;
	};
}

// GraphQL Fragments
export const TEAM_MEMBER_FRAGMENT = gql`
	fragment TeamMemberFields on User {
		id
		displayName
		email
		jobTitle
		isActive
		createdAt
		jobInformationsByEmployeeId {
			nodes {
				id
				jobTitle
				employmentType
				startDate
				departmentByDepartmentId {
					id
					name
				}
			}
		}
		performanceGoalsByEmployeeId(condition: { status: "active" }) {
			nodes {
				id
				title
				description
				targetDate
				status
				progress
			}
		}
		performanceReviewsByEmployeeId(orderBy: CREATED_AT_DESC, first: 3) {
			nodes {
				id
				reviewPeriod
				overallRating
				status
				submittedAt
			}
		}
	}
`;

export const DEPARTMENT_TEAM_FRAGMENT = gql`
	fragment DepartmentTeamFields on Department {
		id
		name
		description
		managerByManagerId {
			id
			displayName
			email
		}
		jobInformationsByDepartmentId {
			nodes {
				id
				jobTitle
				startDate
				employeeByEmployeeId {
					id
					displayName
					email
					jobTitle
					isActive
				}
			}
		}
	}
`;

// Query to get manager's team members
export const GET_MY_TEAM_QUERY = gql`
	query GetMyTeam($managerId: UUID!) {
		# Get team members where current user is the manager
		allJobInformations(condition: { managerId: $managerId }) {
			nodes {
				id
				employeeByEmployeeId {
					...TeamMemberFields
				}
			}
		}

		# Get departments managed by current user
		allDepartments(condition: { managerId: $managerId }) {
			nodes {
				...DepartmentTeamFields
			}
		}
	}
	${TEAM_MEMBER_FRAGMENT}
	${DEPARTMENT_TEAM_FRAGMENT}
`;

// Query to get team performance summary (simplified)
export const GET_TEAM_PERFORMANCE_SUMMARY_QUERY = gql`
	query GetTeamPerformanceSummary($managerId: UUID!) {
		# Recent performance reviews for team members
		allPerformanceReviews(orderBy: CREATED_AT_DESC, first: 10) {
			nodes {
				id
				reviewPeriod
				overallRating
				status
				submittedAt
				employeeByEmployeeId {
					id
					displayName
				}
			}
		}

		# Active goals for team members
		allPerformanceGoals(condition: { status: "active" }, orderBy: TARGET_DATE_ASC, first: 20) {
			nodes {
				id
				title
				targetDate
				status
				progress
				employeeByEmployeeId {
					id
					displayName
				}
			}
		}
	}
`;

// Query to get individual team member details
export const GET_TEAM_MEMBER_DETAILS_QUERY = gql`
	query GetTeamMemberDetails($employeeId: UUID!, $managerId: UUID!) {
		userById(id: $employeeId) {
			...TeamMemberFields
			# Additional details for team member view
			attendanceRecordsByUserId(orderBy: DATE_DESC, first: 30) {
				nodes {
					id
					date
					checkIn
					checkOut
					status
					hoursWorked
				}
			}
			leaveRequestsByUserId(orderBy: REQUESTED_DATE_DESC, first: 10) {
				nodes {
					id
					leaveType
					startDate
					endDate
					status
					requestedDate
				}
			}
		}

		# Verify current user is the manager
		jobInformationByEmployeeId(employeeId: $employeeId) {
			managerId
		}
	}
	${TEAM_MEMBER_FRAGMENT}
`;

// Helper functions for team management
export class TeamManagementService {
	/**
	 * Check if current user is a manager of the specified employee
	 */
	static isManagerOf(currentUserId: string, teamMember: TeamMember): boolean {
		return (
			teamMember.jobInformationsByEmployeeId?.nodes?.some(
				(ji) => ji.departmentByDepartmentId?.id === currentUserId
			) || false
		);
	}

	/**
	 * Get team performance stats
	 */
	static getTeamStats(teamMembers: TeamMember[]) {
		const totalMembers = teamMembers.length;
		const activeMembers = teamMembers.filter((member) => member.isActive).length;

		const totalGoals = teamMembers.reduce(
			(sum, member) => sum + (member.performanceGoalsByEmployeeId?.nodes?.length || 0),
			0
		);

		const completedGoals = teamMembers.reduce(
			(sum, member) =>
				sum +
				(member.performanceGoalsByEmployeeId?.nodes?.filter((goal) => goal.status === 'completed')
					?.length || 0),
			0
		);

		const recentReviews = teamMembers.reduce(
			(sum, member) =>
				sum +
				(member.performanceReviewsByEmployeeId?.nodes?.filter(
					(review) => review.status === 'completed'
				)?.length || 0),
			0
		);

		return {
			totalMembers,
			activeMembers,
			totalGoals,
			completedGoals,
			goalCompletionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
			recentReviews
		};
	}

	/**
	 * Format team member job title and department
	 */
	static formatJobInfo(member: TeamMember): string {
		const jobInfo = member.jobInformationsByEmployeeId?.nodes?.[0];
		if (!jobInfo) return member.jobTitle || 'Unknown Position';

		const title = jobInfo.jobTitle || member.jobTitle || 'Unknown Position';
		const department = jobInfo.departmentByDepartmentId?.name;

		return department ? `${title} - ${department}` : title;
	}

	/**
	 * Get upcoming performance review dates
	 */
	static getUpcomingReviews(teamMembers: TeamMember[]): Array<{
		employeeId: string;
		employeeName: string;
		dueDate: string;
	}> {
		// This would typically calculate based on review cycles
		// For now, return empty array
		return [];
	}
}

// Export commonly used operations
export const getMyTeam = GET_MY_TEAM_QUERY;
export const getTeamPerformanceSummary = GET_TEAM_PERFORMANCE_SUMMARY_QUERY;
export const getTeamMemberDetails = GET_TEAM_MEMBER_DETAILS_QUERY;
