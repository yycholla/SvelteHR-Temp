<script lang="ts">
	import { UserCheck, Clock, CheckCircle, AlertCircle, Users, Calendar, Plus } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import type { Employee } from '$lib/schemas/employee';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Extract data from server load
	const onboardingEmployees = data.onboardingEmployees || [];
	const stats = data.stats || { total: 0, preHire: 0, onboarding: 0, active: 0, overdue: 0 };
	let statusFilter = $state(data.filters?.status || 'all');

	function getStatusVariant(status: string) {
		switch (status) {
			case 'Active': return 'default';
			case 'Onboarding': return 'secondary';
			case 'PreHire': return 'outline';
			default: return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'Active': return CheckCircle;
			case 'Onboarding': return Clock;
			case 'PreHire': return UserCheck;
			default: return AlertCircle;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Not set';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}

	function getOnboardingProgress(employee: Employee): number {
		// Mock progress calculation - in real app this would be based on completed tasks
		switch (employee.status) {
			case 'PreHire': return 10;
			case 'Onboarding': return 65;
			case 'Active': return 100;
			default: return 0;
		}
	}

	function getDaysElapsed(hireDate: string | null): number {
		if (!hireDate) return 0;
		const hire = new Date(hireDate);
		const now = new Date();
		const diffTime = now.getTime() - hire.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// Apply filters when status filter changes
	async function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		
		if (statusFilter !== 'all') {
			params.set('status', statusFilter);
		} else {
			params.delete('status');
		}

		await goto(`${$page.route.id}?${params.toString()}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	// Clear filters
	function clearFilters() {
		statusFilter = 'all';
		goto($page.route.id || '/hr/onboarding', {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head>
	<title>HR - Employee Onboarding - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Onboarding</h1>
		<p class="text-gray-600 dark:text-gray-400">Track and manage employee onboarding progress</p>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-4 mb-8">
		<Card class="bg-white dark:bg-gray-800 rounded-lg shadow">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Employees</CardTitle>
				<Users class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.total}</div>
				<p class="text-xs text-muted-foreground">All tracked employees</p>
			</CardContent>
		</Card>

		<Card class="bg-white dark:bg-gray-800 rounded-lg shadow">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Pre-Hire</CardTitle>
				<UserCheck class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.preHire}</div>
				<p class="text-xs text-muted-foreground">Awaiting start date</p>
			</CardContent>
		</Card>

		<Card class="bg-white dark:bg-gray-800 rounded-lg shadow">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">In Progress</CardTitle>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.onboarding}</div>
				<p class="text-xs text-muted-foreground">Currently onboarding</p>
			</CardContent>
		</Card>

		<Card class="bg-white dark:bg-gray-800 rounded-lg shadow">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Completed</CardTitle>
				<CheckCircle class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.active}</div>
				<p class="text-xs text-muted-foreground">Successfully onboarded</p>
			</CardContent>
		</Card>
	</div>

	<!-- Filter Controls -->
	<Card class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
		<CardHeader>
			<CardTitle>Filter by Status</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex gap-4">
				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={statusFilter}
					onchange={applyFilters}
				>
					<option value="all">All Statuses</option>
					<option value="PreHire">Pre-Hire</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Active">Active</option>
				</select>
				
				<Button variant="outline" onclick={clearFilters}>
					Clear Filter
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Onboarding List -->
	<Card class="bg-white dark:bg-gray-800 rounded-lg shadow">
		<CardHeader>
			<CardTitle>Employee Onboarding Status</CardTitle>
			<CardDescription>
				Track progress for all employees in the onboarding process
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.error}
				<div class="text-center py-8">
					<p class="text-destructive">{data.error}</p>
					<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			{:else if onboardingEmployees.length === 0}
				<div class="text-center py-8">
					<UserCheck class="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 class="mt-4 text-lg font-semibold">No employees found</h3>
					<p class="mt-2 text-muted-foreground">
						{statusFilter !== 'all' 
							? 'No employees match the selected filter'
							: 'No employees are currently in the onboarding process'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each onboardingEmployees as employee}
						{@const StatusIcon = getStatusIcon(employee.status)}
						{@const progress = getOnboardingProgress(employee)}
						{@const daysElapsed = getDaysElapsed(employee.hireDate)}
						
						<div class="border border-border/50 rounded-lg p-4">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center space-x-4">
									<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
										<span class="text-sm font-medium text-primary">
											{employee.first_name[0]}{employee.last_name[0]}
										</span>
									</div>
									<div>
										<h3 class="font-medium text-foreground">
											{employee.first_name} {employee.last_name}
										</h3>
										<p class="text-sm text-muted-foreground">
											{employee.job_title} • {employee.department?.name || 'No department'}
										</p>
									</div>
								</div>
								
								<div class="flex items-center space-x-3">
									<div class="flex items-center space-x-1">
										<StatusIcon class="h-4 w-4" />
										<Badge variant={getStatusVariant(employee.status)}>
											{employee.status}
										</Badge>
									</div>
								</div>
							</div>

							<div class="space-y-3">
								<!-- Progress Bar -->
								<div>
									<div class="flex items-center justify-between text-sm mb-1">
										<span class="font-medium">Onboarding Progress</span>
										<span class="text-muted-foreground">{progress}%</span>
									</div>
									<Progress value={progress} class="h-2" />
								</div>

								<!-- Key Information -->
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
									<div>
										<span class="font-medium">Hire Date:</span>
										<p class="text-muted-foreground">{formatDate(employee.hireDate)}</p>
									</div>
									<div>
										<span class="font-medium">Email:</span>
										<p class="text-muted-foreground">{employee.email || 'Not provided'}</p>
									</div>
									<div>
										<span class="font-medium">Time Since Hire:</span>
										<p class="text-muted-foreground">
											{daysElapsed > 0 ? `${daysElapsed} days` : 'Not started'}
										</p>
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="flex items-center space-x-2 pt-2">
									<Button variant="outline" size="sm">
										View Details
									</Button>
									<Button variant="outline" size="sm">
										View Tasks
									</Button>
									{#if employee.status !== 'Active'}
										<Button size="sm">
											Continue Onboarding
										</Button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Quick Actions -->
	<Card class="bg-white dark:bg-gray-800 rounded-lg shadow mt-6">
		<CardHeader>
			<CardTitle>Quick Actions</CardTitle>
			<CardDescription>
				Common onboarding tasks and shortcuts
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
				>
					<UserCheck class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Create Onboarding</p>
						<p class="text-xs text-muted-foreground">Start new hire process</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
				>
					<CheckCircle class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Bulk Complete</p>
						<p class="text-xs text-muted-foreground">Mark multiple tasks done</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
				>
					<Calendar class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Schedule Check-in</p>
						<p class="text-xs text-muted-foreground">Plan follow-up meetings</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
				>
					<AlertCircle class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">View Overdue</p>
						<p class="text-xs text-muted-foreground">Check delayed items</p>
					</div>
				</Button>
			</div>
		</CardContent>
	</Card>
</div>