<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employee-operations';
	import { auth } from '$lib/stores/auth.svelte';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Grid, List, Plus, RefreshCw, Search, Users } from '@lucide/svelte';

	/**
	 * Employee List Component (shadcn-svelte version)
	 * Main interface for browsing, searching, and managing employees
	 */

	interface Props {
		initialFilters?: EmployeeFilters;
		compactView?: boolean;
		showFilters?: boolean;
		showAddButton?: boolean;
		maxHeight?: string;
	}

	interface EmployeeFilters {
		search?: string;
		department?: string;
		role?: string;
		status?: string;
		manager?: string;
	}

	interface Employee {
		id: string;
		email: string;
		displayName: string;
		jobTitle?: string;
		onboardingStatus: string;
		createdAt: string;
		lastLoginAt?: string;
		departmentId?: string;
		managerId?: string;
		roles: Array<{ role: string }>;
		department?: { id: string; name: string };
		manager?: { id: string; displayName: string; email: string };
		directReports: { aggregate: { count: number } };
	}

	const {
		initialFilters = {},
		compactView = false,
		showFilters = true,
		showAddButton = true,
		maxHeight = '600px'
	}: Props = $props();

	// State
	let filters: EmployeeFilters = $state({ ...initialFilters });
	let currentPage = $state(1);
	const itemsPerPage = 20;
	let viewMode: 'grid' | 'table' = $state('table');
	let selectedEmployees: string[] = $state([]);

	// Direct client instance to avoid context timing issues
	const client = createUrqlClient();

	// Initialize query store immediately with direct client
	let usersQuery: any = $state(null);
	let clientReady = $state(false);

	onMount(() => {
		// Initialize the query with the direct client
		try {
			logger.info(`URQL client:: ${client}`);

			if (!client?.createRequestOperation) {
				throw new Error('URQL client is not properly initialized');
			}

			logger.info('URQL client validated, initializing query...');
			clientReady = true;
			usersQuery = queryStore({
				client,
				query: GET_EMPLOYEES_QUERY,
				variables: {
					limit: itemsPerPage,
					offset: 0
				}
			});
		} catch (error) {
			logger.error('Catch failed', error as Error);
			clientReady = false;
		}

		// Auto-refresh every 5 minutes
		const interval = setInterval(refresh, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});

	// Client-side search filter
	const searchFilter = $derived(() => {
		if (!filters.search) return null;
		const search = filters.search.toLowerCase();
		return (employee: Employee) =>
			employee.displayName?.toLowerCase().includes(search) ||
			employee.email?.toLowerCase().includes(search);
	});

	// Store query state in reactive variables to avoid direct store access in derived
	let queryState = $state<{
		fetching: boolean;
		error: { message: string } | null;
		data: { users: Employee[] } | null;
	}>({ fetching: true, error: null, data: null });

	// Update query state when usersQuery changes
	$effect(() => {
		if (usersQuery) {
			// Subscribe to query store changes
			const unsubscribe = usersQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};

				// Capture the rerun function
				if (state.rerun) {
					rerunQuery = () => state.rerun({ requestPolicy: 'network-only' });
				}

				logger.info('URQL Query State:', {
					fetching: state.fetching,
					error: state.error,
					dataNodes: state.data?.users?.length || 0
				});
			});

			return unsubscribe;
		}
	});

	// Filter results client-side for search
	const filteredEmployees: Employee[] = $derived.by(() => {
		if (!queryState.data) return [];
		const employees = queryState.data?.users || [];
		if (!searchFilter) return employees;
		return employees.filter(searchFilter);
	});

	// Derived values for display
	const employees = $derived(filteredEmployees);
	const totalCount = $derived(employees.length);
	const totalPages = $derived(Math.ceil(totalCount / itemsPerPage));
	const loading = $derived(!clientReady || queryState.fetching);
	const error = $derived(queryState.error);

	// Handle filter changes
	const handleFiltersChange = (newFilters: EmployeeFilters) => {
		filters = { ...newFilters };
		currentPage = 1; // Reset to first page
	};

	// Handle pagination
	const handlePageChange = (page: number) => {
		currentPage = page;
	};

	// Handle selection
	const toggleSelection = (employeeId: string) => {
		if (selectedEmployees.includes(employeeId)) {
			selectedEmployees = selectedEmployees.filter((id) => id !== employeeId);
		} else {
			selectedEmployees = [...selectedEmployees, employeeId];
		}
	};

	const selectAll = () => {
		selectedEmployees = employees.map((emp: Employee) => emp.id);
	};

	const clearSelection = () => {
		selectedEmployees = [];
	};

	// Bulk actions
	const handleBulkAction = (action: string) => {
		switch (action) {
			case 'export':
				exportSelected();
				break;
			case 'deactivate':
				deactivateSelected();
				break;
			default:
				logger.info(`Bulk action: ${action} for ${selectedEmployees}`);
		}
	};

	const exportSelected = () => {
		// TODO: Implement export functionality
		logger.info(`Exporting employees:: ${selectedEmployees}`);
	};

	const deactivateSelected = () => {
		// TODO: Implement bulk deactivation
		logger.info(`Deactivating employees:: ${selectedEmployees}`);
	};

	// Store the rerun function separately to avoid reactive access
	let rerunQuery: (() => void) | null = null;

	// Refresh data
	const refresh = () => {
		if (rerunQuery) {
			rerunQuery();
		}
	};

	// Get status badge variant
	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'active':
			case 'completed':
				return 'default';
			case 'invited':
				return 'secondary';
			case 'in_progress':
				return 'outline';
			case 'terminated':
				return 'destructive';
			default:
				return 'secondary';
		}
	};
