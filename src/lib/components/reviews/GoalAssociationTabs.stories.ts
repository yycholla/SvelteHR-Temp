/**
 * GoalAssociationTabs Storybook Stories
 * Feature: 023-reviews-creation-it
 * Task: T041
 */

import type { Meta, StoryObj } from '@storybook/svelte';
import GoalAssociationTabs from './GoalAssociationTabs.svelte';

// Mock available goals
const mockAvailableGoals = [
	{
		id: 'goal-001',
		title: 'Complete AWS certification',
		description: 'Obtain AWS Solutions Architect certification by Q2',
		targetDate: '2025-06-30',
		status: 'ACTIVE',
		progressPercentage: 45,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-15T00:00:00Z'
	},
	{
		id: 'goal-002',
		title: 'Improve code review skills',
		description: 'Conduct 20 code reviews with detailed feedback',
		targetDate: '2025-05-31',
		status: 'ACTIVE',
		progressPercentage: 70,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-20T00:00:00Z'
	},
	{
		id: 'goal-003',
		title: 'Mentor junior developers',
		description: 'Provide weekly mentoring sessions to 2 junior team members',
		targetDate: '2025-08-31',
		status: 'ACTIVE',
		progressPercentage: 30,
		createdAt: '2025-01-05T00:00:00Z',
		updatedAt: '2025-01-22T00:00:00Z'
	},
	{
		id: 'goal-004',
		title: 'Lead project migration',
		description: 'Successfully migrate legacy system to new architecture',
		targetDate: '2025-07-31',
		status: 'ACTIVE',
		progressPercentage: 15,
		createdAt: '2025-01-10T00:00:00Z',
		updatedAt: '2025-01-25T00:00:00Z'
	},
	{
		id: 'goal-005',
		title: 'Improve test coverage',
		description: 'Increase unit test coverage to 90% across all modules',
		targetDate: '2025-04-30',
		status: 'ACTIVE',
		progressPercentage: 85,
		createdAt: '2024-12-15T00:00:00Z',
		updatedAt: '2025-01-28T00:00:00Z'
	}
];

const meta = {
	title: 'Reviews/GoalAssociationTabs',
	component: GoalAssociationTabs,
	tags: ['autodocs'],
	argTypes: {
		availableGoals: {
			control: 'object',
			description: 'List of available goals to link'
		},
		selectedGoalIds: {
			control: 'object',
			description: 'Array of currently selected goal IDs'
		},
		newGoals: {
			control: 'object',
			description: 'Array of newly created goals'
		},
		maxGoals: {
			control: 'number',
			description: 'Maximum number of goals allowed'
		}
	}
} satisfies Meta<GoalAssociationTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default - Create New Goal tab
export const Default: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// With available goals
export const WithAvailableGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// With selected goals (Link Existing tab)
export const WithSelectedGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-001', 'goal-003'],
		newGoals: [],
		maxGoals: 20
	}
};

// With newly created goals
export const WithNewGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [
			{
				title: 'Implement new feature',
				description: 'Build user dashboard with analytics',
				targetCompletionDate: '2025-09-30',
				successMetrics: 'Dashboard launched with 95% uptime'
			},
			{
				title: 'Improve performance',
				description: 'Optimize database queries to reduce load time by 50%',
				targetCompletionDate: '2025-08-15',
				successMetrics: 'Average page load < 1 second'
			}
		],
		maxGoals: 20
	}
};

// Mixed: Both new and existing goals
export const MixedGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-002', 'goal-004'],
		newGoals: [
			{
				title: 'Complete security training',
				description: 'Attend OWASP security workshop and implement learnings',
				targetCompletionDate: '2025-05-15',
				successMetrics: 'All security recommendations implemented'
			}
		],
		maxGoals: 20
	}
};

// No available goals
export const NoAvailableGoals: Story = {
	args: {
		availableGoals: [],
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// At max goals limit
export const AtMaxLimit: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-001', 'goal-002', 'goal-003', 'goal-004', 'goal-005'],
		newGoals: Array.from({ length: 15 }, (_, i) => ({
			title: `Goal ${i + 1}`,
			description: `Description for goal ${i + 1}`,
			targetCompletionDate: '2025-12-31',
			successMetrics: `Success metric ${i + 1}`
		})),
		maxGoals: 20
	}
};

// Search functionality
export const WithSearch: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// High progress goals
export const HighProgressGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals.map((goal) => ({
			...goal,
			progressPercentage: Math.floor(Math.random() * 30) + 70 // 70-100%
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Low progress goals
export const LowProgressGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals.map((goal) => ({
			...goal,
			progressPercentage: Math.floor(Math.random() * 30) // 0-30%
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Goals with no progress
export const NoProgressGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals.map((goal) => ({
			...goal,
			progressPercentage: null
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Overdue goals
export const OverdueGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals.map((goal) => ({
			...goal,
			targetDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days ago
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Due soon goals
export const DueSoonGoals: Story = {
	args: {
		availableGoals: mockAvailableGoals.map((goal) => ({
			...goal,
			targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// New goal form validation
export const NewGoalFormValidation: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Large goal list (scrollable)
export const LargeGoalList: Story = {
	args: {
		availableGoals: Array.from({ length: 50 }, (_, i) => ({
			id: `goal-${i + 1}`,
			title: `Goal ${i + 1}: ${
				['Certification', 'Training', 'Project', 'Mentoring', 'Performance'][i % 5]
			}`,
			description: `Description for goal ${i + 1}`,
			targetDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0],
			status: 'ACTIVE',
			progressPercentage: Math.floor(Math.random() * 100),
			createdAt: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000).toISOString(),
			updatedAt: new Date().toISOString()
		})),
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Empty state
export const EmptyState: Story = {
	args: {
		availableGoals: [],
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};

// Single new goal
export const SingleNewGoal: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [
			{
				title: 'Complete certification',
				description: 'AWS Solutions Architect certification',
				targetCompletionDate: '2025-06-30',
				successMetrics: 'Pass exam with score >= 750'
			}
		],
		maxGoals: 20
	}
};

// Single selected goal
export const SingleSelectedGoal: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-001'],
		newGoals: [],
		maxGoals: 20
	}
};

// Goals summary view
export const GoalsSummary: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-001', 'goal-002'],
		newGoals: [
			{
				title: 'New project goal',
				description: 'Complete migration project',
				targetCompletionDate: '2025-10-31',
				successMetrics: 'Zero downtime migration'
			}
		],
		maxGoals: 20
	}
};

// Mobile view
export const MobileView: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: ['goal-001', 'goal-003'],
		newGoals: [
			{
				title: 'Mobile test goal',
				description: 'Testing mobile layout',
				targetCompletionDate: '2025-12-31',
				successMetrics: 'Responsive on all devices'
			}
		],
		maxGoals: 20
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	}
};

// Tab switching behavior
export const TabSwitching: Story = {
	args: {
		availableGoals: mockAvailableGoals,
		selectedGoalIds: [],
		newGoals: [],
		maxGoals: 20
	}
};
