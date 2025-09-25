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
    teamGoals(
      first: $first
      offset: $offset
      orderBy: $orderBy
      filter: $filter
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
  query GetKeyResults(
    $goalId: UUID!
    $orderBy: [GoalKeyResultsOrderBy!] = [WEIGHT_DESC]
  ) {
    goalKeyResults(
      condition: { goalId: $goalId }
      orderBy: $orderBy
    ) {
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
  { value: 'okr', label: 'OKR (Objectives & Key Results)', description: 'Quarterly objectives with measurable outcomes', color: 'blue', icon: '🎯' },
  { value: 'kpi', label: 'KPI (Key Performance Indicator)', description: 'Ongoing metrics tracking', color: 'green', icon: '📊' },
  { value: 'project', label: 'Project Goal', description: 'Specific project deliverables', color: 'purple', icon: '🚀' }
];

export const goalStatuses = [
  { value: 'draft', label: 'Draft', description: 'Goal being planned', color: 'gray', icon: '📝' },
  { value: 'active', label: 'Active', description: 'Currently in progress', color: 'blue', icon: '🔄' },
  { value: 'completed', label: 'Completed', description: 'Successfully achieved', color: 'green', icon: '✅' },
  { value: 'cancelled', label: 'Cancelled', description: 'No longer pursuing', color: 'red', icon: '❌' }
];

export const goalPriorities = [
  { value: 'high', label: 'High Priority', description: 'Critical objectives', color: 'red', icon: '🔴', weight: 3 },
  { value: 'medium', label: 'Medium Priority', description: 'Important objectives', color: 'yellow', icon: '🟡', weight: 2 },
  { value: 'low', label: 'Low Priority', description: 'Nice to have objectives', color: 'green', icon: '🟢', weight: 1 }
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
export function getGoalTypeInfo(type: GoalType): typeof goalTypes[0] {
  return goalTypes.find(t => t.value === type) || goalTypes[0];
}

// Helper function to get status info
export function getGoalStatusInfo(status: GoalStatus): typeof goalStatuses[0] {
  return goalStatuses.find(s => s.value === status) || goalStatuses[0];
}

// Helper function to get priority info
export function getPriorityInfo(priority: GoalPriority): typeof goalPriorities[0] {
  return goalPriorities.find(p => p.value === priority) || goalPriorities[1];
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
    return sum + (completion * (kr.weight || 0));
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
  const quarterInfo = okrQuarters.find(q => q.value === quarter);
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

  return completion < (expectedCompletion - 20); // 20% buffer
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
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const overdueGoals = goals.filter(isGoalOverdue).length;
  const atRiskGoals = goals.filter(isGoalAtRisk).length;

  const avgCompletion = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + calculateGoalCompletion(g), 0) / goals.length)
    : 0;

  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const priorityBreakdown = goalPriorities.map(priority => ({
    ...priority,
    count: goals.filter(g => g.priority === priority.value).length
  }));

  const typeBreakdown = goalTypes.map(type => ({
    ...type,
    count: goals.filter(g => g.goalType === type.value).length
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
    completion: 0.4,      // 40% - How well goals are progressing
    timeliness: 0.3,      // 30% - On-time delivery
    keyResults: 0.2,      // 20% - Key results coverage
    engagement: 0.1       // 10% - Goal setting engagement
  };

  // Completion score (average completion percentage)
  const avgCompletion = goals.reduce((sum, g) => sum + calculateGoalCompletion(g), 0) / goals.length;
  score += (avgCompletion / 100) * weights.completion * 100;

  // Timeliness score (goals not overdue)
  const onTimeGoals = goals.filter(g => !isGoalOverdue(g)).length;
  const timelinessScore = goals.length > 0 ? (onTimeGoals / goals.length) : 0;
  score += timelinessScore * weights.timeliness * 100;

  // Key results coverage (goals with key results)
  const goalsWithKRs = goals.filter(g => g.keyResults?.totalCount > 0).length;
  const krCoverage = goals.length > 0 ? (goalsWithKRs / goals.length) : 0;
  score += krCoverage * weights.keyResults * 100;

  // Engagement score (active vs total possible goals)
  const activeGoalRatio = goals.filter(g => g.status === 'active').length / Math.max(goals.length, 1);
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