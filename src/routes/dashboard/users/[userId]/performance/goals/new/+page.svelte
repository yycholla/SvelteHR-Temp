<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { mutationStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Target, ArrowLeft, AlertCircle, Send, Loader2 } from 'lucide-svelte';

	// Import GraphQL operations
	import {
		CREATE_PERFORMANCE_GOAL_MUTATION,
		type CreatePerformanceGoalInput
	} from '$lib/graphql/performance-management-operations';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if creating goal for own user
	const isOwnGoal = $derived($currentUser?.id === userId);

	// Form state
	let formData = $state({
		title: '',
		description: '',
		dueDate: '',
		weight: '',
		measurementCriteria: ''
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let validationErrors = $state<Record<string, string>>({});

	// Create client and mutation
	const client = createUrqlClient();
	let createGoalMutation: any = $state(null);

	onMount(() => {
		try {
			createGoalMutation = mutationStore({
				client,
				query: CREATE_PERFORMANCE_GOAL_MUTATION
			});
		} catch (error) {
			console.error('Error initializing goal form:', error);
		}
	});

	// Priority removed since it's not in the database schema

	// Validate form
	const validateForm = () => {
		const errors: Record<string, string> = {};

		if (!formData.title?.trim()) {
			errors.title = 'Please enter a goal title';
		}

		if (!formData.description?.trim()) {
			errors.description = 'Please provide a goal description';
		}

		if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) < 0 || Number(formData.weight) > 100)) {
			errors.weight = 'Weight must be a number between 0 and 100';
		}

		if (!formData.dueDate) {
			errors.dueDate = 'Please select a due date';
		} else {
			const dueDate = new Date(formData.dueDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (dueDate <= today) {
				errors.dueDate = 'Due date must be in the future';
			}
		}

		if (!formData.measurementCriteria?.trim()) {
			errors.measurementCriteria = 'Please define how this goal will be measured';
		}

		validationErrors = errors;
		return Object.keys(errors).length === 0;
	};

	// Submit form
	const handleSubmit = async () => {
		if (!validateForm()) return;

		loading = true;
		error = null;

		try {
			const input: CreatePerformanceGoalInput = {
				employeeId: userId,
				title: formData.title.trim(),
				description: formData.description.trim(),
				targetCompletionDate: formData.dueDate,
				weight: formData.weight ? Number(formData.weight) : null
			};

			const result = await createGoalMutation.executeMutation({
				input: { performanceGoal: input }
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			// Success - redirect to performance page
			goto(`/dashboard/users/${userId}/performance`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create performance goal';
		} finally {
			loading = false;
		}
	};

	// Handle form reset
	const handleReset = () => {
		formData = {
			title: '',
			description: '',
			dueDate: '',
			weight: '',
			measurementCriteria: ''
		};
		validationErrors = {};
		error = null;
	};

	// Get minimum date (tomorrow)
	const getMinDate = () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split('T')[0];
	};
</script>

<svelte:head>
	<title>Set Performance Goal - SvelteHR</title>
	<meta name="description" content="Create a new performance goal" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard/users/{userId}/performance">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Performance
		</Button>

		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Target class="h-8 w-8" />
				Set Performance Goal
			</h1>
			<p class="text-muted-foreground">Define a new goal to track your professional development</p>
		</div>
	</div>

	<!-- Form -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Form -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Goal Details</Card.Title>
					<Card.Description>
						Define your performance goal with clear, measurable objectives
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Error message -->
					{#if error}
						<div class="rounded-lg border border-red-200 bg-red-50 p-4">
							<div class="flex items-center space-x-2">
								<AlertCircle class="h-5 w-5 text-red-600" />
								<span class="text-sm font-medium text-red-800">{error}</span>
							</div>
						</div>
					{/if}

					<!-- Goal Title -->
					<div class="space-y-2">
						<Label for="title">Goal Title *</Label>
						<Input
							id="title"
							placeholder="e.g., Improve customer satisfaction scores"
							bind:value={formData.title}
							class={validationErrors.title ? 'border-red-500' : ''}
						/>
						{#if validationErrors.title}
							<p class="text-sm text-red-600">{validationErrors.title}</p>
						{/if}
					</div>

					<!-- Description -->
					<div class="space-y-2">
						<Label for="description">Description *</Label>
						<Textarea
							id="description"
							placeholder="Provide detailed information about what you want to achieve..."
							bind:value={formData.description}
							rows="4"
							class={validationErrors.description ? 'border-red-500' : ''}
						/>
						{#if validationErrors.description}
							<p class="text-sm text-red-600">{validationErrors.description}</p>
						{/if}
					</div>

					<!-- Due Date and Weight -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="dueDate">Due Date *</Label>
							<Input
								id="dueDate"
								type="date"
								bind:value={formData.dueDate}
								min={getMinDate()}
								class={validationErrors.dueDate ? 'border-red-500' : ''}
							/>
							{#if validationErrors.dueDate}
								<p class="text-sm text-red-600">{validationErrors.dueDate}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="weight">Weight (Optional)</Label>
							<Input
								id="weight"
								type="number"
								placeholder="e.g., 25"
								bind:value={formData.weight}
								min="0"
								max="100"
								class={validationErrors.weight ? 'border-red-500' : ''}
							/>
							{#if validationErrors.weight}
								<p class="text-sm text-red-600">{validationErrors.weight}</p>
							{/if}
							<p class="text-sm text-muted-foreground">
								Goal weight as percentage (0-100). Leave empty if not applicable.
							</p>
						</div>
					</div>


					<!-- Measurement Criteria -->
					<div class="space-y-2">
						<Label for="measurementCriteria">How Will This Be Measured? *</Label>
						<Textarea
							id="measurementCriteria"
							placeholder="Describe how progress and completion will be measured..."
							bind:value={formData.measurementCriteria}
							rows="3"
							class={validationErrors.measurementCriteria ? 'border-red-500' : ''}
						/>
						{#if validationErrors.measurementCriteria}
							<p class="text-sm text-red-600">{validationErrors.measurementCriteria}</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-between pt-4">
						<Button variant="outline" onclick={handleReset} disabled={loading}>Reset Form</Button>

						<div class="flex items-center space-x-2">
							<Button variant="outline" href="/dashboard/users/{userId}/performance" disabled={loading}>
								Cancel
							</Button>
							<Button onclick={handleSubmit} disabled={loading || !$currentUser}>
								{#if loading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<Send class="mr-2 h-4 w-4" />
								{/if}
								Create Goal
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Goal Setting Tips -->
			<Card.Root>
				<Card.Header>
					<Card.Title>SMART Goals</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3 text-sm">
						<div>
							<strong>Specific:</strong>
							<p class="text-muted-foreground">Clearly define what you want to achieve</p>
						</div>
						<div>
							<strong>Measurable:</strong>
							<p class="text-muted-foreground">Include metrics to track progress</p>
						</div>
						<div>
							<strong>Achievable:</strong>
							<p class="text-muted-foreground">Set realistic expectations</p>
						</div>
						<div>
							<strong>Relevant:</strong>
							<p class="text-muted-foreground">Align with your role and company objectives</p>
						</div>
						<div>
							<strong>Time-bound:</strong>
							<p class="text-muted-foreground">Set a clear deadline</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Examples -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Example Goals</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3 text-sm">
						<div>
							<strong>Sales:</strong>
							<p class="text-muted-foreground">
								"Increase quarterly sales by 15% through improved client relationships"
							</p>
						</div>
						<div>
							<strong>Skills:</strong>
							<p class="text-muted-foreground">
								"Complete advanced JavaScript certification within 6 months"
							</p>
						</div>
						<div>
							<strong>Leadership:</strong>
							<p class="text-muted-foreground">
								"Mentor 2 junior developers and improve team efficiency by 20%"
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
