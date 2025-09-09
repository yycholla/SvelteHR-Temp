<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Users, UserPlus, UserCheck, UserX, TrendingUp, RefreshCw } from 'lucide-svelte';
	import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
	import { queries } from '$lib/graphql/queries.js';
	import { createSubscriptionStore } from '$lib/graphql/subscriptions.js';
	import { authStore } from '$lib/auth/store.js';
	import type { CardProps } from '../types.js';

	let { instance, metadata, data, loading: cardLoading, error: cardError, onRefresh }: CardProps = $props();
	
	// GraphQL client setup
	let graphqlClient: ReturnType<typeof createBrowserGraphQLClient> | null = null;
	let employeeSubscription: any = null;

	// State - Enhanced with real-time data
	let loading = $state(cardLoading || true);
	let error = $state<string | null>(cardError || null);
	let lastUpdated = $state<Date | null>(null);
	let stats = $state({
		totalEmployees: 0,
		activeEmployees: 0,
		newThisMonth: 0,
		inactiveEmployees: 0,
		averageHireDate: null as string | null,
		growthRate: 0,
		departmentCount: 0
	});

	// Live data from real-time subscription
	let live = $state<any>(data);
	
	// Derived stats for better visualization
	const growthPercentage = $derived(() => {
		if (stats.totalEmployees === 0) return 0;
		return Math.round((stats.newThisMonth / stats.totalEmployees) * 100);
	});

	const activePercentage = $derived(() => {
		if (stats.totalEmployees === 0) return 0;
		return Math.round((stats.activeEmployees / stats.totalEmployees) * 100);
	});

	// Initialize GraphQL client and load data
	async function initializeCard() {
		try {
			if (browser && !graphqlClient) {
				graphqlClient = createBrowserGraphQLClient();
				
				// Set authentication token
				if (authStore.token) {
					graphqlClient.setToken(authStore.token);
				}
			}
			
			await fetchEmployeeStats();
			setupSubscriptions();
			
		} catch (err) {
			console.error('Failed to initialize employee statistics card:', err);
			error = 'Failed to initialize card';
		}
	}

	// Fetch employee statistics using GraphQL
	async function fetchEmployeeStats() {
		if (!graphqlClient) return;
		
		try {
			loading = true;
			error = null;

			// Fetch dashboard metrics including employee statistics
			const response = await graphqlClient.query(
				queries.dashboard.employeeMetrics,
				{
					includeInactive: true,
					includeGrowthTrends: true
				}
			);

			if (response.data?.employeeMetrics) {
				const metrics = response.data.employeeMetrics;
				
				// Calculate current month statistics
				const now = new Date();
				const currentMonth = now.getMonth();
				const currentYear = now.getFullYear();

				stats = {
					totalEmployees: metrics.total || 0,
					activeEmployees: metrics.active || 0,
					newThisMonth: metrics.newHires?.thisMonth || 0,
					inactiveEmployees: metrics.inactive || 0,
					growthRate: metrics.growthRate || 0,
					departmentCount: metrics.departmentCount || 0,
					averageHireDate: null // Not critical for this view
				};
				
				lastUpdated = new Date();
			}

		} catch (err: any) {
			console.error('Failed to fetch employee statistics:', err);
			error = 'Failed to load employee statistics';
		} finally {
			loading = false;
		}
	}

	// Setup real-time subscriptions for employee updates
	function setupSubscriptions() {
		if (!browser || employeeSubscription) return;

		try {
			employeeSubscription = createSubscriptionStore(
				`subscription EmployeeStatisticsUpdates {
					employeeUpdated {
						employee {
							id
							status
							hire_date
						}
						action
						timestamp
					}
				}`,
				{},
				{
					onData: (data) => {
						if (data?.employeeUpdated) {
							// Refresh statistics when employees are updated
							fetchEmployeeStats();
						}
					},
					onError: (error) => {
						console.error('Employee subscription error:', error);
					}
				}
			);

		} catch (err) {
			console.error('Failed to setup employee statistics subscription:', err);
		}
	}

	// Manual refresh handler
	async function handleRefresh() {
		await fetchEmployeeStats();
		
		if (onRefresh) {
			await onRefresh();
		}
	}

	// Component lifecycle
	onMount(() => {
		if (!live) {
			initializeCard();
		} else {
			// Process initial live data
			processLiveData(live);
		}
	});

	onDestroy(() => {
		// Cleanup subscriptions
		if (employeeSubscription) {
			employeeSubscription.unsubscribe();
		}
	});

	// Process live data from parent dashboard
	function processLiveData(liveData: any) {
		if (!liveData) return;
		
		// Handle different data formats
		const employees = Array.isArray(liveData)
			? liveData
			: Array.isArray(liveData?.employees)
				? liveData.employees
				: Array.isArray(liveData?.data)
					? liveData.data
					: [];

		if (employees.length) {
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();

			const activeEmployees = employees.filter((emp: any) => 
				emp.status === 'active' || emp.onboardingStatus === 'Active'
			);
			
			const newThisMonth = employees.filter((emp: any) => {
				if (!emp.hire_date && !emp.hireDate) return false;
				const hireDate = new Date(emp.hire_date || emp.hireDate);
				return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
			});
			
			const inactiveEmployees = employees.filter((emp: any) =>
				emp.status === 'inactive' || emp.status === 'terminated' ||
				emp.onboardingStatus === 'Terminated' || emp.onboardingStatus === 'Inactive'
			);

			stats = {
				totalEmployees: employees.length,
				activeEmployees: activeEmployees.length,
				newThisMonth: newThisMonth.length,
				inactiveEmployees: inactiveEmployees.length,
				growthRate: employees.length > 0 ? (newThisMonth.length / employees.length) * 100 : 0,
				departmentCount: new Set(employees.map((emp: any) => emp.department_id || emp.departmentId).filter(Boolean)).size,
				averageHireDate: null
			};
			
			loading = false;
			error = null;
			lastUpdated = new Date();
		}
	}

	// Reactive effect for live data updates
	$effect(() => {
		if (data !== live) {
			live = data;
			if (live) {
				processLiveData(live);
			}
		}
	});
