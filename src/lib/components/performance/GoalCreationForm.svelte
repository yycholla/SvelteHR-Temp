<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Target, CalendarDays, User, Save, X } from 'lucide-svelte';
	import { formSectionVariants } from '$lib/components/ui/hr-components';

	// Props
	interface Props {
		open: boolean;
		employeeId: string;
		employeeName?: string;
		availableCycles?: Array<{
			id: string;
			name: string;
			description?: string;
			startDate: string;
			endDate: string;
			isActive: boolean;
		}>;
		onClose?: () => void;
		onCreate?: (goal: GoalFormData) => void;
	}

	let {
		open = $bindable(),
		employeeId,
		employeeName = 'Employee',
		availableCycles = [],
		onClose,
		onCreate
	}: Props = $props();

	// Form data interface
	interface GoalFormData {
		employeeId: string;
		cycleId: string;
		title: string;
		description?: string;
		targetDate?: string;
		status: string;
		progressPercentage: number;
	}

	// Form state
	let formData = $state<GoalFormData>({
		employeeId,
		cycleId: '',
		title: '',
		description: '',
		targetDate: '',
		status: 'NOT_STARTED',
		progressPercentage: 0
	});

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	// Status options
	const statusOptions = [
		{ value: 'NOT_STARTED', label: 'Not Started' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'ON_TRACK', label: 'On Track' },
		{ value: 'AT_RISK', label: 'At Risk' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	// Get active cycles for selection
	const activeCycles = $derived(availableCycles.filter((cycle) => cycle.isActive));

	// Validation
	function validateForm(): boolean {
		errors = {};
		let isValid = true;

		if (!formData.title.trim()) {
			errors.title = 'Goal title is required';
			isValid = false;
		}

		if (!formData.cycleId) {
			errors.cycleId = 'Performance cycle is required';
			isValid = false;
		}

		if (formData.targetDate) {
			const targetDate = new Date(formData.targetDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (targetDate < today) {
				errors.targetDate = 'Target date cannot be in the past';
				isValid = false;
			}
		}

		if (formData.progressPercentage < 0 || formData.progressPercentage > 100) {
			errors.progressPercentage = 'Progress must be between 0 and 100';
			isValid = false;
		}

		return isValid;
	}

	// Create goal via GraphQL
	async function createGoal() {
		if (!validateForm()) return;

		loading = true;
		try {
			const token = localStorage.getItem('postgraphile-jwt-token');

			const response = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({
					query: `
						mutation CreatePerformanceGoal($input: CreatePerformanceGoalInput!) {
							createPerformanceGoal(input: $input) {
								performanceGoal {
									id
									title
									description
									targetDate
									status
									progressPercentage
									createdAt
									employeeByEmployeeId {
										id
										displayName
										email
									}
									performanceCycleByCycleId {
										id
										name
									}
								}
							}
						}
					`,
					variables: {
						input: {
							performanceGoal: {
								employeeId: formData.employeeId,
								cycleId: formData.cycleId,
								title: formData.title,
								description: formData.description || null,
								targetDate: formData.targetDate || null,
								status: formData.status,
								progressPercentage: formData.progressPercentage
							}
						}
					}
				})
			});

			const result = await response.json();
			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			// Call onCreate callback if provided
			if (onCreate) {
				onCreate(formData);
			}

			// Reset form and close dialog
			resetForm();
			handleClose();
		} catch (error) {
			console.error('Error creating goal:', error);
			errors.submit = error instanceof Error ? error.message : 'Failed to create goal';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			employeeId,
			cycleId: '',
			title: '',
			description: '',
			targetDate: '',
			status: 'NOT_STARTED',
			progressPercentage: 0
		};
		errors = {};
	}

	function handleClose() {
		resetForm();
		open = false;
		if (onClose) onClose();
	}

	// Update employeeId if prop changes
	$effect(() => {
		formData.employeeId = employeeId;
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Target class="h-5 w-5" />
				Create Performance Goal
			</Dialog.Title>
			<Dialog.Description>
				Create a new performance goal for {employeeName}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Employee Info -->
			<div class={formSectionVariants({ variant: 'highlighted' })}>
				<div class="flex items-center gap-2">
					<User class="h-4 w-4 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">{employeeName}</p>
						<p class="text-xs text-muted-foreground">Employee ID: {employeeId}</p>
					</div>
				</div>
			</div>

			<!-- Performance Cycle Selection -->
			<div class="space-y-2">
				<Label for="cycle">Performance Cycle *</Label>
				<Select.Root bind:selected={formData.cycleId}>
					<Select.Trigger class={errors.cycleId ? 'border-red-500' : ''}>
						<Select.Value placeholder="Select performance cycle..." />
					</Select.Trigger>
					<Select.Content>
						{#each activeCycles as cycle (cycle.id)}
							<Select.Item value={cycle.id}>
								<div class="flex w-full items-center justify-between">
									<span>{cycle.name}</span>
									<Badge variant="secondary" class="ml-2 text-xs">
										{cycle.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</div>
							</Select.Item>
						{/each}
						{#if activeCycles.length === 0}
							<Select.Item value="" disabled>No active cycles available</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
				{#if errors.cycleId}
					<p class="text-sm text-red-500">{errors.cycleId}</p>
				{/if}
			</div>

			<!-- Goal Title -->
			<div class="space-y-2">
				<Label for="title">Goal Title *</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Enter goal title..."
					class={errors.title ? 'border-red-500' : ''}
				/>
				{#if errors.title}
					<p class="text-sm text-red-500">{errors.title}</p>
				{/if}
			</div>

			<!-- Goal Description -->
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Describe the goal objectives, success criteria, and any relevant details..."
					rows={4}
				/>
			</div>

			<!-- Target Date -->
			<div class="space-y-2">
				<Label for="targetDate" class="flex items-center gap-1">
					<CalendarDays class="h-4 w-4" />
					Target Date
				</Label>
				<Input
					id="targetDate"
					type="date"
					bind:value={formData.targetDate}
					class={errors.targetDate ? 'border-red-500' : ''}
				/>
				{#if errors.targetDate}
					<p class="text-sm text-red-500">{errors.targetDate}</p>
				{/if}
			</div>

			<!-- Status -->
			<div class="space-y-2">
				<Label for="status">Initial Status</Label>
				<Select.Root bind:selected={formData.status}>
					<Select.Trigger>
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{#each statusOptions as option (option.value)}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Initial Progress -->
			<div class="space-y-2">
				<Label for="progress">Initial Progress (%)</Label>
				<Input
					id="progress"
					type="number"
					min="0"
					max="100"
					bind:value={formData.progressPercentage}
					class={errors.progressPercentage ? 'border-red-500' : ''}
				/>
				{#if errors.progressPercentage}
					<p class="text-sm text-red-500">{errors.progressPercentage}</p>
				{/if}
			</div>

			<!-- Submit Error -->
			{#if errors.submit}
				<div class="rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-700">{errors.submit}</p>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex justify-end gap-2">
			<Button variant="outline" onclick={handleClose} disabled={loading}>
				<X class="mr-2 h-4 w-4" />
				Cancel
			</Button>
			<Button onclick={createGoal} disabled={loading || activeCycles.length === 0}>
				<Save class="mr-2 h-4 w-4" />
				{loading ? 'Creating...' : 'Create Goal'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
