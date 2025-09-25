<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		onboardingService,
		onboardingInstances,
		activeOnboardingInstances,
		completedOnboardingInstances,
		isLoadingOnboarding,
		onboardingError
	} from '$lib/services/onboardingService';
	import { currentUser, hasPermission } from '$lib/services/auth';
	import Button from '../base/Button.svelte';
	import Card from '../base/Card.svelte';
	import Badge from '../base/Badge.svelte';
	import type { OnboardingInstance } from '$lib/services/onboardingService';

	// Internal state
	let selectedTab: 'active' | 'completed' | 'all' = 'active';

	// Tab data
	$: tabData = {
		active: $activeOnboardingInstances,
		completed: $completedOnboardingInstances,
		all: $onboardingInstances
	};

	$: currentTabData = tabData[selectedTab];

	function getStatusVariant(
		status: string
	): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
		switch (status) {
			case 'PreHire':
				return 'secondary';
			case 'Onboarding':
				return 'warning';
			case 'Active':
				return 'success';
			case 'Terminated':
				return 'danger';
			default:
				return 'default';
		}
	}

	function getProgressColor(percentage: number): string {
		if (percentage >= 90) return 'bg-green-500';
		if (percentage >= 70) return 'bg-blue-500';
		if (percentage >= 40) return 'bg-yellow-500';
		return 'bg-gray-400';
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return 'Not set';
		return new Date(dateString).toLocaleDateString();
	}

	function getDaysElapsed(startDate?: string): string {
		if (!startDate) return 'Not started';
		const start = new Date(startDate);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return `${diffDays} days`;
	}

	onMount(() => {
		onboardingService.loadInstances({ reset: true });
		onboardingService.loadTemplates();
	});
</script>