</script>

<div class="h-full overflow-hidden">
	{#if loading}
		<div class="flex h-full items-center justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="flex h-full items-center justify-center text-center">
			<div class="space-y-2">
				<UserX class="mx-auto h-8 w-8 text-destructive" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{:else}
		<div class="grid h-full grid-cols-2 gap-3">
			<!-- Total Employees -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-primary/5 p-3">
				<Users class="mb-1 h-6 w-6 text-primary" />
				<div class="text-2xl font-bold text-primary">{stats.totalEmployees}</div>
				<div class="text-center text-xs text-muted-foreground">Total</div>
			</div>

			<!-- Active Employees -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-green-50 p-3">
				<UserCheck class="mb-1 h-6 w-6 text-green-600" />
				<div class="text-2xl font-bold text-green-600">{stats.activeEmployees}</div>
				<div class="text-center text-xs text-muted-foreground">Active</div>
			</div>

			<!-- New This Month -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-3">
				<UserPlus class="mb-1 h-6 w-6 text-blue-600" />
				<div class="text-2xl font-bold text-blue-600">{stats.newThisMonth}</div>
				<div class="text-center text-xs text-muted-foreground">New</div>
			</div>

			<!-- Growth Rate -->
			<div class="flex flex-col items-center justify-center rounded-lg bg-orange-50 p-3">
				<TrendingUp class="mb-1 h-6 w-6 text-orange-600" />
				<div class="text-2xl font-bold text-orange-600">
					{growthPercentage()}%
				</div>
				<div class="text-center text-xs text-muted-foreground">Growth</div>
			</div>

			<!-- Last Updated Indicator -->
			{#if lastUpdated}
				<div class="mt-2 flex items-center justify-center text-xs text-muted-foreground">
					<RefreshCw class="mr-1 h-3 w-3" />
					<span>Updated {lastUpdated.toLocaleTimeString()}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
