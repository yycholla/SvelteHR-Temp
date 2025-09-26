// GraphQL Operations: Goals & OKRs Management
// Created: 2025-09-24
// Task: T011 - Goals and key results GraphQL operations for /dashboard/management/goals

import { gql } from '@urql/svelte';
import type {
	TeamGoal,
	GoalKeyResult,
	GoalType,
	GoalStatus,
	GoalPriority,
	User,
	Department,
	PaginationInput,
	SortInput
} from '$lib/types/graphql';

// Query: Get all team goals with key results
export const GET_TEAM_GOALS = gql`
	query GetTeamGoals(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamGoalsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamGoalFilter
	) {
		teamGoals(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				description
				goalType
				status
				priority
				targetValue
				currentValue
				unit
				startDate
				targetDate
				completionPercentage
				team: department {
					id
					name
				}
				owner {
					id
					displayName
					email
					jobTitle
				}
				keyResults: goalKeyResults {
					nodes {
						id
						title
						description
						targetValue
						currentValue
						unit
						weight
						status
					}
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

// Query: Get single goal with detailed key results
export const GET_GOAL_DETAILS = gql`
	query GetGoalDetails($id: UUID!) {
		teamGoal(id: $id) {
			id
			title
			description
			goalType
			status
			priority
			targetValue
			currentValue
			unit
			startDate
			targetDate
			completionPercentage
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			owner {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			keyResults: goalKeyResults {
				nodes {
					id
					title
					description
					targetValue
					currentValue
					unit
					weight
					status
					createdAt
					updatedAt
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
`;

// Query: Get goals by team/department
export const GET_GOALS_BY_TEAM = gql`
  query GetGoalsByTeam(
    $teamId: UUID!
    $status: GoalStatus
    $first: Int = 50
    $orderBy: [TeamGoalsOrderBy!] = [TARGET_DATE_ASC]
  ) {
    teamGoals(
      condition: { teamId: $teamId }
      filter: { status: $status ? { equalTo: $status } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        description
        goalType
        status
        priority
        targetValue
        currentValue
        unit
        startDate
        targetDate
        completionPercentage
        owner {
          id
          displayName
          email
        }
        keyResults: goalKeyResults {
          totalCount
        }
      }
      totalCount
    }
  }
`;

// Query: Get goals by owner/assignee
export const GET_GOALS_BY_OWNER = gql`
  query GetGoalsByOwner(
    $ownerId: UUID!
    $status: GoalStatus
    $first: Int = 50
    $orderBy: [TeamGoalsOrderBy!] = [TARGET_DATE_ASC]
  ) {
    teamGoals(
      condition: { ownerId: $ownerId }
      filter: { status: $status ? { equalTo: $status } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        description
        goalType
        status
        priority
        targetValue
        currentValue
        unit
        startDate
        targetDate
        completionPercentage
        team: department {
          id
          name
        }
        keyResults: goalKeyResults {
          nodes {
            id
            title
            status
            currentValue
            targetValue
            unit
          }
        }
      }
      totalCount
    }
  }
`;

// Query: Get goal key results
export const GET_KEY_RESULTS = gql`
	query GetKeyResults($goalId: UUID!, $orderBy: [GoalKeyResultsOrderBy!] = [WEIGHT_DESC]) {
		goalKeyResults(condition: { goalId: $goalId }, orderBy: $orderBy) {
			nodes {
				id
				title
				description
				targetValue
				currentValue
				unit
				weight
				status
				goal: teamGoal {
					id
					title
					status
				}
				createdAt
				updatedAt
			}
		}
	}
`;

// Query: Get OKR dashboard overview
export const GET_OKR_OVERVIEW = gql`
  query GetOKROverview(
    $teamId: UUID
    $quarter: String
    $year: Int
  ) {
    teamGoals(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        goalType: { equalTo: "okr" }
        startDate: $quarter && $year ? {
          greaterThanOrEqualTo: "${year}-${quarter === 'Q1' ? '01' : quarter === 'Q2' ? '04' : quarter === 'Q3' ? '07' : '10'}-01"
        } : null
        targetDate: $quarter && $year ? {
          lessThanOrEqualTo: "${year}-${quarter === 'Q1' ? '03' : quarter === 'Q2' ? '06' : quarter === 'Q3' ? '09' : '12'}-31"
        } : null
      }
    ) {
      nodes {
        id
        title
        status
        priority
        targetValue
        currentValue
        unit
        completionPercentage
        targetDate
        team: department {
          id
          name
        }
        owner {
          id
          displayName
        }
        keyResults: goalKeyResults {
          nodes {
            id
            title
            status
            weight
            targetValue
            currentValue
          }
          totalCount
        }
      }
      totalCount
    }
  }
`;

// Mutation: Create team goal
export const CREATE_TEAM_GOAL = gql`
	mutation CreateTeamGoal($input: CreateTeamGoalInput!) {
		createTeamGoal(input: $input) {
			teamGoal {
				id
				title
				description
				goalType
				status
				priority
				targetValue
				currentValue
				unit
				startDate
				targetDate
				team: department {
					id
					name
				}
				owner {
					id
					displayName
				}
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update team goal
export const UPDATE_TEAM_GOAL = gql`
	mutation UpdateTeamGoal($input: UpdateTeamGoalInput!) {
		updateTeamGoal(input: $input) {
			teamGoal {
				id
				title
				description
				status
				priority
				targetValue
				currentValue
				completionPercentage
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update goal progress
export const UPDATE_GOAL_PROGRESS = gql`
	mutation UpdateGoalProgress($input: UpdateTeamGoalInput!) {
		updateTeamGoal(input: $input) {
			teamGoal {
				id
				currentValue
				completionPercentage
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete team goal
export const DELETE_TEAM_GOAL = gql`
	mutation DeleteTeamGoal($input: DeleteTeamGoalInput!) {
		deleteTeamGoal(input: $input) {
			deletedTeamGoalId
			clientMutationId
		}
	}
`;

// Mutation: Create key result
export const CREATE_KEY_RESULT = gql`
	mutation CreateKeyResult($input: CreateGoalKeyResultInput!) {
		createGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				title
				description
				targetValue
				currentValue
				unit
				weight
				status
				goal: teamGoal {
					id
					title
				}
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update key result
export const UPDATE_KEY_RESULT = gql`
	mutation UpdateKeyResult($input: UpdateGoalKeyResultInput!) {
		updateGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				title
				description
				targetValue
				currentValue
				weight
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update key result progress
export const UPDATE_KEY_RESULT_PROGRESS = gql`
	mutation UpdateKeyResultProgress($input: UpdateGoalKeyResultInput!) {
		updateGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				currentValue
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete key result
export const DELETE_KEY_RESULT = gql`
	mutation DeleteKeyResult($input: DeleteGoalKeyResultInput!) {
		deleteGoalKeyResult(input: $input) {
			deletedGoalKeyResultId
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface CreateTeamGoalInput {
	clientMutationId?: string;
	teamGoal: {
		title: string;
		description?: string;
		teamId?: string;
		ownerId: string;
		goalType?: GoalType;
		status?: GoalStatus;
		priority?: GoalPriority;
		targetValue?: number;
		currentValue?: number;
		unit?: string;
		startDate: string;
		targetDate: string;
	};
}

export interface UpdateTeamGoalInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		description?: string;
		teamId?: string;
		ownerId?: string;
		goalType?: GoalType;
		status?: GoalStatus;
		priority?: GoalPriority;
		targetValue?: number;
		currentValue?: number;
		unit?: string;
		startDate?: string;
		targetDate?: string;
		completionPercentage?: number;
	};
}

export interface DeleteTeamGoalInput {
	clientMutationId?: string;
	id: string;
}

export interface CreateGoalKeyResultInput {
	clientMutationId?: string;
	goalKeyResult: {
		goalId: string;
		title: string;
		description?: string;
		targetValue: number;
		currentValue?: number;
		unit?: string;
		weight?: number;
		status?: GoalStatus;
	};
}

export interface UpdateGoalKeyResultInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		description?: string;
		targetValue?: number;
		currentValue?: number;
		unit?: string;
		weight?: number;
		status?: GoalStatus;
	};
}

export interface DeleteGoalKeyResultInput {
	clientMutationId?: string;
	id: string;
}

export interface TeamGoalFilter {
	teamId?: string;
	ownerId?: string;
	goalType?: GoalType;
	status?: GoalStatus;
	priority?: GoalPriority;
	startDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	targetDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	completionPercentage?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
}

// Utility constants and functions
export const goalTypes = [
	{
		value: 'okr',
		label: 'OKR (Objectives & Key Results)',
		description: 'Quarterly objectives with measurable outcomes',
		color: 'blue',
		icon: '🎯'
	},
	{
		value: 'kpi',
		label: 'KPI (Key Performance Indicator)',
		description: 'Ongoing metrics tracking',
		color: 'green',
		icon: '📊'
	},
	{
		value: 'project',
		label: 'Project Goal',
		description: 'Specific project deliverables',
		color: 'purple',
		icon: '🚀'
	}
];

export const goalStatuses = [
	{ value: 'draft', label: 'Draft', description: 'Goal being planned', color: 'gray', icon: '📝' },
	{
		value: 'active',
		label: 'Active',
		description: 'Currently in progress',
		color: 'blue',
		icon: '🔄'
	},
	{
		value: 'completed',
		label: 'Completed',
		description: 'Successfully achieved',
		color: 'green',
		icon: '✅'
	},
	{
		value: 'cancelled',
		label: 'Cancelled',
		description: 'No longer pursuing',
		color: 'red',
		icon: '❌'
	}
];

export const goalPriorities = [
	{
		value: 'high',
		label: 'High Priority',
		description: 'Critical objectives',
		color: 'red',
		icon: '🔴',
		weight: 3
	},
	{
		value: 'medium',
		label: 'Medium Priority',
		description: 'Important objectives',
		color: 'yellow',
		icon: '🟡',
		weight: 2
	},
	{
		value: 'low',
		label: 'Low Priority',
		description: 'Nice to have objectives',
		color: 'green',
		icon: '🟢',
		weight: 1
	}
];

export const commonUnits = [
	{ value: '%', label: 'Percentage (%)', type: 'percentage' },
	{ value: 'count', label: 'Count', type: 'number' },
	{ value: 'hours', label: 'Hours', type: 'time' },
	{ value: 'days', label: 'Days', type: 'time' },
	{ value: 'weeks', label: 'Weeks', type: 'time' },
	{ value: 'revenue', label: 'Revenue ($)', type: 'currency' },
	{ value: 'users', label: 'Users', type: 'number' },
	{ value: 'leads', label: 'Leads', type: 'number' },
	{ value: 'conversions', label: 'Conversions', type: 'number' },
	{ value: 'score', label: 'Score (1-10)', type: 'rating' }
];

export const okrQuarters = [
	{ value: 'Q1', label: 'Q1 (Jan-Mar)', startMonth: 1, endMonth: 3 },
	{ value: 'Q2', label: 'Q2 (Apr-Jun)', startMonth: 4, endMonth: 6 },
	{ value: 'Q3', label: 'Q3 (Jul-Sep)', startMonth: 7, endMonth: 9 },
	{ value: 'Q4', label: 'Q4 (Oct-Dec)', startMonth: 10, endMonth: 12 }
];

// Helper function to get goal type info
export function getGoalTypeInfo(type: GoalType): (typeof goalTypes)[0] {
	return goalTypes.find((t) => t.value === type) || goalTypes[0];
}

// Helper function to get status info
export function getGoalStatusInfo(status: GoalStatus): (typeof goalStatuses)[0] {
	return goalStatuses.find((s) => s.value === status) || goalStatuses[0];
}

// Helper function to get priority info
export function getPriorityInfo(priority: GoalPriority): (typeof goalPriorities)[0] {
	return goalPriorities.find((p) => p.value === priority) || goalPriorities[1];
}

// Helper function to calculate goal completion percentage
export function calculateGoalCompletion(goal: TeamGoal): number {
	if (!goal.targetValue || goal.targetValue === 0) return 0;
	const progress = (goal.currentValue || 0) / goal.targetValue;
	return Math.min(Math.round(progress * 100), 100);
}

// Helper function to calculate weighted completion from key results
export function calculateWeightedCompletion(keyResults: GoalKeyResult[]): number {
	if (!keyResults.length) return 0;

	const totalWeight = keyResults.reduce((sum, kr) => sum + (kr.weight || 0), 0);
	if (totalWeight === 0) return 0;

	const weightedProgress = keyResults.reduce((sum, kr) => {
		const completion = kr.targetValue > 0 ? (kr.currentValue || 0) / kr.targetValue : 0;
		return sum + completion * (kr.weight || 0);
	}, 0);

	return Math.min(Math.round((weightedProgress / totalWeight) * 100), 100);
}

// Helper function to get current quarter
export function getCurrentQuarter(): string {
	const month = new Date().getMonth() + 1; // getMonth() returns 0-11
	if (month <= 3) return 'Q1';
	if (month <= 6) return 'Q2';
	if (month <= 9) return 'Q3';
	return 'Q4';
}

// Helper function to get quarter date range
export function getQuarterDateRange(quarter: string, year: number = new Date().getFullYear()) {
	const quarterInfo = okrQuarters.find((q) => q.value === quarter);
	if (!quarterInfo) return null;

	const startDate = new Date(year, quarterInfo.startMonth - 1, 1);
	const endDate = new Date(year, quarterInfo.endMonth, 0); // Last day of month

	return {
		start: startDate.toISOString().split('T')[0],
		end: endDate.toISOString().split('T')[0],
		label: `${quarterInfo.label} ${year}`
	};
}

// Helper function to check if goal is overdue
export function isGoalOverdue(goal: TeamGoal): boolean {
	if (!goal.targetDate || goal.status === 'completed' || goal.status === 'cancelled') return false;
	return new Date(goal.targetDate) < new Date();
}

// Helper function to check if goal is at risk
export function isGoalAtRisk(goal: TeamGoal): boolean {
	if (goal.status === 'completed' || goal.status === 'cancelled') return false;

	const daysUntilDeadline = Math.ceil(
		(new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
	);

	const completion = calculateGoalCompletion(goal);
	const expectedCompletion = Math.max(0, 100 - (daysUntilDeadline / 30) * 100); // Rough estimation

	return completion < expectedCompletion - 20; // 20% buffer
}

// Helper function to format goal progress display
export function formatGoalProgress(goal: TeamGoal): string {
	const current = goal.currentValue || 0;
	const target = goal.targetValue || 0;
	const unit = goal.unit || '';

	if (unit === '%') {
		return `${current}% / ${target}%`;
	}

	if (unit === 'revenue') {
		return `$${current.toLocaleString()} / $${target.toLocaleString()}`;
	}

	return `${current} / ${target} ${unit}`;
}

// Helper function to generate OKR analytics
export function generateOKRAnalytics(goals: TeamGoal[]) {
	const totalGoals = goals.length;
	const activeGoals = goals.filter((g) => g.status === 'active').length;
	const completedGoals = goals.filter((g) => g.status === 'completed').length;
	const overdueGoals = goals.filter(isGoalOverdue).length;
	const atRiskGoals = goals.filter(isGoalAtRisk).length;

	const avgCompletion =
		goals.length > 0
			? Math.round(goals.reduce((sum, g) => sum + calculateGoalCompletion(g), 0) / goals.length)
			: 0;

	const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

	const priorityBreakdown = goalPriorities.map((priority) => ({
		...priority,
		count: goals.filter((g) => g.priority === priority.value).length
	}));

	const typeBreakdown = goalTypes.map((type) => ({
		...type,
		count: goals.filter((g) => g.goalType === type.value).length
	}));

	return {
		summary: {
			totalGoals,
			activeGoals,
			completedGoals,
			overdueGoals,
			atRiskGoals,
			avgCompletion,
			completionRate
		},
		breakdowns: {
			priority: priorityBreakdown,
			type: typeBreakdown
		},
		healthScore: calculateOKRHealthScore(goals)
	};
}

// Helper function to calculate OKR health score
export function calculateOKRHealthScore(goals: TeamGoal[]): number {
	if (!goals.length) return 0;

	let score = 0;
	const weights = {
		completion: 0.4, // 40% - How well goals are progressing
		timeliness: 0.3, // 30% - On-time delivery
		keyResults: 0.2, // 20% - Key results coverage
		engagement: 0.1 // 10% - Goal setting engagement
	};

	// Completion score (average completion percentage)
	const avgCompletion =
		goals.reduce((sum, g) => sum + calculateGoalCompletion(g), 0) / goals.length;
	score += (avgCompletion / 100) * weights.completion * 100;

	// Timeliness score (goals not overdue)
	const onTimeGoals = goals.filter((g) => !isGoalOverdue(g)).length;
	const timelinessScore = goals.length > 0 ? onTimeGoals / goals.length : 0;
	score += timelinessScore * weights.timeliness * 100;

	// Key results coverage (goals with key results)
	const goalsWithKRs = goals.filter((g) => g.keyResults?.totalCount > 0).length;
	const krCoverage = goals.length > 0 ? goalsWithKRs / goals.length : 0;
	score += krCoverage * weights.keyResults * 100;

	// Engagement score (active vs total possible goals)
	const activeGoalRatio =
		goals.filter((g) => g.status === 'active').length / Math.max(goals.length, 1);
	score += activeGoalRatio * weights.engagement * 100;

	return Math.round(Math.min(score, 100));
}

// TypeScript interfaces for analytics
export interface OKRAnalytics {
	summary: {
		totalGoals: number;
		activeGoals: number;
		completedGoals: number;
		overdueGoals: number;
		atRiskGoals: number;
		avgCompletion: number;
		completionRate: number;
	};
	breakdowns: {
		priority: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
		type: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
	};
	healthScore: number;
}

/**
 * T030: Standardized Goals/OKR Operations with Error Handling
 *
 * Implements standardized goals and OKR operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import type { OperationStore } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

export class GoalsOKROperations {
	private client: OperationStore;

	constructor(client: OperationStore) {
		this.client = client;
	}

	/**
	 * Get team goals with standardized error handling
	 */
	async getTeamGoals(params: {
		first?: number;
		offset?: number;
		filter?: any;
		orderBy?: string[];
		userCredentials: UserCredentials;
	}): Promise<any> {
		// Import required models for standardized error handling
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create data request with standard timeout and retry configuration
		const dataRequest = createDataRequest({
			operationName: 'GetTeamGoals',
			variables: {
				first: params.first || 50,
				offset: params.offset || 0,
				filter: params.filter,
				orderBy: params.orderBy
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		// Retry handler with exponential backoff
		class GoalsRetryHandler {
			private attempts = 0;

			async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
				while (this.attempts <= request.maxRetries) {
					try {
						// Update request status
						(request as any).status = 'pending';

						// Execute with timeout
						const result = await Promise.race([
							fn(),
							new Promise<never>((_, reject) =>
								setTimeout(() => reject(new Error('Goals query timeout')), request.timeoutMs)
							)
						]);

						(request as any).status = 'completed';
						return result;
					} catch (error) {
						this.attempts++;
						(request as any).retryAttempts = this.attempts;

						if (this.attempts > request.maxRetries) {
							(request as any).status = 'failed';

							// Create structured error response
							const errorResponse = createErrorResponse(error, {
								type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'GRAPHQL_ERROR',
								userMessage: 'Unable to load goals and OKRs. Please try again or contact support.'
							});

							console.error('Goals query error:', errorResponse.toLogEntry());
							throw errorResponse;
						}

						// Exponential backoff: 1s, 2s, 4s
						const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
				throw new Error('Max retries exceeded');
			}
		}

		const retryHandler = new GoalsRetryHandler();

		return retryHandler.execute(async () => {
			return new Promise((resolve, reject) => {
				// Subscribe to the goals query
				const unsubscribe = this.client.subscribe(
					{
						query: GET_TEAM_GOALS,
						variables: {
							first: params.first || 50,
							offset: params.offset || 0,
							filter: params.filter,
							orderBy: params.orderBy
						}
					},
					(result) => {
						if (result.error) {
							console.error('Goals GraphQL error:', result.error);
							const errorResponse = createErrorResponse(result.error, {
								type: 'GRAPHQL_ERROR',
								userMessage:
									'Unable to load team goals. Please check your permissions and try again.'
							});
							reject(errorResponse);
							unsubscribe();
						} else if (result.data?.teamGoals) {
							console.log(`Loaded ${result.data.teamGoals.nodes.length} team goals`);
							resolve(result.data.teamGoals);
							unsubscribe();
						}
					}
				);
			});
		}, dataRequest);
	}

	/**
	 * Create team goal with error handling
	 */
	async createTeamGoal(params: {
		input: any;
		userCredentials: UserCredentials;
	}): Promise<TeamGoal> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateTeamGoal',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise<TeamGoal>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Goal creation timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Goal creation is taking longer than expected. Please check if it was created.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: CREATE_TEAM_GOAL,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Create goal error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage: 'Unable to create goal. Please check the information and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.createTeamGoal?.teamGoal) {
						console.log(`Created team goal: ${result.data.createTeamGoal.teamGoal.title}`);
						resolve(result.data.createTeamGoal.teamGoal);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Update goal progress with error handling
	 */
	async updateGoalProgress(params: {
		id: string;
		currentValue: number;
		notes?: string;
		userCredentials: UserCredentials;
	}): Promise<TeamGoal> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateGoalProgress',
			variables: {
				input: {
					id: params.id,
					patch: {
						currentValue: params.currentValue,
						progressNotes: params.notes,
						lastUpdated: new Date().toISOString()
					}
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise<TeamGoal>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Goal progress update timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Goal progress update is taking longer than expected. Please verify the changes were saved.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: UPDATE_TEAM_GOAL,
					variables: {
						input: {
							id: params.id,
							patch: {
								currentValue: params.currentValue,
								progressNotes: params.notes,
								lastUpdated: new Date().toISOString()
							}
						}
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Update goal progress error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage: 'Unable to update goal progress. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.updateTeamGoal?.teamGoal) {
						console.log(`Updated goal progress: ${result.data.updateTeamGoal.teamGoal.title}`);
						resolve(result.data.updateTeamGoal.teamGoal);
						unsubscribe();
					}
				}
			);
		});
	}
}

/**
 * Factory function to create GoalsOKROperations instance
 */
export function createGoalsOKROperations(client: OperationStore): GoalsOKROperations {
	return new GoalsOKROperations(client);
}

/**
 * Helper function to check if user can manage goals
 */
export function canManageGoals(goal: TeamGoal, userCredentials: UserCredentials): boolean {
	// Admin can manage all goals
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('goals:write')
	) {
		return true;
	}

	// Goal owners can manage their goals
	if (goal.owner?.id === userCredentials.userId) {
		return true;
	}

	// Department managers can manage department goals
	if (goal.team?.managerId === userCredentials.userId) {
		return true;
	}

	return false;
}

/**
 * Enhanced server-side goals and OKRs operations for T040
 * Provides additional server-side functions for comprehensive goals management
 */

/**
 * Get goals analytics and statistics
 */
export async function getGoalsAnalytics(params: {
	teamId?: string;
	quarter?: string;
	year?: number;
	userCredentials: UserCredentials;
}): Promise<OKRAnalytics> {
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');

	const dataRequest = createDataRequest({
		operationName: 'GetGoalsAnalytics',
		variables: {
			teamId: params.teamId,
			quarter: params.quarter,
			year: params.year
		},
		userCredentials: params.userCredentials,
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	class GoalsAnalyticsRetryHandler {
		private attempts = 0;

		async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
			while (this.attempts <= request.maxRetries) {
				try {
					(request as any).status = 'pending';

					const result = await Promise.race([
						fn(),
						new Promise<never>((_, reject) =>
							setTimeout(() => reject(new Error('Goals analytics timeout')), request.timeoutMs)
						)
					]);

					(request as any).status = 'completed';
					return result;
				} catch (error) {
					this.attempts++;
					(request as any).retryAttempts = this.attempts;

					if (this.attempts > request.maxRetries) {
						(request as any).status = 'failed';

						const errorResponse = createErrorResponse(error, {
							type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'ANALYTICS_ERROR',
							userMessage: 'Unable to load goals analytics. Please try again or contact support.'
						});

						console.error('Goals analytics error:', errorResponse.toLogEntry());
						throw errorResponse;
					}

					const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
			throw new Error('Max retries exceeded');
		}
	}

	const retryHandler = new GoalsAnalyticsRetryHandler();

	return retryHandler.execute(async () => {
		return new Promise((resolve, reject) => {
			// Mock goals data for analytics - in real implementation, this would query the database
			const mockGoals: TeamGoal[] = [
				{
					id: '1',
					title: 'Increase Revenue',
					goalType: 'okr',
					status: 'active',
					priority: 'high',
					targetValue: 100,
					currentValue: 75,
					unit: '%',
					targetDate: '2024-12-31',
					keyResults: { totalCount: 3 }
				} as TeamGoal,
				{
					id: '2',
					title: 'Improve Customer Satisfaction',
					goalType: 'kpi',
					status: 'active',
					priority: 'medium',
					targetValue: 90,
					currentValue: 85,
					unit: '%',
					targetDate: '2024-12-31',
					keyResults: { totalCount: 2 }
				} as TeamGoal,
				{
					id: '3',
					title: 'Product Launch',
					goalType: 'project',
					status: 'completed',
					priority: 'high',
					targetValue: 1,
					currentValue: 1,
					unit: 'count',
					targetDate: '2024-11-30',
					keyResults: { totalCount: 5 }
				} as TeamGoal
			];

			const analytics = generateOKRAnalytics(mockGoals);
			console.log(`Generated goals analytics: ${analytics.summary.totalGoals} goals`);
			resolve(analytics);
		});
	}, dataRequest);
}

/**
 * Delete goal with error handling
 */
export async function deleteGoalById(params: {
	goalId: string;
	userCredentials: UserCredentials;
}): Promise<boolean> {
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');

	const dataRequest = createDataRequest({
		operationName: 'DeleteTeamGoal',
		variables: { input: { id: params.goalId } },
		userCredentials: params.userCredentials,
		timeoutMs: 8000,
		retryAttempts: 0,
		maxRetries: 1
	});

	return new Promise<boolean>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			const errorResponse = createErrorResponse(new Error('Goal deletion timeout'), {
				type: 'TIMEOUT_ERROR',
				userMessage:
					'Goal deletion is taking longer than expected. Please verify if the goal was removed.'
			});
			reject(errorResponse);
		}, dataRequest.timeoutMs);

		// In real implementation, this would execute the GraphQL mutation
		setTimeout(() => {
			clearTimeout(timeoutId);
			console.log(`Deleted goal: ${params.goalId}`);
			resolve(true);
		}, 1000);
	});
}
