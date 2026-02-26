<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import EmployeeDataTable from '$lib/components/ui/employee-datatable.svelte';
	import EmployeeCreateDialog from '$lib/components/employees/EmployeeCreateDialog.svelte';
	import { Download, Grid, List, Upload, UserPlus, Users } from '@lucide/svelte';

	// Import decomposed components
	import EmployeeFilters from './components/EmployeeFilters.svelte';
	import EmployeeGrid from './components/EmployeeGrid.svelte';

	// Lazy-load EmployeeStatistics component (includes chart library)
	let EmployeeStatistics: any = $state(null);
	onMount(async () => {
		const module = await import('$lib/components/employees/EmployeeStatistics.svelte');
		EmployeeStatistics = module.default;
	});

	// Subscribe to page store at top level
	const currentUrl = $derived($page.url);
	const currentPathname = $derived(currentUrl.pathname);
	const currentSearchParams = $derived(currentUrl.searchParams);

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			employees: any[];
			totalEmployees: number;
			totalActiveEmployees: number;
			totalInactiveEmployees: number;
			departments: any[];
			validRoles: any[];
			employeeAutocompleteOptions: Array<{ value: string; label: string; email?: string }>;
			filters: {
				searchTerm: string;
				departmentFilter: string;
				roleFilter: string;
				statusFilter: string;
				page: number;
				limit: number;
			};
			permissions: string[];
			// Granular employee permissions
			canViewEmployees: boolean;
			canEditEmployees: boolean;
			canDeleteEmployees: boolean;
			canCreateEmployees: boolean;
			// Legacy permissions for backward compatibility
			canManageEmployees: boolean;
			canViewInactiveEmployees: boolean;
			canCreateReviews: boolean;
			loadedAt: string;
		};
	}

	const { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const employees = $derived(data.employees);
	const totalEmployees = $derived(data.totalEmployees);
	const totalActiveEmployees = $derived(data.totalActiveEmployees);
	const totalInactiveEmployees = $derived(data.totalInactiveEmployees);
	const departments = $derived(data.departments);
	const validRoles = $derived(data.validRoles);
	const filters = $derived(data.filters);
	const permissions = $derived(data.permissions);
	// Granular employee permissions
	const canViewEmployees = $derived(data.canViewEmployees);
	const canEditEmployees = $derived(data.canEditEmployees);
	const canCreateEmployees = $derived(data.canCreateEmployees);
	// Legacy permissions
	const canManageEmployees = $derived(data.canManageEmployees);
	const canViewInactiveEmployees = $derived(data.canViewInactiveEmployees);
	const canCreateReviews = $derived(data.canCreateReviews);

	// Local state for filters and search
	let searchTerms = $state<string[]>([]);
	let selectedDepartment = $state('');
	let selectedRole = $state('');
	let selectedStatus = $state('active'); // Default to active only
	let currentPage = $state(1);
	let pageSize = $state(20);
	let viewMode = $state<'grid' | 'list'>('list'); // Default to table view

	// Employee creation dialog state
	let createDialogOpen = $state(false);

	// Column visibility state for datatable
	let columnVisibility = $state<Record<string, boolean>>({
		displayName: true,
		email: true,
		departmentId: true,
		role: true,
		hireDate: data.canViewInactiveEmployees, // Managers+ only
		isActive: data.canViewInactiveEmployees // Managers+ only
	});

	// Use server-provided autocomplete options
	const employeeSearchOptions = $derived(data.employeeAutocompleteOptions || []);

	// Check if any filters are active
	const hasActiveFilters = $derived(
		searchTerms.length > 0 ||
			selectedDepartment !== '' ||
			selectedRole !== '' ||
			selectedStatus !== 'active'
	);

	// Sync with filters data using effects
	$effect(() => {
		const searchParam = data.filters.searchTerm || '';
		searchTerms = searchParam
			? searchParam
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
	});
	$effect(() => {
		selectedDepartment = data.filters.departmentFilter || '';
	});
	$effect(() => {
		selectedRole = data.filters.roleFilter || '';
	});
	$effect(() => {
		const status = data.filters.statusFilter || 'active';
		selectedStatus = status;
	});
	$effect(() => {
		currentPage = data.filters.page || 1;
	});
	$effect(() => {
		pageSize = data.filters.limit || 20;
	});

	// Pagination state
	const totalPages = $derived(Math.ceil(totalEmployees / pageSize));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Extract unique roles
	const uniqueRoles = $derived.by(() => {
		const roleSet = new Set<string>();
		employees.forEach((emp) => {
			if (emp.roles && Array.isArray(emp.roles)) {
				emp.roles.forEach((role: any) => {
					if (role.name) roleSet.add(role.name);
				});
			}
		});
		return Array.from(roleSet).sort();
	});

	// Handle search form submission
	function handleSearch() {
		const searchParams = new URLSearchParams();
		if (searchTerms.length > 0) {
			searchParams.set('search', searchTerms.join(','));
		}
		if (selectedDepartment) searchParams.set('department', selectedDepartment);
		if (selectedRole) searchParams.set('role', selectedRole);
		searchParams.set('status', selectedStatus);

		searchParams.set('page', '1');
		if (pageSize !== 20) searchParams.set('limit', pageSize.toString());

		goto(`${currentPathname}?${searchParams.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	// Handle pagination
	function goToPage(pageNum: number) {
		if (pageNum < 1 || pageNum > totalPages) return;

		const searchParams = new URLSearchParams(currentSearchParams);
		searchParams.set('page', pageNum.toString());
		goto(`${currentPathname}?${searchParams.toString()}`);
	}

	// Handle clear filters
	function clearFilters() {
		searchTerms = [];
		selectedDepartment = '';
		selectedRole = '';
		selectedStatus = 'active';
		pageSize = 20;

		const searchParams = new URLSearchParams();
		searchParams.set('status', 'active');
		goto(`${currentPathname}?${searchParams.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function getStatusBadgeVariant(isActive: boolean): 'default' | 'secondary' | 'destructive' {
		return isActive ? 'default' : 'secondary';
	}

	function formatRole(role: string): string {
		return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function formatHireDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'N/A';
		}
	}

	function handleEmployeeCreated() {
		goto(currentPathname, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Employee Directory - MountainHR</title>
	<meta name="description" content="Browse and manage employees in the organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6" data-testid="employee-directory">
	<div class="flex items-center justify-between">
		{#if canManageEmployees}
			<ButtonGroup.Root>
				<Button variant="outline" size="sm" href="/dashboard/employees/import">
					<Upload class="mr-2 h-4 w-4" />
					Import
				</Button>
				<Button variant="outline" size="sm">
					<Download class="mr-2 h-4 w-4" />
					Export
				</Button>
			</ButtonGroup.Root>
		{/if}

		<div class="flex gap-2">
			{#if canManageEmployees}
				<Button
					size="sm"
					onclick={() => (createDialogOpen = true)}
					data-testid="employee-add-button"
				>
					<UserPlus class="mr-2 h-4 w-4" />
					Add Employee
				</Button>
			{/if}
			<ButtonGroup.Root>
				<Button
					variant={viewMode === 'grid' ? 'default' : 'outline'}
					size="icon"
					onclick={() => (viewMode = 'grid')}
					title="Grid view"
				>
					<Grid class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'list' ? 'default' : 'outline'}
					size="icon"
					onclick={() => (viewMode = 'list')}
					title="Table view"
				>
					<List class="h-4 w-4" />
				</Button>
			</ButtonGroup.Root>
		</div>
	</div>

	<!-- Search and Filters (Grid View Only) -->
	{#if viewMode === 'grid'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Employee Overview & Filters</Card.Title>
				<Card.Description>View statistics and search employees</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if EmployeeStatistics}
					{@const Statistics = EmployeeStatistics}
					<Statistics
						{totalActiveEmployees}
						{totalInactiveEmployees}
						{totalEmployees}
						departmentCount={departments.length}
						{canViewInactiveEmployees}
					/>
				{:else}
					<!-- Loading placeholder for statistics -->
					<div class="h-24 animate-pulse bg-gray-100 dark:bg-gray-800 rounded"></div>
				{/if}

				<div class="space-y-4 mt-4">
					<EmployeeFilters
						layout="vertical"
						bind:searchTerms
						bind:selectedDepartment
						bind:selectedRole
						bind:selectedStatus
						bind:pageSize
						{departments}
						{uniqueRoles}
						{employeeSearchOptions}
						{canViewInactiveEmployees}
						onSearch={handleSearch}
						onClear={clearFilters}
						onPageSizeChange={(size) => {
							pageSize = size;
							handleSearch();
						}}
					/>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Employee List/Grid -->
	{#if viewMode === 'grid'}
		<EmployeeGrid
			{employees}
			{departments}
			{canViewEmployees}
			{canEditEmployees}
			{canCreateReviews}
			{getStatusBadgeVariant}
			{formatRole}
			{formatHireDate}
			{totalPages}
			{currentPage}
			{pageSize}
			{totalEmployees}
			{hasPreviousPage}
			{hasNextPage}
			onPageChange={goToPage}
		/>
	{:else}
		<!-- DataTable View -->
		<div data-testid="employee-list-container" class="space-y-4">
			<EmployeeFilters
				layout="horizontal"
				bind:searchTerms
				bind:selectedDepartment
				bind:selectedRole
				bind:selectedStatus
				bind:pageSize
				bind:columnVisibility
				{departments}
				{uniqueRoles}
				{employeeSearchOptions}
				{canViewInactiveEmployees}
				onSearch={handleSearch}
				onClear={clearFilters}
				onPageSizeChange={(size) => {
					pageSize = size;
					handleSearch();
				}}
			/>

			<EmployeeDataTable
				{employees}
				{departments}
				{canViewEmployees}
				{canEditEmployees}
				{canViewInactiveEmployees}
				{hasActiveFilters}
				userDepartmentId={user?.departmentId}
				isManager={user?.role === 'manager'}
				{currentPage}
				{pageSize}
				{totalPages}
				onPageChange={goToPage}
				onPageSizeChange={(newSize) => {
					pageSize = newSize;
					handleSearch();
				}}
				showPerPageControl={false}
				columnVisibilityState={columnVisibility}
				onColumnVisibilityChange={(newVisibility) => {
					columnVisibility = newVisibility;
				}}
			/>
		</div>
	{/if}

	<!-- Empty State -->
	{#if employees.length === 0}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<Users class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No employees found</h3>
					<p class="text-muted-foreground">
						{#if filters.searchTerm || filters.departmentFilter || filters.statusFilter}
							Try adjusting your search criteria or clearing filters.
						{:else}
							No employees have been added to the system yet.
						{/if}
					</p>
					{#if canManageEmployees && !filters.searchTerm && !filters.departmentFilter && !filters.statusFilter}
						<Button class="mt-4" onclick={() => (createDialogOpen = true)}>
							<UserPlus class="mr-2 h-4 w-4" />
							Add First Employee
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Employee Creation Dialog -->
<EmployeeCreateDialog
	bind:open={createDialogOpen}
	onOpenChange={(open) => (createDialogOpen = open)}
	departments={departments.map((d) => ({ id: d.id, name: d.name }))}
	roles={data.validRoles || []}
	onSuccess={handleEmployeeCreated}
/>
