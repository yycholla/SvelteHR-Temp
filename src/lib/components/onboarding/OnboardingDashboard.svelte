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
			{#if auth.user && auth.hasPermission('onboarding:create')}
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
		{#if auth.isLoadingOnboarding}
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
					{#if auth.user && auth.hasPermission('onboarding:create')}
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

							{#if auth.user && auth.hasPermission('onboarding:update') && instance.status === 'Onboarding'}
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
