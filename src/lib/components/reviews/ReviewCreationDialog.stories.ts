/**
 * ReviewCreationDialog Storybook Stories
 * Feature: 023-reviews-creation-it
 * Task: T041
 */

import type { Meta, StoryObj } from '@storybook/svelte';
import ReviewCreationDialog from './ReviewCreationDialog.svelte';

// Mock employee data
const mockEmployee = {
	id: 'emp-001',
	displayName: 'John Doe',
	email: 'john.doe@company.com',
	jobTitle: 'Senior Software Engineer',
	departmentId: 'dept-001'
};

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
	}
];

// Mock review types metadata
const mockReviewTypesMetadata = [
	{
		value: 'ANNUAL_REVIEW',
		label: 'Annual Review',
		description: 'Comprehensive yearly performance evaluation',
		displayOrder: 1
	},
	{
		value: 'MID_YEAR',
		label: 'Mid-Year Review',
		description: 'Six-month progress check and goal adjustment',
		displayOrder: 2
	},
	{
		value: 'QUARTERLY',
		label: 'Quarterly Review',
		description: 'Quarterly performance check-in',
		displayOrder: 3
	},
	{
		value: 'PROBATIONARY',
		label: 'Probationary Review',
		description: 'New hire evaluation during probation period',
		displayOrder: 4
	},
	{
		value: 'PIP',
		label: 'Performance Improvement Plan',
		description: 'Structured plan for performance improvement',
		displayOrder: 5
	}
];

const meta = {
	title: 'Reviews/ReviewCreationDialog',
	component: ReviewCreationDialog,
	tags: ['autodocs'],
	argTypes: {
		open: {
			control: 'boolean',
			description: 'Dialog open state'
		},
		employee: {
			control: 'object',
			description: 'Employee for whom the review is being created'
		},
		availableGoals: {
			control: 'object',
			description: 'List of available goals to associate with the review'
		},
		reviewTypesMetadata: {
			control: 'object',
			description: 'Review types configuration'
		},
		loading: {
			control: 'boolean',
			description: 'Loading state during creation/save'
		},
		draftId: {
			control: 'text',
			description: 'Draft ID if editing existing draft'
		},
		onCreateReview: {
			action: 'createReview',
			description: 'Handler for creating a new review'
		},
		onSaveAsDraft: {
			action: 'saveAsDraft',
			description: 'Handler for saving review as draft'
		},
		onCancel: {
			action: 'cancel',
			description: 'Handler for canceling dialog'
		}
	}
} satisfies Meta<ReviewCreationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state (dialog closed)
export const Default: Story = {
	args: {
		open: false,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Dialog open - New review
export const NewReview: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Dialog with Annual Review selected
export const AnnualReviewSelected: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Dialog with multiple goals linked
export const WithLinkedGoals: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Draft auto-saving state
export const AutoSaving: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Loading state (creating review)
export const Creating: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: true
	}
};

// Editing existing draft
export const EditingDraft: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false,
		draftId: 'draft-12345'
	}
};

// Validation errors
export const ValidationErrors: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// No available goals
export const NoAvailableGoals: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: [],
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Probationary review
export const ProbationaryReview: Story = {
	args: {
		open: true,
		employee: {
			...mockEmployee,
			displayName: 'Jane Smith',
			jobTitle: 'Junior Developer'
		},
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Performance Improvement Plan (PIP)
export const PerformanceImprovementPlan: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// With new goal creation
export const WithNewGoalCreation: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	}
};

// Mobile view
export const MobileView: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	}
};

// Interactive with handlers
export const Interactive: Story = {
	args: {
		open: true,
		employee: mockEmployee,
		availableGoals: mockAvailableGoals,
		reviewTypesMetadata: mockReviewTypesMetadata,
		loading: false,
		onCreateReview: (event: CustomEvent) => {
			console.log('Create review:', event.detail);
			alert(`Creating review for ${mockEmployee.displayName}`);
		},
		onSaveAsDraft: (event: CustomEvent) => {
			console.log('Save as draft:', event.detail);
			alert('Draft saved successfully');
		},
		onCancel: () => {
			console.log('Cancel');
			alert('Dialog canceled');
		}
	}
};
