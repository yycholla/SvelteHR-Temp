/**
 * ReviewTypeDropdown Storybook Stories
 * Feature: 023-reviews-creation-it
 * Task: T041
 */

import type { Meta, StoryObj } from '@storybook/svelte';
import ReviewTypeDropdown from './ReviewTypeDropdown.svelte';
import type { ReviewType } from '$lib/schemas/reviews';

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
	},
	{
		value: 'NINETY_DAY',
		label: '90-Day Review',
		description: 'Three-month progress evaluation',
		displayOrder: 6
	},
	{
		value: 'PROJECT_BASED',
		label: 'Project-Based Review',
		description: 'Review focused on specific project completion',
		displayOrder: 7
	},
	{
		value: 'PROMOTION',
		label: 'Promotion Review',
		description: 'Evaluation for role advancement',
		displayOrder: 8
	},
	{
		value: 'EXIT_REVIEW',
		label: 'Exit Review',
		description: 'Final review before employee departure',
		displayOrder: 9
	},
	{
		value: 'SELF_ASSESSMENT',
		label: 'Self-Assessment',
		description: 'Employee self-evaluation',
		displayOrder: 10
	}
];

const meta = {
	title: 'Reviews/ReviewTypeDropdown',
	component: ReviewTypeDropdown,
	tags: ['autodocs'],
	argTypes: {
		selectedType: {
			control: 'select',
			options: ['', 'ANNUAL_REVIEW', 'MID_YEAR', 'QUARTERLY', 'PROBATIONARY', 'PIP'],
			description: 'Currently selected review type'
		},
		reviewTypesMetadata: {
			control: 'object',
			description: 'Review types configuration'
		},
		error: {
			control: 'text',
			description: 'Error message to display'
		},
		disabled: {
			control: 'boolean',
			description: 'Disabled state'
		}
	}
} satisfies Meta<ReviewTypeDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default (no selection)
export const Default: Story = {
	args: {
		selectedType: '' as ReviewType,
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Annual Review selected
export const AnnualReviewSelected: Story = {
	args: {
		selectedType: 'ANNUAL_REVIEW',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Mid-Year Review selected
export const MidYearReviewSelected: Story = {
	args: {
		selectedType: 'MID_YEAR',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Quarterly Review selected
export const QuarterlyReviewSelected: Story = {
	args: {
		selectedType: 'QUARTERLY',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Probationary Review selected
export const ProbationaryReviewSelected: Story = {
	args: {
		selectedType: 'PROBATIONARY',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Performance Improvement Plan selected
export const PIPSelected: Story = {
	args: {
		selectedType: 'PIP',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// 90-Day Review selected
export const NinetyDayReviewSelected: Story = {
	args: {
		selectedType: 'NINETY_DAY',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Promotion Review selected
export const PromotionReviewSelected: Story = {
	args: {
		selectedType: 'PROMOTION',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Exit Review selected
export const ExitReviewSelected: Story = {
	args: {
		selectedType: 'EXIT_REVIEW',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Self-Assessment selected
export const SelfAssessmentSelected: Story = {
	args: {
		selectedType: 'SELF_ASSESSMENT',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// With error
export const WithError: Story = {
	args: {
		selectedType: '' as ReviewType,
		reviewTypesMetadata: mockReviewTypesMetadata,
		error: 'Review type is required',
		disabled: false
	}
};

// Disabled state
export const Disabled: Story = {
	args: {
		selectedType: 'ANNUAL_REVIEW',
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: true
	}
};

// Limited review types (for specific roles)
export const LimitedTypes: Story = {
	args: {
		selectedType: '' as ReviewType,
		reviewTypesMetadata: mockReviewTypesMetadata.filter((t) =>
			['ANNUAL_REVIEW', 'MID_YEAR', 'QUARTERLY'].includes(t.value)
		),
		disabled: false
	}
};

// With all 10 review types
export const AllReviewTypes: Story = {
	args: {
		selectedType: '' as ReviewType,
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	}
};

// Mobile view
export const MobileView: Story = {
	args: {
		selectedType: '' as ReviewType,
		reviewTypesMetadata: mockReviewTypesMetadata,
		disabled: false
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	}
};
