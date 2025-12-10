<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import EmployeeDataTable from '$lib/components/ui/employee-datatable.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import EmployeeCreateDialog from '$lib/components/employees/EmployeeCreateDialog.svelte';
	import EmployeeStatistics from '$lib/components/employees/EmployeeStatistics.svelte';
	import {
		Building,
		Calendar,
		ChevronDown,
		Download,
		Edit,
		Eye,
		FileBarChart,
		Filter,
		Grid,
		List,
		Mail,
		MapPin,
		MoreHorizontal,
		Phone,
		Search,
		Settings2,
		Upload,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';

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
	const canDeleteEmployees = $derived(data.canDeleteEmployees);
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
	let showInactive = $state(false); // Checkbox state - default to NOT showing inactive (unchecked)
	let currentPage = $state(1);
	let pageSize = $state(20);
	let viewMode = $state<'grid' | 'list'>('list'); // Default to table view

	// Employee creation dialog state
	let createDialogOpen = $state(false);

	// Column visibility state for datatable
	// Managers and above can see all columns, employees see limited columns
	let columnVisibility = $state<Record<string, boolean>>({
		displayName: true,
		email: true,
		departmentId: true,
		role: true,
		hireDate: data.canViewInactiveEmployees, // Managers+ only
		isActive: data.canViewInactiveEmployees // Managers+ only
	});

	// Debounce timer for search
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Use server-provided autocomplete options (includes ALL employees, not just current page)
	const employeeSearchOptions = $derived(data.employeeAutocompleteOptions || []);

	// Check if any filters are active (for select-all checkbox enablement)
	const hasActiveFilters = $derived(
		searchTerms.length > 0 ||
			selectedDepartment !== '' ||
			selectedRole !== '' ||
			selectedStatus !== 'active' // Default is 'active', so any change means filter is active
	);

	// Sync with filters data using effects
	$effect(() => {
		// Parse comma-separated search terms from URL
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
		// Sync checkbox with status - checked when status is '' (all) or 'inactive'
		showInactive = status === '' || status === 'inactive';
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

	// Extract unique roles from loaded employees for role filter dropdown
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

	// Employee status options
	const statusOptions = [
		{ value: '', label: 'All Employees' },
		{ value: 'active', label: 'Active Only' },
		{ value: 'inactive', label: 'Inactive Only' }
	];

	// Handle search form submission
	function handleSearch() {
		const searchParams = new URLSearchParams();
		// Join multiple search terms with commas
		if (searchTerms.length > 0) {
			searchParams.set('search', searchTerms.join(','));
		}
		if (selectedDepartment) searchParams.set('department', selectedDepartment);
		if (selectedRole) searchParams.set('role', selectedRole);

		// Use selectedStatus dropdown value directly
		searchParams.set('status', selectedStatus);

		searchParams.set('page', '1'); // Reset to first page on new search
		if (pageSize !== 20) searchParams.set('limit', pageSize.toString());

		// Use goto with keepFocus to preserve input focus
		goto(`${currentPathname}?${searchParams.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	// Debounced search handler for live filtering
	function handleDebouncedSearch() {
		// Clear existing timer
		if (searchDebounceTimer) {
			clearTimeout(searchDebounceTimer);
		}

		// Set new timer to trigger search after 500ms of inactivity
		searchDebounceTimer = setTimeout(() => {
			handleSearch();
		}, 500);
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
		showInactive = false;
		pageSize = 20;

		// Navigate with status=active (show only active employees)
		const searchParams = new URLSearchParams();
		searchParams.set('status', 'active');
		goto(`${currentPathname}?${searchParams.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	// Get employee status badge variant
	function getStatusBadgeVariant(isActive: boolean): 'default' | 'secondary' | 'destructive' {
		return isActive ? 'default' : 'secondary';
	}

	// Format employee role display
	function formatRole(role: string): string {
		return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	// Format hire date
	function formatHireDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'N/A';
		}
	}

	// Handle employee creation success - refresh the page to show new employee
	function handleEmployeeCreated() {
		// Invalidate and reload the page data
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
				<EmployeeStatistics
					{totalActiveEmployees}
					{totalInactiveEmployees}
					{totalEmployees}
					departmentCount={departments.length}
					{canViewInactiveEmployees}
				/>

				<!-- Search and Filter Form -->
				<div class="space-y-4">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<!-- Search Input -->
						<div class="space-y-2">
							<label for="search" class="text-sm font-medium">Search</label>
							<MultiSearchInput
								bind:searchTerms
								options={employeeSearchOptions}
								onSearchChange={handleSearch}
								debounceMs={500}
								allowCustomTerms={true}
							/>
						</div>

						<!-- Department Filter -->
						<div class="space-y-2">
							<label for="department" class="text-sm font-medium">Department</label>
							<select
								id="department"
								bind:value={selectedDepartment}
								class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
								data-testid="employee-department-filter"
							>
								<option value="">All Departments</option>
								{#each departments as dept (dept.id)}
									<option value={dept.id}>{dept.name}</option>
								{/each}
							</select>
						</div>

						<!-- Page Size -->
						<div class="space-y-2">
							<label for="pagesize" class="text-sm font-medium">Per Page</label>
							<select
								id="pagesize"
								bind:value={pageSize}
								class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
					</div>

					<!-- Show Inactive Checkbox (managers and above only) -->
					{#if canViewInactiveEmployees}
						<div class="flex items-center space-x-2 pt-2">
							<input
								type="checkbox"
								id="showInactive"
								bind:checked={showInactive}
								onchange={() => {
									// Sync selectedStatus with checkbox state for server-side filtering
									selectedStatus = showInactive ? 'inactive' : 'active';
									handleSearch();
								}}
								class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
								data-testid="employee-status-filter"
							/>
							<label for="showInactive" class="cursor-pointer text-sm font-medium">
								Show Inactive Employees
							</label>
						</div>
					{/if}

					<div class="flex gap-2">
						<Button type="button" variant="outline" onclick={clearFilters}>Clear Filters</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Employee List/Grid -->
	{#if viewMode === 'grid'}
		<!-- Employee Grid -->
		<div class="space-y-6" data-testid="employee-list-container">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each employees as employee}
					<Card.Root class="transition-shadow hover:shadow-md" data-testid="employee-card">
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex items-center space-x-3">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
									>
										<Users class="h-6 w-6 text-primary" />
									</div>
									<div>
										<Card.Title class="text-lg">{employee.displayName}</Card.Title>
										<Card.Description
											>{employee.role ? formatRole(employee.role) : 'No role'}</Card.Description
										>
									</div>
								</div>
								<Badge variant={getStatusBadgeVariant(employee.isActive)}>
									{employee.isActive ? 'Active' : 'Inactive'}
								</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-3">
							<!-- Contact Information -->
							<div class="space-y-2">
								{#if employee.email}
									<div class="flex items-center text-sm text-muted-foreground">
										<Mail class="mr-2 h-4 w-4" />
										<a href="mailto:{employee.email}" class="hover:text-primary">{employee.email}</a
										>
									</div>
								{/if}

								{#if employee.phone}
									<div class="flex items-center text-sm text-muted-foreground">
										<Phone class="mr-2 h-4 w-4" />
										<a href="tel:{employee.phone}" class="hover:text-primary">{employee.phone}</a>
									</div>
								{/if}

								{#if employee.departmentId}
									{@const deptName = departments.find((d) => d.id === employee.departmentId)?.name}
									<div class="flex items-center text-sm text-muted-foreground">
										<Building class="mr-2 h-4 w-4" />
										<span>{deptName || 'Unknown Department'}</span>
									</div>
								{/if}

								{#if employee.role}
									<div class="flex items-center text-sm">
										<Badge variant="outline">{formatRole(employee.role)}</Badge>
									</div>
								{/if}

								{#if employee.hireDate}
									<div class="flex items-center text-sm text-muted-foreground">
										<Calendar class="mr-2 h-4 w-4" />
										<span>Hired {formatHireDate(employee.hireDate)}</span>
									</div>
								{/if}
							</div>

							<Separator />

							<!-- Actions -->
							<div class="flex gap-2">
								{#if canViewEmployees}
									<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}">
										<Eye class="mr-2 h-4 w-4" />
										View Profile
									</Button>
								{/if}
								{#if canEditEmployees}
									<Button
										variant="outline"
										size="sm"
										href="/dashboard/employees/{employee.id}/edit"
									>
										<Edit class="mr-2 h-4 w-4" />
										Edit
									</Button>
								{/if}
								{#if canCreateReviews}
									<Button
										variant="outline"
										size="sm"
										href="/dashboard/reviews?employee={employee.id}"
									>
										<FileBarChart class="mr-2 h-4 w-4" />
										Start Review
									</Button>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Pagination for grid view -->
			{#if totalPages > 1}
				<Card.Root data-testid="employee-pagination">
					<Card.Content class="py-4">
						<div class="flex items-center justify-between">
							<div class="text-sm text-muted-foreground">
								Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
									currentPage * pageSize,
									totalEmployees
								)} of {totalEmployees} employees
							</div>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={!hasPreviousPage}
									onclick={() => goToPage(currentPage - 1)}
								>
									Previous
								</Button>

								{#if totalPages <= 7}
									{#each Array(totalPages) as _, i (i)}
										<Button
											variant={currentPage === i + 1 ? 'default' : 'outline'}
											size="sm"
											onclick={() => goToPage(i + 1)}
										>
											{i + 1}
										</Button>
									{/each}
								{:else}
									<!-- Complex pagination with ellipsis -->
									<Button
										variant={currentPage === 1 ? 'default' : 'outline'}
										size="sm"
										onclick={() => goToPage(1)}
									>
										1
									</Button>

									{#if currentPage > 3}
										<span class="px-2 text-muted-foreground">...</span>
									{/if}

									{#each Array(Math.min(5, totalPages - 2)) as _, i}
										{@const pageNum = Math.max(2, Math.min(currentPage - 2 + i, totalPages - 1))}
										{#if pageNum >= 2 && pageNum <= totalPages - 1}
											<Button
												variant={currentPage === pageNum ? 'default' : 'outline'}
												size="sm"
												onclick={() => goToPage(pageNum)}
											>
												{pageNum}
											</Button>
										{/if}
									{/each}

									{#if currentPage < totalPages - 2}
										<span class="px-2 text-muted-foreground">...</span>
									{/if}

									<Button
										variant={currentPage === totalPages ? 'default' : 'outline'}
										size="sm"
										onclick={() => goToPage(totalPages)}
									>
										{totalPages}
									</Button>
								{/if}

								<Button
									variant="outline"
									size="sm"
									disabled={!hasNextPage}
									onclick={() => goToPage(currentPage + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<!-- DataTable View -->
		<div data-testid="employee-list-container" class="space-y-4">
			<!-- Filters and Controls Row -->
			<div class="flex items-end justify-between gap-3">
				<!-- Left: Filters -->
				<div class="flex items-end gap-3">
					<!-- Search Input -->
					<div class="w-96 space-y-2">
						<label for="search-inline" class="text-sm font-medium">Search</label>
						<MultiSearchInput
							bind:searchTerms
							options={employeeSearchOptions}
							onSearchChange={handleSearch}
							debounceMs={500}
							allowCustomTerms={true}
						/>
					</div>

					<!-- Department Filter -->
					<div class="w-40 space-y-2">
						<label for="department-inline" class="text-sm font-medium">Department</label>
						<select
							id="department-inline"
							bind:value={selectedDepartment}
							onchange={handleSearch}
							class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
							data-testid="employee-department-filter"
						>
							<option value="">All Departments</option>
							{#each departments as dept}
								<option value={dept.id}>{dept.name}</option>
							{/each}
						</select>
					</div>

					<!-- Role Filter -->
					<div class="w-36 space-y-2">
						<label for="role-inline" class="text-sm font-medium">Role</label>
						<select
							id="role-inline"
							bind:value={selectedRole}
							onchange={handleSearch}
							class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
						>
							<option value="">All Roles</option>
							{#each uniqueRoles as roleName (roleName)}
								<option value={roleName}>{roleName}</option>
							{/each}
						</select>
					</div>

					<!-- Status Filter (Managers and above only) -->
					{#if canViewInactiveEmployees}
						<div class="w-36 space-y-2">
							<label for="status-inline" class="text-sm font-medium">Status</label>
							<select
								id="status-inline"
								bind:value={selectedStatus}
								onchange={handleSearch}
								class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
								data-testid="employee-status-filter"
							>
								<option value="active">Active Only</option>
								<option value="">All Employees</option>
								<option value="inactive">Inactive Only</option>
							</select>
						</div>
					{/if}

					<!-- Clear Button -->
					<div class="space-y-2">
						<div class="invisible text-sm font-medium">Clear</div>
						<Button type="button" variant="outline" size="sm" onclick={clearFilters}>Clear</Button>
					</div>
				</div>

				<!-- Right: Controls -->
				<div class="flex items-end gap-2">
					<!-- Per Page Dropdown -->
					<div class="space-y-2">
						<div class="invisible text-sm font-medium">Per Page</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" size="sm" {...props}>
										Per Page: {pageSize}
										<ChevronDown class="ml-2 h-4 w-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-32">
								<DropdownMenu.Label>Rows per page</DropdownMenu.Label>
								<DropdownMenu.Separator />
								{#each [10, 20, 50, 100] as size (size)}
									<DropdownMenu.Item
										onclick={() => {
											pageSize = size;
											handleSearch();
										}}
										class={pageSize === size ? 'bg-accent' : ''}
									>
										{size}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>

					<!-- Column Visibility Dropdown -->
					<div class="space-y-2">
						<div class="invisible text-sm font-medium">Columns</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" size="sm" {...props}>
										<Settings2 class="mr-2 h-4 w-4" />
										Columns
										<ChevronDown class="ml-2 h-4 w-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-48">
								<DropdownMenu.Label>Toggle Columns</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.displayName}
									onCheckedChange={(value) => {
										columnVisibility = { ...columnVisibility, displayName: !!value };
									}}
								>
									Name
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.email}
									onCheckedChange={(value) => {
										columnVisibility = { ...columnVisibility, email: !!value };
									}}
								>
									Email
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.departmentId}
									onCheckedChange={(value) => {
										columnVisibility = { ...columnVisibility, departmentId: !!value };
									}}
								>
									Department
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.role}
									onCheckedChange={(value) => {
										columnVisibility = { ...columnVisibility, role: !!value };
									}}
								>
									Role
								</DropdownMenu.CheckboxItem>
								{#if canViewInactiveEmployees}
									<DropdownMenu.CheckboxItem
										checked={columnVisibility.hireDate}
										onCheckedChange={(value) => {
											columnVisibility = { ...columnVisibility, hireDate: !!value };
										}}
									>
										Hire Date
									</DropdownMenu.CheckboxItem>
									<DropdownMenu.CheckboxItem
										checked={columnVisibility.isActive}
										onCheckedChange={(value) => {
											columnVisibility = { ...columnVisibility, isActive: !!value };
										}}
									>
										Status
									</DropdownMenu.CheckboxItem>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</div>

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
