<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
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
		Upload
	} from 'lucide-svelte';

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

	// Local state for filters and search
	let searchTerm = $state(filters.searchTerm);
	let selectedDepartment = $state(filters.departmentFilter);
	let selectedStatus = $state(filters.statusFilter);
	let currentPage = $state(filters.page);
	let pageSize = $state(filters.limit);

	// Pagination state
	const totalPages = $derived(Math.ceil(totalEmployees / pageSize));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Statistics derived from server data
	const employeeStats = $derived({
		totalEmployees,
		activeEmployees: employees.filter(emp => emp.isActive).length,
		inactiveEmployees: employees.filter(emp => !emp.isActive).length,
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
		if (selectedStatus) searchParams.set('status', selectedStatus);
		searchParams.set('page', '1'); // Reset to first page on new search
		if (pageSize !== 20) searchParams.set('limit', pageSize.toString());

		goto(`${$page.url.pathname}?${searchParams.toString()}`);
	}

	// Handle pagination
	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;

		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('page', page.toString());
		goto(`${$page.url.pathname}?${searchParams.toString()}`);
	}

	// Handle clear filters
	function clearFilters() {
		searchTerm = '';
		selectedDepartment = '';
		selectedStatus = '';
		pageSize = 20;
		goto($page.url.pathname);
	}

	// Get employee status badge variant
	function getStatusBadgeVariant(isActive: boolean): 'default' | 'secondary' | 'destructive' {
		return isActive ? 'default' : 'secondary';
	}

	// Format employee role display
	function formatRole(role: string): string {
		return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
			<p class="text-muted-foreground">
				Manage and browse employees in your organization
			</p>
		</div>

		{#if canManageEmployees}
			<div class="flex gap-2">
				<Button variant="outline" size="sm">
					<Upload class="h-4 w-4 mr-2" />
					Import Employees
				</Button>
				<Button variant="outline" size="sm">
					<Download class="h-4 w-4 mr-2" />
					Export Directory
				</Button>
				<Button size="sm" href="/dashboard/employees/new">
					<UserPlus class="h-4 w-4 mr-2" />
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
					{Math.round((employeeStats.activeEmployees / employeeStats.totalEmployees) * 100)}% of total
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
				<p class="text-xs text-muted-foreground">
					requires attention
				</p>
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

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Search & Filter Employees</Card.Title>
			<Card.Description>Find employees by name, department, or status</Card.Description>
		</Card.Header>
		<Card.Content>
			<form on:submit|preventDefault={handleSearch} class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<!-- Search Input -->
					<div class="space-y-2">
						<label for="search" class="text-sm font-medium">Search</label>
						<div class="relative">
							<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
						<Select bind:value={selectedDepartment}>
							<SelectTrigger>
								<SelectValue placeholder="All Departments" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All Departments</SelectItem>
								{#each departments as dept}
									<SelectItem value={dept.id}>{dept.name}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<!-- Status Filter -->
					{#if canViewInactiveEmployees}
					<div class="space-y-2">
						<label for="status" class="text-sm font-medium">Status</label>
						<Select bind:value={selectedStatus}>
							<SelectTrigger>
								<SelectValue placeholder="All Employees" />
							</SelectTrigger>
							<SelectContent>
								{#each statusOptions as option}
									<SelectItem value={option.value}>{option.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					{/if}

					<!-- Page Size -->
					<div class="space-y-2">
						<label for="pagesize" class="text-sm font-medium">Per Page</label>
						<Select bind:value={pageSize}>
							<SelectTrigger>
								<SelectValue placeholder="20" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={10}>10</SelectItem>
								<SelectItem value={20}>20</SelectItem>
								<SelectItem value={50}>50</SelectItem>
								<SelectItem value={100}>100</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div class="flex gap-2">
					<Button type="submit">
						<Search class="h-4 w-4 mr-2" />
						Search
					</Button>
					<Button type="button" variant="outline" on:click={clearFilters}>
						Clear Filters
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Employee Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each employees as employee}
			<Card.Root class="hover:shadow-md transition-shadow">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between">
						<div class="flex items-center space-x-3">
							<div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
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
							<Mail class="h-4 w-4 mr-2" />
							<a href="mailto:{employee.email}" class="hover:text-primary">{employee.email}</a>
						</div>
						{/if}

						{#if employee.phone}
						<div class="flex items-center text-sm text-muted-foreground">
							<Phone class="h-4 w-4 mr-2" />
							<a href="tel:{employee.phone}" class="hover:text-primary">{employee.phone}</a>
						</div>
						{/if}

						{#if employee.department}
						<div class="flex items-center text-sm text-muted-foreground">
							<Building class="h-4 w-4 mr-2" />
							<span>{employee.department.name}</span>
						</div>
						{/if}

						{#if employee.hireDate}
						<div class="flex items-center text-sm text-muted-foreground">
							<Calendar class="h-4 w-4 mr-2" />
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
							<Eye class="h-4 w-4 mr-2" />
							View Profile
						</Button>
						{#if canManageEmployees}
						<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}/edit">
							<Edit class="h-4 w-4 mr-2" />
							Edit
						</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

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
							<UserPlus class="h-4 w-4 mr-2" />
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
						Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEmployees)} of {totalEmployees} employees
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