<div class="onboarding-dashboard">
	<!-- Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<h1 class="text-2xl font-bold text-gray-900">Onboarding Dashboard</h1>
			<p class="mt-1 text-sm text-gray-600">Monitor and manage employee onboarding progress</p>
		</div>

		<div class="header-actions">
			{#if $currentUser && hasPermission('onboarding:create')}
				<Button variant="primary" leftIcon="user-plus" on:click={() => goto('/onboarding/new')}>
					Start Onboarding
				</Button>
			{/if}
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="stats-grid">
		<Card padding="md" class="stat-card">
			<div class="stat-content">
				<div class="stat-value">{$activeOnboardingInstances.length}</div>
				<div class="stat-label">Active Onboarding</div>
				<div class="stat-icon active">
					<i class="icon-user-check h-6 w-6"></i>
				</div>
			</div>
		</Card>

		<Card padding="md" class="stat-card">
			<div class="stat-content">
				<div class="stat-value">{$completedOnboardingInstances.length}</div>
				<div class="stat-label">Completed This Month</div>
				<div class="stat-icon completed">
					<i class="icon-check-circle h-6 w-6"></i>
				</div>
			</div>
		</Card>

		<Card padding="md" class="stat-card">
			<div class="stat-content">
				<div class="stat-value">
					{$activeOnboardingInstances.length > 0
						? Math.round(
								$activeOnboardingInstances.reduce(
									(acc, curr) => acc + curr.completion_percentage,
									0
								) / $activeOnboardingInstances.length
							)
						: 0}%
				</div>
				<div class="stat-label">Average Progress</div>
				<div class="stat-icon progress">
					<i class="icon-trending-up h-6 w-6"></i>
				</div>
			</div>
		</Card>

		<Card padding="md" class="stat-card">
			<div class="stat-content">
				<div class="stat-value">
					{$activeOnboardingInstances.filter(
						(i) => i.expected_completion_date && new Date(i.expected_completion_date) < new Date()
					).length}
				</div>
				<div class="stat-label">Overdue</div>
				<div class="stat-icon overdue">
					<i class="icon-alert-triangle h-6 w-6"></i>
				</div>
			</div>
		</Card>
	</div>

	<!-- Tabs -->
	<div class="dashboard-tabs">
		<div class="tab-list">
			<button
				class="tab-button"
				class:active={selectedTab === 'active'}
				on:click={() => (selectedTab = 'active')}
			>
				Active ({$activeOnboardingInstances.length})
			</button>
			<button
				class="tab-button"
				class:active={selectedTab === 'completed'}
				on:click={() => (selectedTab = 'completed')}
			>
				Completed ({$completedOnboardingInstances.length})
			</button>
			<button
				class="tab-button"
				class:active={selectedTab === 'all'}
				on:click={() => (selectedTab = 'all')}
			>
				All ({$onboardingInstances.length})
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="dashboard-content">
		{#if $isLoadingOnboarding}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<span class="text-sm text-gray-600">Loading onboarding data...</span>
			</div>
		{:else if $onboardingError}
			<Card padding="md" class="error-card">
				<div class="error-content">
					<i class="icon-alert-circle h-5 w-5 text-red-500"></i>
					<div>
						<h3 class="text-sm font-medium text-gray-900">Error Loading Onboarding Data</h3>
						<p class="text-sm text-gray-600">{$onboardingError}</p>
						<Button
							variant="secondary"
							size="sm"
							leftIcon="refresh-cw"
							on:click={() => onboardingService.loadInstances({ reset: true })}
							class="mt-2"
						>
							Retry
						</Button>
					</div>
				</div>
			</Card>
		{:else if currentTabData.length === 0}
			<Card padding="lg" class="empty-state">
				<div class="empty-content">
					<i class="icon-users mx-auto h-12 w-12 text-gray-400"></i>
					<h3 class="mt-4 text-lg font-medium text-gray-900">
						{selectedTab === 'active'
							? 'No active onboarding'
							: selectedTab === 'completed'
								? 'No completed onboarding'
								: 'No onboarding instances found'}
					</h3>
					<p class="mt-2 text-sm text-gray-600">
						{selectedTab === 'active'
							? 'There are no employees currently going through onboarding.'
							: selectedTab === 'completed'
								? 'No employees have completed onboarding recently.'
								: 'Get started by creating your first onboarding process.'}
					</p>
					{#if $currentUser && hasPermission('onboarding:create')}
						<Button
							variant="primary"
							size="md"
							leftIcon="user-plus"
							on:click={() => goto('/onboarding/new')}
							class="mt-4"
						>
							Start Onboarding
						</Button>
					{/if}
				</div>
			</Card>
		{:else}
			<div class="onboarding-grid">
				{#each currentTabData as instance (instance.id)}
					<Card padding="md" class="onboarding-card">
						<div class="card-header">
							<div class="employee-info">
								<h3 class="employee-name">
									{instance.employee?.display_name || `Employee ${instance.employee_id}`}
								</h3>
								<p class="employee-title">
									{instance.employee?.job_title || 'New Employee'}
								</p>
							</div>
							<Badge variant={getStatusVariant(instance.status)} size="sm">
								{instance.status}
							</Badge>
						</div>

						<div class="card-content">
							<!-- Progress Bar -->
							<div class="progress-section">
								<div class="progress-header">
									<span class="progress-label">Progress</span>
									<span class="progress-percentage">{instance.completion_percentage}%</span>
								</div>
								<div class="progress-bar">
									<div
										class="progress-fill {getProgressColor(instance.completion_percentage)}"
										style="width: {instance.completion_percentage}%"
									></div>
								</div>
							</div>

							<!-- Details -->
							<div class="details-grid">
								<div class="detail-item">
									<span class="detail-label">Start Date</span>
									<span class="detail-value">{formatDate(instance.start_date)}</span>
								</div>
								<div class="detail-item">
									<span class="detail-label">Duration</span>
									<span class="detail-value">{getDaysElapsed(instance.start_date)}</span>
								</div>
								{#if instance.assigned_buddy}
									<div class="detail-item">
										<span class="detail-label">Buddy</span>
										<span class="detail-value">{instance.assigned_buddy.display_name}</span>
									</div>
								{/if}
								{#if instance.manager}
									<div class="detail-item">
										<span class="detail-label">Manager</span>
										<span class="detail-value">{instance.manager.display_name}</span>
									</div>
								{/if}
							</div>
						</div>

						<div class="card-actions">
							<Button
								variant="secondary"
								size="sm"
								leftIcon="eye"
								on:click={() => goto(`/onboarding/${instance.id}`)}
							>
								View Details
							</Button>

							{#if $currentUser && hasPermission('onboarding:update') && instance.status === 'Onboarding'}
								<Button
									variant="primary"
									size="sm"
									leftIcon="check"
									on:click={() => goto(`/onboarding/${instance.id}/tasks`)}
								>
									Manage Tasks
								</Button>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	.onboarding-dashboard {
		@apply space-y-6;
	}

	/* Header */
	.dashboard-header {
		@apply flex items-start justify-between;
	}

	.header-content h1 {
		@apply text-2xl font-bold text-gray-900;
	}

	.header-content p {
		@apply mt-1 text-sm text-gray-600;
	}

	.header-actions {
		@apply flex items-center space-x-3;
	}

	/* Stats Grid */
	.stats-grid {
		@apply grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4;
	}

	.stat-content {
		@apply relative;
	}

	.stat-value {
		@apply text-3xl font-bold text-gray-900;
	}

	.stat-label {
		@apply mt-1 text-sm font-medium text-gray-600;
	}

	.stat-icon {
		@apply absolute right-0 top-0 rounded-lg p-3;
	}

	.stat-icon.active {
		@apply bg-blue-100 text-blue-600;
	}

	.stat-icon.completed {
		@apply bg-green-100 text-green-600;
	}

	.stat-icon.progress {
		@apply bg-purple-100 text-purple-600;
	}

	.stat-icon.overdue {
		@apply bg-red-100 text-red-600;
	}

	/* Tabs */
	.dashboard-tabs {
		@apply border-b border-gray-200;
	}

	.tab-list {
		@apply flex space-x-8;
	}

	.tab-button {
		@apply border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700;
	}

	.tab-button.active {
		@apply border-blue-500 text-blue-600;
	}

	/* Content */
	.dashboard-content {
		@apply mt-6;
	}

	.loading-state {
		@apply flex items-center justify-center space-x-3 py-12;
	}

	.loading-spinner {
		@apply h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600;
	}

	.error-card .error-content {
		@apply flex items-start space-x-3;
	}

	.empty-state .empty-content {
		@apply py-12 text-center;
	}

	/* Onboarding Grid */
	.onboarding-grid {
		@apply grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3;
	}

	.onboarding-card {
		@apply transition-shadow hover:shadow-md;
	}

	.card-header {
		@apply mb-4 flex items-start justify-between;
	}

	.employee-name {
		@apply text-lg font-semibold text-gray-900;
	}

	.employee-title {
		@apply text-sm text-gray-600;
	}

	.card-content {
		@apply space-y-4;
	}

	/* Progress Section */
	.progress-section {
		@apply space-y-2;
	}

	.progress-header {
		@apply flex items-center justify-between;
	}

	.progress-label {
		@apply text-sm font-medium text-gray-700;
	}

	.progress-percentage {
		@apply text-sm font-semibold text-gray-900;
	}

	.progress-bar {
		@apply h-2 w-full rounded-full bg-gray-200;
	}

	.progress-fill {
		@apply h-2 rounded-full transition-all duration-300;
	}

	/* Details Grid */
	.details-grid {
		@apply grid grid-cols-2 gap-3;
	}

	.detail-item {
		@apply space-y-1;
	}

	.detail-label {
		@apply text-xs font-medium uppercase tracking-wide text-gray-500;
	}

	.detail-value {
		@apply text-sm text-gray-900;
	}

	/* Card Actions */
	.card-actions {
		@apply mt-4 flex items-center space-x-2 border-t pt-4;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.dashboard-header {
			@apply flex-col items-start space-y-4;
		}

		.stats-grid {
			@apply grid-cols-2;
		}

		.onboarding-grid {
			@apply grid-cols-1;
		}

		.tab-list {
			@apply space-x-4;
		}
	}
</style>
