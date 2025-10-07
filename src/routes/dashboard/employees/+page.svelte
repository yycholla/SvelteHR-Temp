<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Users,
		Search,
		Filter,
		UserPlus,
		Mail,
		Phone,
		MapPin,
		Building,
		Calendar,
		Eye,
		Edit,
		MoreHorizontal,
		Download,
		Upload,
		FileBarChart,
		Grid,
		List
	} from 'lucide-svelte';
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
			departments: any[];
			filters: {
				searchTerm: string;
				departmentFilter: string;
				statusFilter: string;
				page: number;
				limit: number;
			};
			permissions: string[];
			canManageEmployees: boolean;
			canViewInactiveEmployees: boolean;
			canCreateReviews: boolean;
			loadedAt: string;
		};
	}

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const employees = $derived(data.employees);
	const totalEmployees = $derived(data.totalEmployees);
	const departments = $derived(data.departments);
	const filters = $derived(data.filters);
	const permissions = $derived(data.permissions);
	const canManageEmployees = $derived(data.canManageEmployees);
	const canViewInactiveEmployees = $derived(data.canViewInactiveEmployees);
	const canCreateReviews = $derived(data.canCreateReviews);

	// Local state for filters and search
	let searchTerm = $state('');
	let selectedDepartment = $state('');
	let selectedStatus = $state('active'); // Default to active only
	let showInactive = $state(false); // Checkbox state - default to NOT showing inactive (unchecked)
	let currentPage = $state(1);
	let pageSize = $state(20);
	let viewMode = $state<'grid' | 'list'>('list'); // Default to table view

	// Sync with filters data using effects
	$effect(() => {
		searchTerm = filters.searchTerm || '';
	});
	$effect(() => {
		selectedDepartment = filters.departmentFilter || '';
	});
	$effect(() => {
		const status = filters.statusFilter || 'active';
		selectedStatus = status;
		// Sync checkbox with status - checked when status is '' (all) or 'inactive'
		showInactive = status === '' || status === 'inactive';
	});
	$effect(() => {
		currentPage = filters.page || 1;
	});
	$effect(() => {
		pageSize = filters.limit || 20;
	});

	// Pagination state
	const totalPages = $derived(Math.ceil(totalEmployees / pageSize));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Statistics derived from server data
	const employeeStats = $derived({
		totalEmployees,
		activeEmployees: employees.filter((emp) => emp.isActive === true).length,
		inactiveEmployees: employees.filter((emp) => emp.isActive === false).length,
		departmentCount: departments.length
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
		if (searchTerm) searchParams.set('search', searchTerm);
		if (selectedDepartment) searchParams.set('department', selectedDepartment);

		// Set status based on showInactive checkbox
		if (showInactive) {
			searchParams.set('status', ''); // Show all employees
		} else {
			searchParams.set('status', 'active'); // Show only active employees
		}

		searchParams.set('page', '1'); // Reset to first page on new search
		if (pageSize !== 20) searchParams.set('limit', pageSize.toString());

		goto(`${currentPathname}?${searchParams.toString()}`);
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
		searchTerm = '';
		selectedDepartment = '';
		selectedStatus = 'active';
		showInactive = false;
		pageSize = 20;

		// Navigate with status=active (show only active employees)
		const searchParams = new URLSearchParams();
		searchParams.set('status', 'active');
		goto(`${currentPathname}?${searchParams.toString()}`);
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
</script>

<svelte:head>
	<title>Employee Directory - SvelteHR</title>
	<meta name="description" content="Browse and manage employees in the organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Employee Directory</h1>
			<p class="text-muted-foreground">Manage and browse employees in your organization</p>
		</div>

		{#if canManageEmployees}
			<div class="flex gap-2">
				<Button variant="outline" size="sm">
					<Upload class="mr-2 h-4 w-4" />
					Import Employees
				</Button>
				<Button variant="outline" size="sm">
					<Download class="mr-2 h-4 w-4" />
					Export Directory
				</Button>
				<Button size="sm" href="/dashboard/employees/new">
					<UserPlus class="mr-2 h-4 w-4" />
					Add Employee
				</Button>
			</div>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{employeeStats.totalEmployees}</div>
				<p class="text-xs text-muted-foreground">
					across {employeeStats.departmentCount} departments
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Active Employees</Card.Title>
				<Users class="h-4 w-4 text-green-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{employeeStats.activeEmployees}</div>
				<p class="text-xs text-muted-foreground">
					{Math.round((employeeStats.activeEmployees / employeeStats.totalEmployees) * 100)}% of
					total
				</p>
			</Card.Content>
		</Card.Root>

		{#if canViewInactiveEmployees}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Inactive Employees</Card.Title>
					<Users class="h-4 w-4 text-gray-500" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold text-gray-600">{employeeStats.inactiveEmployees}</div>
					<p class="text-xs text-muted-foreground">requires attention</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Page Results</Card.Title>
				<Filter class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{employees.length}</div>
				<p class="text-xs text-muted-foreground">
					showing page {currentPage} of {totalPages}
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- View Mode Toggle -->
	<div class="flex justify-end gap-2">
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
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Search & Filter Employees</Card.Title>
			<Card.Description>Find employees by name, department, or status</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSearch(e);
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<!-- Search Input -->
					<div class="space-y-2">
						<label for="search" class="text-sm font-medium">Search</label>
						<div class="relative">
							<Search
								class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								id="search"
								type="text"
								placeholder="Search by name or email..."
								bind:value={searchTerm}
								class="pl-9"
							/>
						</div>
					</div>

					<!-- Department Filter -->
					<div class="space-y-2">
						<label for="department" class="text-sm font-medium">Department</label>
						<select
							id="department"
							bind:value={selectedDepartment}
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="">All Departments</option>
							{#each departments as dept}
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
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
							onchange={handleSearch}
							class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
						/>
						<label for="showInactive" class="text-sm font-medium cursor-pointer">
							Show Inactive Employees
						</label>
					</div>
				{/if}

				<div class="flex gap-2">
					<Button type="submit">
						<Search class="mr-2 h-4 w-4" />
						Search
					</Button>
					<Button type="button" variant="outline" on:click={clearFilters}>Clear Filters</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Employee List/Grid -->
	{#if viewMode === 'grid'}
		<!-- Employee Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each employees as employee}
				<Card.Root class="transition-shadow hover:shadow-md">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between">
						<div class="flex items-center space-x-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
								<Users class="h-6 w-6 text-primary" />
							</div>
							<div>
								<Card.Title class="text-lg">{employee.displayName || employee.fullName}</Card.Title>
								<Card.Description>{employee.jobTitle || 'No title'}</Card.Description>
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
								<a href="mailto:{employee.email}" class="hover:text-primary">{employee.email}</a>
							</div>
						{/if}

						{#if employee.phone}
							<div class="flex items-center text-sm text-muted-foreground">
								<Phone class="mr-2 h-4 w-4" />
								<a href="tel:{employee.phone}" class="hover:text-primary">{employee.phone}</a>
							</div>
						{/if}

						{#if employee.department}
							<div class="flex items-center text-sm text-muted-foreground">
								<Building class="mr-2 h-4 w-4" />
								<span>{employee.department.name}</span>
							</div>
						{/if}

						{#if employee.hireDate}
							<div class="flex items-center text-sm text-muted-foreground">
								<Calendar class="mr-2 h-4 w-4" />
								<span>Hired {formatHireDate(employee.hireDate)}</span>
							</div>
						{/if}

						{#if employee.role}
							<div class="flex items-center text-sm">
								<Badge variant="outline">{formatRole(employee.role)}</Badge>
							</div>
						{/if}
					</div>

					<Separator />

					<!-- Actions -->
					<div class="flex gap-2">
						<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}">
							<Eye class="mr-2 h-4 w-4" />
							View Profile
						</Button>
						{#if canManageEmployees}
							<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}/edit">
								<Edit class="mr-2 h-4 w-4" />
								Edit
							</Button>
						{/if}
						{#if canCreateReviews}
							<Button variant="outline" size="sm" href="/dashboard/reviews?employee={employee.id}">
								<FileBarChart class="mr-2 h-4 w-4" />
								Start Review
							</Button>
						{/if}
					</div>
				</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<!-- Table View -->
		<div class="border rounded-lg overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Department</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Hire Date</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each employees as employee (employee.id)}
						<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/employees/${employee.id}`)}>
							<Table.Cell>
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
										<Users class="h-5 w-5 text-primary" />
									</div>
									<div>
										<div class="font-medium">{employee.displayName || employee.fullName}</div>
										{#if employee.jobTitle}
											<div class="text-sm text-muted-foreground">{employee.jobTitle}</div>
										{/if}
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if employee.email}
									<a href="mailto:{employee.email}" class="text-sm hover:text-primary" onclick={(e) => e.stopPropagation()}>
										{employee.email}
									</a>
								{:else}
									<span class="text-sm text-muted-foreground">N/A</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if employee.department}
									<span class="text-sm">{employee.department.name}</span>
								{:else}
									<span class="text-sm text-muted-foreground">N/A</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if employee.role}
									<Badge variant="outline">{formatRole(employee.role)}</Badge>
								{:else}
									<span class="text-sm text-muted-foreground">N/A</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">
									{employee.hireDate ? formatHireDate(employee.hireDate) : 'N/A'}
								</span>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusBadgeVariant(employee.isActive)}>
									{employee.isActive ? 'Active' : 'Inactive'}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex gap-1 justify-end">
									<Button
										variant="ghost"
										size="sm"
										href="/dashboard/employees/{employee.id}"
										onclick={(e) => e.stopPropagation()}
									>
										<Eye class="h-4 w-4" />
									</Button>
									{#if canManageEmployees}
										<Button
											variant="ghost"
											size="sm"
											href="/dashboard/employees/{employee.id}/edit"
											onclick={(e) => e.stopPropagation()}
										>
											<Edit class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
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
						<Button class="mt-4" href="/dashboard/employees/new">
							<UserPlus class="mr-2 h-4 w-4" />
							Add First Employee
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<Card.Root>
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
							on:click={() => goToPage(currentPage - 1)}
						>
							Previous
						</Button>

						{#if totalPages <= 7}
							{#each Array(totalPages) as _, i}
								<Button
									variant={currentPage === i + 1 ? 'default' : 'outline'}
									size="sm"
									on:click={() => goToPage(i + 1)}
								>
									{i + 1}
								</Button>
							{/each}
						{:else}
							<!-- Complex pagination with ellipsis -->
							<Button
								variant={currentPage === 1 ? 'default' : 'outline'}
								size="sm"
								on:click={() => goToPage(1)}
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
										on:click={() => goToPage(pageNum)}
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
								on:click={() => goToPage(totalPages)}
							>
								{totalPages}
							</Button>
						{/if}

						<Button
							variant="outline"
							size="sm"
							disabled={!hasNextPage}
							on:click={() => goToPage(currentPage + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
