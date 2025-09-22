<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import { executeQuery } from '$lib/graphql/client';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Calendar as CalendarIcon,
		ArrowLeft,
		AlertTriangle,
		Send,
		Loader2,
		Info,
		CheckCircle,
		Clock
	} from 'lucide-svelte';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if submitting leave for own user
	const isOwnLeave = $derived($currentUser?.id === userId);

	// Form state
	let formData = $state({
		startDate: '',
		endDate: '',
		reason: '',
		requestType: ''
	});

	let loading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let validationErrors = $state<Record<string, string>>({});
	let successMessage = $state<string | null>(null);
	let userLeaveBalance = $state<any>(null);

	// GraphQL queries
	const GET_USER_LEAVE_BALANCE = `
		query GetUserLeaveBalance($userId: UUID!) {
			userById(id: $userId) {
				id
				displayName
				email
			}

			allLeaveBalances(condition: { employeeId: $userId }) {
				nodes {
					id
					accruedHours
					usedHours
					pendingHours
					availableHours
					year
					leavePolicyByLeavePolicyId {
						name
						leaveType
						description
					}
				}
			}
		}
	`;

	const CREATE_LEAVE_REQUEST = `
		mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
			createLeaveRequest(input: $input) {
				leaveRequest {
					id
					startDate
					endDate
					reason
					status
					createdAt
				}
			}
		}
	`;

	// Helper functions
	function convertHoursToDays(hours: number | null | undefined): number {
		if (!hours) return 0;
		// Assuming 8 hours = 1 day
		return Math.floor(hours / 8);
	}

	function calculateDays(startDate: string, endDate: string): number {
		if (!startDate || !endDate) return 0;
		const start = new Date(startDate);
		const end = new Date(endDate);

		// If end date is before start date, return 0
		if (end < start) return 0;

		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
		return diffDays;
	}

	function validateForm(): boolean {
		validationErrors = {};

		if (!formData.startDate) {
			validationErrors.startDate = 'Start date is required';
		}

		if (!formData.endDate) {
			validationErrors.endDate = 'End date is required';
		}

		if (formData.startDate && formData.endDate) {
			const startDate = new Date(formData.startDate);
			const endDate = new Date(formData.endDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (startDate < today) {
				validationErrors.startDate = 'Start date cannot be in the past';
			}

			if (endDate < startDate) {
				validationErrors.endDate = 'End date cannot be before start date';
			}

			// Check if requesting more than 30 days
			const requestedDays = calculateDays(formData.startDate, formData.endDate);
			if (requestedDays > 30) {
				validationErrors.endDate = 'Cannot request more than 30 consecutive days';
			}
		}

		if (!formData.requestType) {
			validationErrors.requestType = 'Request type is required';
		}

		if (!formData.reason?.trim()) {
			validationErrors.reason = 'Reason is required';
		} else if (formData.reason.trim().length < 10) {
			validationErrors.reason = 'Reason must be at least 10 characters';
		}

		return Object.keys(validationErrors).length === 0;
	}

	async function loadLeaveBalance() {
		if (!userId) return;

		loading = true;
		error = null;

		try {
			const { client } = await import('$lib/graphql/client');

			const data = await executeQuery(client, GET_USER_LEAVE_BALANCE, {
				userId
			});

			if (data.errors) {
				throw new Error(data.errors[0].message);
			}

			// Process leave balances by policy type
			const leaveBalances = data.allLeaveBalances?.nodes || [];
			userLeaveBalance = {
				vacation: leaveBalances.find(b => b.leavePolicyByLeavePolicyId?.leaveType === 'VACATION'),
				sick: leaveBalances.find(b => b.leavePolicyByLeavePolicyId?.leaveType === 'SICK'),
				personal: leaveBalances.find(b => b.leavePolicyByLeavePolicyId?.leaveType === 'PERSONAL')
			};
		} catch (err) {
			console.error('Error loading leave balance:', err);
			error = err instanceof Error ? err.message : 'Failed to load leave balance';
		} finally {
			loading = false;
		}
	}

	async function submitRequest() {
		if (!validateForm()) return;
		if (!userId) {
			error = 'User ID not found';
			return;
		}

		submitting = true;
		error = null;
		successMessage = null;

		try {
			const { client } = await import('$lib/graphql/client');

			const input = {
				leaveRequest: {
					employeeId: userId,
					startDate: formData.startDate,
					endDate: formData.endDate,
					reason: formData.reason.trim(),
					status: 'pending'
				}
			};

			const data = await executeQuery(client, CREATE_LEAVE_REQUEST, { input });

			if (data.errors) {
				throw new Error(data.errors[0].message);
			}

			successMessage = 'Leave request submitted successfully!';

			// Reset form
			formData = {
				startDate: '',
				endDate: '',
				reason: '',
				requestType: 'vacation'
			};

			// Redirect to leave requests page after a delay
			setTimeout(() => {
				goto(`/dashboard/users/${userId}/leave/requests`);
			}, 2000);

		} catch (err) {
			console.error('Error creating leave request:', err);
			error = err instanceof Error ? err.message : 'Failed to submit leave request';
		} finally {
			submitting = false;
		}
	}

	// Computed values
	const calculatedDays = $derived(() => {
		return calculateDays(formData.startDate, formData.endDate);
	});

	const isFormValid = $derived(() => {
		return formData.startDate &&
			   formData.endDate &&
			   formData.reason?.trim() &&
			   Object.keys(validationErrors).length === 0;
	});

	onMount(() => {
		loadLeaveBalance();
	});
</script>

<svelte:head>
	<title>New Leave Request - SvelteHR</title>
	<meta name="description" content="Submit a new leave request" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" onclick={() => goto('/dashboard')}>
			<ArrowLeft class="h-4 w-4" />
		</Button>

		<div>
			<div class="flex items-center gap-3">
				<CalendarIcon class="h-8 w-8 text-primary" />
				<h1 class="text-3xl font-bold tracking-tight">New Leave Request</h1>
			</div>
			<p class="text-muted-foreground">Submit a request for time off</p>
		</div>
	</div>

	<!-- Success Message -->
	{#if successMessage}
		<Card.Root class="border-green-200 bg-green-50">
			<Card.Content class="p-4">
				<div class="flex items-center gap-3">
					<CheckCircle class="h-5 w-5 text-green-600" />
					<p class="text-green-800">{successMessage}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Error Message -->
	{#if error}
		<Card.Root class="border-red-200 bg-red-50">
			<Card.Content class="p-4">
				<div class="flex items-center gap-3">
					<AlertTriangle class="h-5 w-5 text-red-600" />
					<p class="text-red-800">{error}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Form -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Leave Request Details</Card.Title>
					<Card.Description>Fill out the form below to submit your leave request</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Request Type -->
					<div class="space-y-2">
						<Label for="requestType">Request Type</Label>
						<Select.Root type="single" bind:value={formData.requestType}>
							<Select.Trigger class={validationErrors.requestType ? 'border-red-500' : ''}>
								{formData.requestType === 'vacation' ? 'Vacation' :
								 formData.requestType === 'sick' ? 'Sick Leave' :
								 formData.requestType === 'personal' ? 'Personal Day' :
								 formData.requestType === 'family' ? 'Family Emergency' :
								 formData.requestType === 'other' ? 'Other' : 'Select request type'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="vacation">Vacation</Select.Item>
								<Select.Item value="sick">Sick Leave</Select.Item>
								<Select.Item value="personal">Personal Day</Select.Item>
								<Select.Item value="family">Family Emergency</Select.Item>
								<Select.Item value="other">Other</Select.Item>
							</Select.Content>
						</Select.Root>
						{#if validationErrors.requestType}
							<p class="text-sm text-red-500">{validationErrors.requestType}</p>
						{/if}
					</div>

					<!-- Date Range -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="startDate">Start Date</Label>
							<Input
								type="date"
								id="startDate"
								bind:value={formData.startDate}
								class={validationErrors.startDate ? 'border-red-500' : ''}
								min={new Date().toISOString().split('T')[0]}
							/>
							{#if validationErrors.startDate}
								<p class="text-sm text-red-500">{validationErrors.startDate}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="endDate">End Date</Label>
							<Input
								type="date"
								id="endDate"
								bind:value={formData.endDate}
								class={validationErrors.endDate ? 'border-red-500' : ''}
								min={formData.startDate || new Date().toISOString().split('T')[0]}
							/>
							{#if validationErrors.endDate}
								<p class="text-sm text-red-500">{validationErrors.endDate}</p>
							{/if}
						</div>
					</div>

					<!-- Duration Display -->
					{#if calculatedDays > 0}
						<div class="rounded-lg bg-blue-50 p-4">
							<div class="flex items-center gap-2">
								<Info class="h-4 w-4 text-blue-600" />
								<span class="text-sm font-medium text-blue-800">
									Duration: {calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
								</span>
							</div>
						</div>
					{/if}

					<!-- Reason -->
					<div class="space-y-2">
						<Label for="reason">Reason for Leave</Label>
						<Textarea
							id="reason"
							placeholder="Please provide a brief explanation for your leave request..."
							bind:value={formData.reason}
							class={validationErrors.reason ? 'border-red-500' : ''}
							rows={4}
						/>
						{#if validationErrors.reason}
							<p class="text-sm text-red-500">{validationErrors.reason}</p>
						{/if}
						<p class="text-xs text-muted-foreground">
							{formData.reason?.length || 0} characters (minimum 10 required)
						</p>
					</div>

					<Separator />

					<!-- Submit Button -->
					<div class="flex items-center justify-between">
						<Button
							variant="outline"
							onclick={() => goto(`/dashboard/users/${userId}/leave/requests`)}
						>
							Cancel
						</Button>

						<Button
							onclick={submitRequest}
							disabled={!isFormValid || submitting}
						>
							{#if submitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Submitting...
							{:else}
								<Send class="mr-2 h-4 w-4" />
								Submit Request
							{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar Info -->
		<div class="space-y-6">
			<!-- Leave Balance -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Leave Balance</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if loading}
						<div class="flex items-center justify-center py-4">
							<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					{:else if userLeaveBalance}
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm">Vacation Days</span>
								<Badge variant="outline">
									{convertHoursToDays(userLeaveBalance.vacation?.availableHours)}
								</Badge>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm">Sick Days</span>
								<Badge variant="outline">
									{convertHoursToDays(userLeaveBalance.sick?.availableHours)}
								</Badge>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm">Personal Days</span>
								<Badge variant="outline">
									{convertHoursToDays(userLeaveBalance.personal?.availableHours)}
								</Badge>
							</div>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">No leave balance data available</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Guidelines -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Request Guidelines</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div class="flex items-start gap-2">
						<Clock class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
						<p>Submit requests at least 2 weeks in advance when possible</p>
					</div>
					<div class="flex items-start gap-2">
						<CalendarIcon class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
						<p>Maximum 30 consecutive days per request</p>
					</div>
					<div class="flex items-start gap-2">
						<Info class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
						<p>Emergency requests may be approved on shorter notice</p>
					</div>
					<div class="flex items-start gap-2">
						<CheckCircle class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
						<p>You'll receive an email notification when reviewed</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Recent Requests -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Quick Actions</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					<Button
						variant="outline"
						size="sm"
						class="w-full justify-start"
						href={`/dashboard/users/${$currentUser?.id}/leave/requests`}
					>
						<CalendarIcon class="mr-2 h-4 w-4" />
						View My Requests
					</Button>
					<Button
						variant="outline"
						size="sm"
						class="w-full justify-start"
						href={`/dashboard/users/${$currentUser?.id}/attendance`}
					>
						<Clock class="mr-2 h-4 w-4" />
						View Attendance
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>