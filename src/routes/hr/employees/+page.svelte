<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Users, Search, Plus, Filter, Download, Eye, Edit, Trash2 } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import { Separator } from '$lib/components/ui/separator';
	import type { Employee, Department } from '$lib/schemas/employee';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states (initialized from server data)
	let searchTerm = $state(data.filters.search);
	let statusFilter = $state(data.filters.status);
	let departmentFilter = $state(data.filters.department);
	let currentPage = $state(data.pagination.currentPage);
	let pageSize = $state(data.pagination.pageSize);

	// Derived data from server
	const employees = $derived(data.employees);
	const departments = $derived(data.departments);
	const totalPages = $derived(data.pagination.totalPages);
	const totalCount = $derived(data.pagination.totalCount);
	const loading = $state(false);
	const error = $derived(data.error || '');

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();
		
		if (searchTerm) params.set('search', searchTerm);
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (departmentFilter !== 'all') params.set('department', departmentFilter);
		params.set('page', currentPage.toString());
		params.set('pageSize', pageSize.toString());
		
		const queryString = params.toString();
		const newUrl = queryString ? `/hr/employees?${queryString}` : '/hr/employees';
		
		await goto(newUrl);
	}

	// All employees are already filtered and paginated on server-side
	const paginatedEmployees = $derived(() => employees);

	function getStatusVariant(status: string) {
		switch (status?.toLowerCase()) {
			case 'active': return 'default';
			case 'inactive': return 'secondary';
			case 'onboarding': return 'secondary';
			case 'terminated': return 'destructive';
			default: return 'outline';
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}

	function handleEmployeeAction(action: string, employee: any) {
		switch (action) {
			case 'view':
				window.location.href = `/hr/employees/${employee.id}`;
				break;
			case 'edit':
				window.location.href = `/hr/employees/${employee.id}/edit`;
				break;
			case 'delete':
				if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
					// Handle delete
					console.log('Delete employee:', employee.id);
				}
				break;
		}
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			applyFilters();
		}
	}

	function clearFilters() {
		searchTerm = '';
		statusFilter = 'all';
		departmentFilter = 'all';
		currentPage = 1;
		applyFilters();
	}

	// Debounced search - apply filters when search term changes
	let searchTimeout: NodeJS.Timeout;
	$effect(() => {
		if (searchTerm !== data.filters.search) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				currentPage = 1; // Reset to first page on search
				applyFilters();
			}, 500); // 500ms debounce
		}
	});

	// Apply filters when status or department filter changes
	$effect(() => {
		if (statusFilter !== data.filters.status || departmentFilter !== data.filters.department) {
			currentPage = 1; // Reset to first page on filter change
			applyFilters();
		}
	});
</script>

<div class="space-y-6">

	<!-- Filters and Search -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Search and Filters</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col lg:flex-row gap-4">
				<!-- Search -->
				<div class="flex-1">
					<div class="relative">
						<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search employees by name or email..."
							class="pl-9"
							bind:value={searchTerm}
						/>
					</div>
				</div>

				<!-- Status Filter -->
				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={statusFilter}
				>
					<option value="all">All Statuses</option>
					<option value="Active">Active</option>
					<option value="Inactive">Inactive</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Terminated">Terminated</option>
				</select>

				<!-- Department Filter -->
				<select 
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={departmentFilter}
				>
					<option value="all">All Departments</option>
					{#each departments as dept}
						<option value={dept.name}>{dept.name}</option>
					{/each}
				</select>

				<Button variant="outline" onclick={clearFilters}>
					Clear Filters
				</Button>

				<Button variant="outline">
					<Download class="h-4 w-4 mr-2" />
					Export
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Employee Table -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle>Employees ({totalCount})</CardTitle>
					<CardDescription>
						Showing {employees.length} of {totalCount} employees
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			{:else if employees.length === 0}
				<div class="text-center py-8">
					<Users class="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 class="mt-4 text-lg font-semibold">No employees found</h3>
					<p class="mt-2 text-muted-foreground">
						{searchTerm || statusFilter !== 'all' || departmentFilter !== 'all'
							? 'Try adjusting your search criteria'
							: 'Get started by adding your first employee'}
					</p>
					{#if !(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all')}
						<Button class="mt-4" onclick={() => window.location.href = '/hr/employees/new'}>
							<Plus class="h-4 w-4 mr-2" />
							Add Employee
						</Button>
					{/if}
				</div>
			{:else}
				<div class="overflow-hidden rounded-md border">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-muted/50">
								<tr class="border-b">
									<th class="text-left p-4 font-medium">Employee</th>
									<th class="text-left p-4 font-medium">Role</th>
									<th class="text-left p-4 font-medium">Department</th>
									<th class="text-left p-4 font-medium">Status</th>
									<th class="text-left p-4 font-medium">Hire Date</th>
									<th class="text-right p-4 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each employees as employee}
									<tr class="border-b hover:bg-muted/30 transition-colors">
										<td class="p-4">
											<div class="flex items-center space-x-3">
												<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
													<span class="text-sm font-medium text-primary">
														{employee.firstName?.[0]}{employee.lastName?.[0]}
													</span>
												</div>
												<div>
													<p class="font-medium">{employee.firstName} {employee.lastName}</p>
													<p class="text-sm text-muted-foreground">{employee.email || 'No email'}</p>
												</div>
											</div>
										</td>
										<td class="p-4">
											<p class="text-sm">{employee.role?.name || 'N/A'}</p>
											<p class="text-xs text-muted-foreground">{employee.jobTitle || 'No title'}</p>
										</td>
										<td class="p-4">
											<p class="text-sm">{employee.department?.name || 'N/A'}</p>
										</td>
										<td class="p-4">
											<Badge variant={getStatusVariant(employee.status)}>
												{employee.status || 'Unknown'}
											</Badge>
										</td>
										<td class="p-4">
											<p class="text-sm">{formatDate(employee.hireDate)}</p>
										</td>
										<td class="p-4 text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm">
														Actions
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onclick={() => handleEmployeeAction('view', employee)}>
														<Eye class="h-4 w-4 mr-2" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem onclick={() => handleEmployeeAction('edit', employee)}>
														<Edit class="h-4 w-4 mr-2" />
														Edit Employee
													</DropdownMenuItem>
													<DropdownMenuItem 
														onclick={() => handleEmployeeAction('delete', employee)}
														class="text-destructive focus:text-destructive"
													>
														<Trash2 class="h-4 w-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="flex items-center justify-between px-2 py-4">
						<div class="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
						</div>
						<div class="flex items-center space-x-2">
							<Button 
								variant="outline" 
								size="sm" 
								disabled={currentPage <= 1}
								onclick={() => goToPage(currentPage - 1)}
							>
								Previous
							</Button>
							
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + Math.max(1, currentPage - 2)) as pageNum}
								{#if pageNum <= totalPages}
									<Button 
										variant={currentPage === pageNum ? "default" : "outline"}
										size="sm"
										onclick={() => goToPage(pageNum)}
									>
										{pageNum}
									</Button>
								{/if}
							{/each}
							
							<Button 
								variant="outline" 
								size="sm" 
								disabled={currentPage >= totalPages}
								onclick={() => goToPage(currentPage + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
		<Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200" onclick={() => window.location.href = '/hr/employees/new'}>
			<Plus class="h-5 w-5" />
		</Button>
	</div>
</div>