<!--
T043: Fix management index page with standardized error handling
Modern Svelte 5 implementation with server-side data loading and comprehensive management dashboard
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Import decomposed components
	import ManagementAlerts from './components/ManagementAlerts.svelte';
	import ManagementMetricsCards from './components/ManagementMetricsCards.svelte';
	import ManagementPerformance from './components/ManagementPerformance.svelte';
	import ManagementQuickActions from './components/ManagementQuickActions.svelte';
	import ManagementTeamSummary from './components/ManagementTeamSummary.svelte';

	// Define props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			dashboardAnalytics: {
				leaveRequests: {
					pending: number;
					approved: number;
					rejected: number;
					totalThisMonth: number;
				};
				performanceReviews: {
					pending: number;
					overdue: number;
					completed: number;
					avgRating: number;
				};
				teamGoals: {
					active: number;
					overdue: number;
					atRisk: number;
					avgProgress: number;
					completed: number;
				};
				reports: {
					generated: number;
					scheduled: number;
					failed: number;
					totalThisMonth: number;
				};
				teamStats: {
					totalEmployees: number;
					activeEmployees: number;
					departmentCount: number;
					avgTenure: string;
				};
			};
			recentActivities: Array<{
				id: string;
				type: string;
				title: string;
				description: string;
				timestamp: string;
				icon: string;
				color: string;
				href: string;
			}>;
			performanceMetrics: Array<{
				label: string;
				value: number;
				target: number;
				color: string;
			}>;
			alerts: Array<{
				type: 'error' | 'warning' | 'info';
				title: string;
				message: string;
				action: string;
				href: string;
			}>;
			quickActions: Array<{
				title: string;
				description: string;
				icon: string;
				href: string;
				count: number;
				color: string;
			}>;
			filters: {
				selectedPeriod: string;
				selectedTeamId: string;
			};
			permissions: string[];
			canManageLeave: boolean;
			canManageReviews: boolean;
			canManageGoals: boolean;
			canGenerateReports: boolean;
			loadedAt: string;
		};
	}

	// Destructure props using Svelte 5 runes
	const { data }: Props = $props();

	// Derived state from server-side data
	const dashboardAnalytics = $derived(data.dashboardAnalytics);
	const recentActivities = $derived(data.recentActivities);
	const performanceMetrics = $derived(data.performanceMetrics);
	const alerts = $derived(data.alerts);
	const quickActions = $derived(data.quickActions);
	const filters = $derived(data.filters);

	// Local reactive state using Svelte 5 runes
	let selectedPeriod = $state('this-month');
	let selectedTeamId = $state('');

	// Sync with filters data using effects
	$effect(() => {
		selectedPeriod = filters.selectedPeriod || 'this-month';
	});
	$effect(() => {
		selectedTeamId = filters.selectedTeamId || '';
	});

	// Functions
	function updateFilters() {
		const searchParams = new URLSearchParams($page.url.searchParams);

		if (selectedPeriod !== 'this-month') searchParams.set('period', selectedPeriod);
		else searchParams.delete('period');

		if (selectedTeamId) searchParams.set('team', selectedTeamId);
		else searchParams.delete('team');

		const queryString = searchParams.toString();
		const url = queryString ? `${$page.url.pathname}?${queryString}` : $page.url.pathname;
		goto(url, { invalidateAll: true });
	}
</script>

<!-- Page Header -->
<div class="mb-8">
	<div class="mb-4">
		<h1 class="text-3xl font-bold text-foreground">Management Overview</h1>
		<p class="mt-2 text-muted-foreground">Your team management dashboard and key metrics</p>
	</div>

	<!-- Alerts Section -->
	<ManagementAlerts {alerts} />
</div>

<!-- Key Metrics Cards -->
<ManagementMetricsCards {dashboardAnalytics} />

<!-- Performance and Activity -->
<ManagementPerformance
	{performanceMetrics}
	{recentActivities}
	bind:selectedPeriod
	bind:selectedTeamId
	onUpdateFilters={updateFilters}
/>

<!-- Quick Actions -->
<ManagementQuickActions {quickActions} />

<!-- Team Performance Summary -->
<ManagementTeamSummary {dashboardAnalytics} />
