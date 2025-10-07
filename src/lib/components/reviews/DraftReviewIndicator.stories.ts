/**
 * DraftReviewIndicator Storybook Stories
 * Feature: 023-reviews-creation-it
 * Task: T041
 */

import type { Meta, StoryObj } from '@storybook/svelte';
import DraftReviewIndicator from './DraftReviewIndicator.svelte';

const meta = {
	title: 'Reviews/DraftReviewIndicator',
	component: DraftReviewIndicator,
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['banner', 'compact', 'card'],
			description: 'Display variant'
		},
		reviewType: {
			control: 'select',
			options: ['ANNUAL_REVIEW', 'MID_YEAR', 'QUARTERLY', 'PROBATIONARY', 'PIP'],
			description: 'Type of the draft review'
		},
		lastUpdated: {
			control: 'text',
			description: 'Last updated timestamp (ISO string)'
		},
		showActions: {
			control: 'boolean',
			description: 'Show resume/delete action buttons'
		},
		onResume: {
			action: 'resume',
			description: 'Handler for resume draft action'
		},
		onDelete: {
			action: 'delete',
			description: 'Handler for delete draft action'
		}
	}
} satisfies Meta<DraftReviewIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

// Banner variant - just saved
export const BannerJustSaved: Story = {
	args: {
		variant: 'banner',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date().toISOString(),
		showActions: true
	}
};

// Banner variant - saved 5 minutes ago
export const BannerFiveMinutesAgo: Story = {
	args: {
		variant: 'banner',
		reviewType: 'MID_YEAR',
		lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Banner variant - saved 1 hour ago
export const BannerOneHourAgo: Story = {
	args: {
		variant: 'banner',
		reviewType: 'QUARTERLY',
		lastUpdated: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Banner variant - saved yesterday
export const BannerYesterday: Story = {
	args: {
		variant: 'banner',
		reviewType: 'PROBATIONARY',
		lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Banner variant - saved 1 week ago
export const BannerOneWeekAgo: Story = {
	args: {
		variant: 'banner',
		reviewType: 'PIP',
		lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Compact variant
export const CompactJustSaved: Story = {
	args: {
		variant: 'compact',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date().toISOString(),
		showActions: true
	}
};

// Compact variant - 2 hours ago
export const CompactTwoHoursAgo: Story = {
	args: {
		variant: 'compact',
		reviewType: 'QUARTERLY',
		lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Card variant - just saved
export const CardJustSaved: Story = {
	args: {
		variant: 'card',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date().toISOString(),
		showActions: true
	}
};

// Card variant - 30 minutes ago
export const CardThirtyMinutesAgo: Story = {
	args: {
		variant: 'card',
		reviewType: 'MID_YEAR',
		lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Card variant - 3 days ago
export const CardThreeDaysAgo: Story = {
	args: {
		variant: 'card',
		reviewType: 'PROBATIONARY',
		lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Without actions
export const WithoutActions: Story = {
	args: {
		variant: 'banner',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		showActions: false
	}
};

// Performance Improvement Plan
export const PIPDraft: Story = {
	args: {
		variant: 'card',
		reviewType: 'PIP',
		lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// 90-Day Review
export const NinetyDayDraft: Story = {
	args: {
		variant: 'card',
		reviewType: 'NINETY_DAY',
		lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Exit Review
export const ExitReviewDraft: Story = {
	args: {
		variant: 'banner',
		reviewType: 'EXIT_REVIEW',
		lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		showActions: true
	}
};

// Interactive with handlers
export const Interactive: Story = {
	args: {
		variant: 'card',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
		showActions: true,
		onResume: () => {
			alert('Resuming draft review...');
		},
		onDelete: () => {
			if (confirm('Are you sure you want to delete this draft?')) {
				alert('Draft deleted');
			}
		}
	}
};

// Multiple variants comparison
export const VariantsComparison: Story = {
	render: () => ({
		Component: DraftReviewIndicator,
		props: {}
	}),
	decorators: [
		() => ({
			template: `
				<div class="space-y-4">
					<div>
						<h3 class="font-semibold mb-2">Banner Variant</h3>
						<DraftReviewIndicator
							variant="banner"
							reviewType="ANNUAL_REVIEW"
							lastUpdated="${new Date(Date.now() - 30 * 60 * 1000).toISOString()}"
							showActions={true}
						/>
					</div>

					<div>
						<h3 class="font-semibold mb-2">Compact Variant</h3>
						<DraftReviewIndicator
							variant="compact"
							reviewType="MID_YEAR"
							lastUpdated="${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}"
							showActions={true}
						/>
					</div>

					<div>
						<h3 class="font-semibold mb-2">Card Variant</h3>
						<DraftReviewIndicator
							variant="card"
							reviewType="QUARTERLY"
							lastUpdated="${new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()}"
							showActions={true}
						/>
					</div>
				</div>
			`
		})
	]
};

// All review types in card variant
export const AllReviewTypesCards: Story = {
	render: () => ({
		Component: DraftReviewIndicator,
		props: {}
	}),
	decorators: [
		() => ({
			template: `
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<DraftReviewIndicator
						variant="card"
						reviewType="ANNUAL_REVIEW"
						lastUpdated="${new Date(Date.now() - 30 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
					<DraftReviewIndicator
						variant="card"
						reviewType="MID_YEAR"
						lastUpdated="${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
					<DraftReviewIndicator
						variant="card"
						reviewType="QUARTERLY"
						lastUpdated="${new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
					<DraftReviewIndicator
						variant="card"
						reviewType="PROBATIONARY"
						lastUpdated="${new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
					<DraftReviewIndicator
						variant="card"
						reviewType="PIP"
						lastUpdated="${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
					<DraftReviewIndicator
						variant="card"
						reviewType="NINETY_DAY"
						lastUpdated="${new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()}"
						showActions={true}
					/>
				</div>
			`
		})
	]
};

// Mobile view
export const MobileView: Story = {
	args: {
		variant: 'card',
		reviewType: 'ANNUAL_REVIEW',
		lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
		showActions: true
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	}
};