</script>

<div class="space-y-4">
	<!-- Header with actions -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-2">
			<Users class="h-5 w-5" />
			<h2 class="text-lg font-semibold">
				Employees
				{#if totalCount > 0}
					<span class="text-sm font-normal text-muted-foreground">({totalCount})</span>
				{/if}
			</h2>

			{#if selectedEmployees.length > 0}
				<Badge variant="outline">
					{selectedEmployees.length} selected
				</Badge>
				<Button variant="ghost" size="sm" onclick={clearSelection}>Clear</Button>
			{/if}
		</div>

		<div class="flex items-center space-x-2">
			<!-- Search -->
			<div class="relative">
				<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search employees..."
					value={filters.search || ''}
					oninput={(e) =>
						handleFiltersChange({
							...filters,
							search: (e.target as HTMLInputElement).value
						})}
					class="w-64 pl-8"
				/>
			</div>

			<!-- View toggle -->
			<div class="flex rounded-lg border p-1">
				<Button
					variant={viewMode === 'table' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'table')}
				>
					<List class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'grid' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'grid')}
				>
					<Grid class="h-4 w-4" />
				</Button>
			</div>

			<!-- Add employee button -->
			{#if showAddButton}
				<RoleGuard permissions={['hr:manage', 'admin:*']}>
					<Button>
						<Plus class="mr-2 h-4 w-4" />
						Add Employee
					</Button>
				</RoleGuard>
			{/if}

			<!-- Refresh button -->
			<Button variant="outline" size="sm" onclick={refresh} disabled={loading}>
				<RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</div>

	<!-- Loading state -->
	{#if loading && !queryState.data}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-8">
				<div class="flex items-center space-x-2">
					<RefreshCw class="h-4 w-4 animate-spin" />
					<p>Loading employees...</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Error state -->
	{#if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="space-y-4 text-center">
					<h3 class="text-lg font-semibold">Failed to load employees</h3>
					<p class="text-muted-foreground">{error.message}</p>
					<Button variant="outline" onclick={refresh}>Try Again</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Employee data -->
	{#if !loading && !error && employees.length === 0}
		<Card.Root>
			<Card.Content class="py-12">
				<div class="space-y-4 text-center">
					<Users class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="text-lg font-semibold">No employees found</h3>
					<p class="text-muted-foreground">
						{#if Object.values(filters).some(Boolean)}
							Try adjusting your filters or search terms.
						{:else}
							Get started by adding your first employee.
						{/if}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if employees.length > 0}
		{#if viewMode === 'table'}
			<!-- Table view -->
			<Card.Root>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">
								<input
									type="checkbox"
									checked={selectedEmployees.length === employees.length}
									onchange={() =>
										selectedEmployees.length === employees.length ? clearSelection() : selectAll()}
									class="rounded border-input"
								/>
							</Table.Head>
							<Table.Head>Employee</Table.Head>
							<Table.Head>Job Title</Table.Head>
							<Table.Head>Department</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Reports</Table.Head>
							<Table.Head>Last Login</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each employees as employee (employee.id)}
							<Table.Row>
								<Table.Cell>
									<input
										type="checkbox"
										checked={selectedEmployees.includes(employee.id)}
										onchange={() => toggleSelection(employee.id)}
										class="rounded border-input"
									/>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center space-x-3">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
										>
											{employee.displayName?.charAt(0) || '?'}
										</div>
										<div>
											<div class="font-medium">{employee.displayName}</div>
											<div class="text-sm text-muted-foreground">{employee.email}</div>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm">{employee.jobTitle || '-'}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm">{employee.department?.name || '-'}</span>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusVariant(employee.onboardingStatus)}>
										{employee.onboardingStatus}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm">{employee.directReports.aggregate.count}</span>
								</Table.Cell>
								<Table.Cell>
									<span class="text-sm text-muted-foreground">
										{employee.lastLoginAt
											? new Date(employee.lastLoginAt).toLocaleDateString()
											: 'Never'}
									</span>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Root>
		{:else}
			<!-- Grid view -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each employees as employee (employee.id)}
					<Card.Root class="cursor-pointer transition-shadow hover:shadow-md">
						<Card.Content class="p-6">
							<div class="flex items-start space-x-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
								>
									{employee.displayName?.charAt(0) || '?'}
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="truncate font-semibold">{employee.displayName}</h4>
									<p class="truncate text-sm text-muted-foreground">{employee.email}</p>
									{#if employee.jobTitle}
										<p class="truncate text-sm text-muted-foreground">{employee.jobTitle}</p>
									{/if}
									{#if employee.department}
										<p class="truncate text-sm text-muted-foreground">{employee.department.name}</p>
									{/if}
									<div class="mt-2">
										<Badge variant={getStatusVariant(employee.onboardingStatus)} class="text-xs">
											{employee.onboardingStatus}
										</Badge>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}

		<!-- Simple pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === 1}
					onclick={() => handlePageChange(currentPage - 1)}
				>
					Previous
				</Button>
				<span class="text-sm text-muted-foreground">
					Page {currentPage} of {totalPages} ({totalCount} total)
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage === totalPages}
					onclick={() => handlePageChange(currentPage + 1)}
				>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>
