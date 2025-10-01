// RSVPButton Storybook Stories
// Feature: 019-we-need-to - Task T021

import type { Meta, StoryObj } from '@storybook/svelte';
import RSVPButton from './RSVPButton.svelte';
import type { RsvpStatus } from '$lib/graphql/types';

const meta = {
	title: 'Events/RSVPButton',
	component: RSVPButton,
	tags: ['autodocs'],
	argTypes: {
		currentStatus: {
			control: 'select',
			options: ['accepted', 'declined', 'tentative', 'pending', 'no_response'],
			description: 'Current RSVP status'
		},
		onChange: {
			action: 'status-changed',
			description: 'Callback when RSVP status changes'
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the button'
		},
		loading: {
			control: 'boolean',
			description: 'Show loading state'
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
			description: 'Button size'
		}
	}
} satisfies Meta<RSVPButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default - Accepted status
export const Accepted: Story = {
	args: {
		currentStatus: 'accepted',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// Declined status
export const Declined: Story = {
	args: {
		currentStatus: 'declined',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// Tentative status
export const Tentative: Story = {
	args: {
		currentStatus: 'tentative',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// Pending status
export const Pending: Story = {
	args: {
		currentStatus: 'pending',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// No response status
export const NoResponse: Story = {
	args: {
		currentStatus: 'no_response',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// Small size
export const Small: Story = {
	args: {
		currentStatus: 'accepted',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'sm'
	}
};

// Large size
export const Large: Story = {
	args: {
		currentStatus: 'accepted',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: false,
		size: 'lg'
	}
};

// Disabled state
export const Disabled: Story = {
	args: {
		currentStatus: 'accepted',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: true,
		loading: false,
		size: 'md'
	}
};

// Loading state
export const Loading: Story = {
	args: {
		currentStatus: 'pending',
		onChange: (newStatus: RsvpStatus) => {
			console.log('Status changed to:', newStatus);
		},
		disabled: false,
		loading: true,
		size: 'md'
	}
};

// Interactive - simulates async status change
export const Interactive: Story = {
	args: {
		currentStatus: 'pending',
		onChange: async (newStatus: RsvpStatus) => {
			console.log('Updating status to:', newStatus);

			// Simulate API call
			return new Promise((resolve) => {
				setTimeout(() => {
					console.log('Status updated successfully!');
					resolve();
				}, 1500);
			});
		},
		disabled: false,
		loading: false,
		size: 'md'
	}
};

// All sizes comparison
export const SizeComparison: Story = {
	render: () => ({
		Component: RSVPButton,
		props: {}
	}),
	decorators: [
		() => ({
			template: `
				<div class="flex items-center gap-4">
					<RSVPButton
						currentStatus="accepted"
						onChange={(status) => console.log(status)}
						size="sm"
					/>
					<RSVPButton
						currentStatus="accepted"
						onChange={(status) => console.log(status)}
						size="md"
					/>
					<RSVPButton
						currentStatus="accepted"
						onChange={(status) => console.log(status)}
						size="lg"
					/>
				</div>
			`
		})
	]
};

// All statuses comparison
export const StatusComparison: Story = {
	render: () => ({
		Component: RSVPButton,
		props: {}
	}),
	decorators: [
		() => ({
			template: `
				<div class="flex flex-wrap gap-3">
					<RSVPButton
						currentStatus="accepted"
						onChange={(status) => console.log(status)}
					/>
					<RSVPButton
						currentStatus="declined"
						onChange={(status) => console.log(status)}
					/>
					<RSVPButton
						currentStatus="tentative"
						onChange={(status) => console.log(status)}
					/>
					<RSVPButton
						currentStatus="pending"
						onChange={(status) => console.log(status)}
					/>
					<RSVPButton
						currentStatus="no_response"
						onChange={(status) => console.log(status)}
					/>
				</div>
			`
		})
	]
};
