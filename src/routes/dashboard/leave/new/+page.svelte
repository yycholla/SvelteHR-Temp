<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { mutationStore, queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Calendar, ArrowLeft, AlertCircle, Send, Loader2 } from 'lucide-svelte';

	// Import GraphQL operations
	import {
		CREATE_LEAVE_REQUEST_MUTATION,
		GET_MY_LEAVE_BALANCE_QUERY,
		type LeaveRequestType,
		type CreateLeaveRequestInput
	} from '$lib/graphql/leave-management-operations';

	// Form state
	let formData = $state({
		type: '' as LeaveRequestType | '',
		startDate: '',
		endDate: '',
		reason: '',
		isEmergency: false
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let validationErrors = $state<Record<string, string>>({});
	let calculatedDays = $state(0);

	// Create client and mutation
	const client = createUrqlClient();
	let createLeaveRequestMutation: any = $state(null);
	let leaveBalanceQuery: any = $state(null);
	let balanceQueryState = $state({ fetching: true, error: null, data: null });

	onMount(() => {
		try {
			createLeaveRequestMutation = mutationStore({
				client,
				query: CREATE_LEAVE_REQUEST_MUTATION
			});

			leaveBalanceQuery = queryStore({
				client,
				query: GET_MY_LEAVE_BALANCE_QUERY,
				variables: {}
			});
		} catch (error) {
			console.error('Error initializing leave form:', error);
		}
	});

	// Update balance query state
	$effect(() => {
		if (leaveBalanceQuery) {
			const unsubscribe = leaveBalanceQuery.subscribe((state: any) => {
				balanceQueryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};
			});
			return unsubscribe;
		}
	});

	// Leave type options
	const leaveTypeOptions = [
		{ value: 'VACATION', label: 'Vacation' },
		{ value: 'SICK', label: 'Sick Leave' },
		{ value: 'PERSONAL', label: 'Personal' },
		{ value: 'MATERNITY', label: 'Maternity Leave' },
		{ value: 'PATERNITY', label: 'Paternity Leave' },
		{ value: 'BEREAVEMENT', label: 'Bereavement' },
		{ value: 'OTHER', label: 'Other' }
	];

	// Calculate days between dates
	const calculateDays = $derived(() => {
		if (!formData.startDate || !formData.endDate) return 0;

		const start = new Date(formData.startDate);
		const end = new Date(formData.endDate);

		if (end < start) return 0;

		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays + 1; // Include both start and end dates
	});

	// Update calculated days when dates change
	$effect(() => {
		calculatedDays = calculateDays;
	});

	// Get leave balance for selected type
	const getLeaveBalance = $derived(() => {
		if (!formData.type || !balanceQueryState.data) return null;

		const balances = balanceQueryState.data?.allLeaveBalances?.nodes || [];
		return balances.find((balance: any) => balance.type === formData.type);
	});

	// Validate form
	const validateForm = () => {
		const errors: Record<string, string> = {};

		if (!formData.type) {
			errors.type = 'Please select a leave type';
		}

		if (!formData.startDate) {
			errors.startDate = 'Please select a start date';
		}

		if (!formData.endDate) {
			errors.endDate = 'Please select an end date';
		}

		if (formData.startDate && formData.endDate) {
			const start = new Date(formData.startDate);
			const end = new Date(formData.endDate);

			if (end < start) {
				errors.endDate = 'End date must be after start date';
			}

			// Check if start date is in the past (unless emergency or sick leave)
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (start < today && formData.type !== 'SICK' && !formData.isEmergency) {
				errors.startDate = 'Start date cannot be in the past';
			}
		}

		if (!formData.reason?.trim()) {
			errors.reason = 'Please provide a reason for your leave request';
		}

		// Check if sufficient balance is available
		const balance = getLeaveBalance;
		if (balance && calculatedDays > balance.available) {
			errors.days = `Insufficient leave balance. Available: ${balance.available} days, Requested: ${calculatedDays} days`;
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
			const input: CreateLeaveRequestInput = {
				type: formData.type as LeaveRequestType,
				startDate: formData.startDate,
				endDate: formData.endDate,
				reason: formData.reason.trim(),
				isEmergency: formData.isEmergency
			};

			const result = await createLeaveRequestMutation.executeMutation({
				input: { leaveRequest: input }
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			// Success - redirect to requests page
			goto('/dashboard/leave/requests');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit leave request';
		} finally {
			loading = false;
		}
	};

	// Handle form reset
	const handleReset = () => {
		formData = {
			type: '',
			startDate: '',
			endDate: '',
			reason: '',
			isEmergency: false
		};
		validationErrors = {};
		error = null;
	};

	// Get minimum date (today or tomorrow depending on type)
	const getMinDate = $derived(() => {
		const today = new Date();
		if (formData.type === 'SICK' || formData.isEmergency) {
			// Allow backdating for sick leave and emergencies
			const pastDate = new Date();
			pastDate.setDate(today.getDate() - 30); // Allow up to 30 days back
			return pastDate.toISOString().split('T')[0];
		}
		// For other types, minimum is today
		return today.toISOString().split('T')[0];
	});
</script>

<svelte:head>
	<title>Request Leave - SvelteHR</title>
	<meta name="description" content="Submit a new leave request" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard/leave/requests">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Requests
		</Button>

		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Calendar class="h-8 w-8" />
				Request Leave
			</h1>
			<p class="text-muted-foreground">Submit a new leave request for approval</p>
		</div>
	</div>

	<!-- Form -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Form -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Leave Request Details</Card.Title>
					<Card.Description>Fill out the form below to submit your leave request</Card.Description>
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

					<!-- Leave Type -->
					<div class="space-y-2">
						<Label for="type">Leave Type *</Label>
						<Select.Root
							selected={formData.type
								? {
										value: formData.type,
										label: leaveTypeOptions.find((opt) => opt.value === formData.type)?.label || ''
									}
								: undefined}
							onSelectedChange={(selected) => {
								formData.type = selected?.value || '';
							}}
						>
							<Select.Trigger>
								<Select.Value placeholder="Select leave type" />
							</Select.Trigger>
							<Select.Content>
								{#each leaveTypeOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if validationErrors.type}
							<p class="text-sm text-red-600">{validationErrors.type}</p>
						{/if}
					</div>

					<!-- Date Range -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="startDate">Start Date *</Label>
							<Input
								id="startDate"
								type="date"
								bind:value={formData.startDate}
								min={getMinDate}
								class={validationErrors.startDate ? 'border-red-500' : ''}
							/>
							{#if validationErrors.startDate}
								<p class="text-sm text-red-600">{validationErrors.startDate}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="endDate">End Date *</Label>
							<Input
								id="endDate"
								type="date"
								bind:value={formData.endDate}
								min={formData.startDate || getMinDate}
								class={validationErrors.endDate ? 'border-red-500' : ''}
							/>
							{#if validationErrors.endDate}
								<p class="text-sm text-red-600">{validationErrors.endDate}</p>
							{/if}
						</div>
					</div>

					<!-- Calculated Days -->
					{#if calculatedDays > 0}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
							<p class="text-sm text-blue-800">
								<strong>Duration:</strong>
								{calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
							</p>
							{#if validationErrors.days}
								<p class="mt-1 text-sm text-red-600">{validationErrors.days}</p>
							{/if}
						</div>
					{/if}

					<!-- Reason -->
					<div class="space-y-2">
						<Label for="reason">Reason *</Label>
						<Textarea
							id="reason"
							placeholder="Please provide a reason for your leave request..."
							bind:value={formData.reason}
							rows="4"
							class={validationErrors.reason ? 'border-red-500' : ''}
						/>
						{#if validationErrors.reason}
							<p class="text-sm text-red-600">{validationErrors.reason}</p>
						{/if}
					</div>

					<!-- Emergency checkbox -->
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="isEmergency"
							bind:checked={formData.isEmergency}
							class="rounded border-input"
						/>
						<Label for="isEmergency" class="text-sm">
							This is an emergency request (allows backdating)
						</Label>
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-between pt-4">
						<Button variant="outline" onclick={handleReset} disabled={loading}>Reset Form</Button>

						<div class="flex items-center space-x-2">
							<Button variant="outline" href="/dashboard/leave/requests" disabled={loading}>
								Cancel
							</Button>
							<Button onclick={handleSubmit} disabled={loading || !$currentUser}>
								{#if loading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<Send class="mr-2 h-4 w-4" />
								{/if}
								Submit Request
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Leave Balance -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Leave Balance</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if balanceQueryState.fetching}
						<div class="flex items-center space-x-2">
							<Loader2 class="h-4 w-4 animate-spin" />
							<span class="text-sm">Loading balance...</span>
						</div>
					{:else if balanceQueryState.error}
						<p class="text-sm text-red-600">Failed to load balance</p>
					{:else if formData.type && getLeaveBalance}
						{@const balance = getLeaveBalance}
						<div class="space-y-2">
							<div class="flex justify-between">
								<span class="text-sm font-medium">Total:</span>
								<span class="text-sm">{balance.total} days</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm font-medium">Used:</span>
								<span class="text-sm">{balance.used} days</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm font-medium">Available:</span>
								<span class="text-sm font-bold text-green-600">{balance.available} days</span>
							</div>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Select a leave type to view your balance</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Guidelines -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Leave Guidelines</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3 text-sm">
						<div>
							<strong>Vacation Leave:</strong>
							<p class="text-muted-foreground">Must be requested at least 2 weeks in advance</p>
						</div>
						<div>
							<strong>Sick Leave:</strong>
							<p class="text-muted-foreground">
								Can be submitted retroactively with medical documentation
							</p>
						</div>
						<div>
							<strong>Emergency Leave:</strong>
							<p class="text-muted-foreground">For urgent situations - requires manager approval</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
