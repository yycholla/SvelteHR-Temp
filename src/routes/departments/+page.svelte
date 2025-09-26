<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Building,
		Search,
		Filter,
		Plus,
		Users,
		User,
		Crown,
		BarChart3,
		Eye,
		Edit,
		Trash2,
		ChevronDown,
		ChevronRight,
		TreePine,
		Building2,
		UserCheck
	} from 'lucide-svelte';
	import { buildTeamHierarchy, categorizeTeamSize } from '$lib/graphql/team-management-operations';

	// Subscribe to page store at top level
	const currentUrl = $derived($page.url);
	const currentPathname = $derived(currentUrl.pathname);
	const currentSearchParams = $derived(currentUrl.searchParams);

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			departments: any[];
			totalDepartments: number;
			hierarchy: any[];
			filters: {
				searchTerm: string;
				parentFilter: string;
				hasHeadFilter: string;
				page: number;
				limit: number;
			};
			permissions: string[];
			canManageDepartments: boolean;
			canViewEmployees: boolean;
			loadedAt: string;
		};
	}

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const departments = $derived(data.departments);
	const totalDepartments = $derived(data.totalDepartments);
	const hierarchy = $derived(data.hierarchy);
	const filters = $derived(data.filters);
	const permissions = $derived(data.permissions);
	const canManageDepartments = $derived(data.canManageDepartments);
	const canViewEmployees = $derived(data.canViewEmployees);

	// Local state for filters and search
	let searchTerm = $state(filters.searchTerm);
	let selectedParent = $state(filters.parentFilter);
	let selectedHasHead = $state(filters.hasHeadFilter);
	let currentPage = $state(filters.page);
	let pageSize = $state(filters.limit);

	// Hierarchy display state
	let expandedNodes = $state<Set<string>>(new Set());

	// Pagination state
	const totalPages = $derived(Math.ceil(totalDepartments / pageSize));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Statistics derived from server data
	const departmentStats = $derived({
		totalDepartments,
		withHeads: departments.filter(dept => dept.departmentHead).length,
		withoutHeads: departments.filter(dept => !dept.departmentHead).length,
		totalEmployees: departments.reduce((sum, dept) => sum + (dept.employees?.totalCount || 0), 0)
	});

	// Department head options
	const hasHeadOptions = [
		{ value: '', label: 'All Departments' },
		{ value: 'true', label: 'With Department Head' },
		{ value: 'false', label: 'Without Department Head' }
	];

	// Handle search form submission
	function handleSearch() {
		const searchParams = new URLSearchParams();
		if (searchTerm) searchParams.set('search', searchTerm);
		if (selectedParent) searchParams.set('parent', selectedParent);
		if (selectedHasHead) searchParams.set('hasHead', selectedHasHead);
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
		selectedParent = '';
		selectedHasHead = '';
		pageSize = 20;
		goto(currentPathname);
	}

	// Toggle expanded state for hierarchy nodes
	function toggleExpanded(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = new Set(expandedNodes);
	}

	// Format employee count
	function formatEmployeeCount(count: number): string {
		if (count === 0) return 'No employees';
		if (count === 1) return '1 employee';
		return `${count} employees`;
	}
</script>

<svelte:head>
	<title>Departments - SvelteHR</title>
	<meta name="description" content="View and manage all departments in your organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Department Management</h1>
			<p class="text-muted-foreground">
				Organize and manage departments in your organization
			</p>
		</div>

		{#if canManageDepartments}
			<div class="flex gap-2">
				<Button variant="outline" size="sm">
					<TreePine class="h-4 w-4 mr-2" />
					View Hierarchy
				</Button>
				<Button size="sm" href="/departments/new">
					<Plus class="h-4 w-4 mr-2" />
					Create Department
				</Button>
			</div>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Departments</Card.Title>
				<Building class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{departmentStats.totalDepartments}</div>
				<p class="text-xs text-muted-foreground">
					across organization
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">With Department Heads</Card.Title>
				<Crown class="h-4 w-4 text-yellow-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-yellow-600">{departmentStats.withHeads}</div>
				<p class="text-xs text-muted-foreground">
					{Math.round((departmentStats.withHeads / departmentStats.totalDepartments) * 100)}% have leadership
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Need Leadership</Card.Title>
				<User class="h-4 w-4 text-orange-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-orange-600">{departmentStats.withoutHeads}</div>
				<p class="text-xs text-muted-foreground">
					departments without heads
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
				<Users class="h-4 w-4 text-green-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{departmentStats.totalEmployees}</div>
				<p class="text-xs text-muted-foreground">
					across all departments
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search and Filters -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Search & Filter Departments</Card.Title>
			<Card.Description>Find departments by name, parent, or leadership status</Card.Description>
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
								placeholder="Search department names..."
								bind:value={searchTerm}
								class="pl-9"
							/>
						</div>
					</div>

					<!-- Parent Department Filter -->
					<div class="space-y-2">
						<label for="parent" class="text-sm font-medium">Parent Department</label>
						<Select bind:value={selectedParent}>
							<SelectTrigger placeholder="All Parents" />
							<SelectContent>
								<SelectItem value="">All Parents</SelectItem>
								<SelectItem value="null">Top-level Only</SelectItem>
								{#each departments.filter(dept => !dept.parentDepartmentId) as parent}
									<SelectItem value={parent.id}>{parent.name}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<!-- Has Head Filter -->
					<div class="space-y-2">
						<label for="hasHead" class="text-sm font-medium">Leadership Status</label>
						<Select bind:value={selectedHasHead}>
							<SelectTrigger placeholder="All Departments" />
							<SelectContent>
								{#each hasHeadOptions as option}
									<SelectItem value={option.value}>{option.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<!-- Page Size -->
					<div class="space-y-2">
						<label for="pagesize" class="text-sm font-medium">Per Page</label>
						<Select bind:value={pageSize}>
							<SelectTrigger placeholder="20" />
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

	<!-- Department Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each departments as department}
			{@const sizeInfo = categorizeTeamSize(department.employees?.totalCount || 0)}
			<Card.Root class="hover:shadow-md transition-shadow">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between">
						<div class="flex items-center space-x-3">
							<div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
								<Building2 class="h-6 w-6 text-primary" />
							</div>
							<div>
								<Card.Title class="text-lg">{department.name}</Card.Title>
								<Card.Description>{department.description || 'No description'}</Card.Description>
							</div>
						</div>
						{#if department.departmentHead}
							<Badge variant="default">
								<Crown class="h-3 w-3 mr-1" />
								Has Head
							</Badge>
						{:else}
							<Badge variant="outline">
								<User class="h-3 w-3 mr-1" />
								No Head
							</Badge>
						{/if}
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					<!-- Department Information -->
					<div class="space-y-2">
						{#if department.departmentHead}
						<div class="flex items-center text-sm">
							<UserCheck class="h-4 w-4 mr-2 text-green-600" />
							<span class="font-medium">{department.departmentHead.displayName}</span>
							<span class="text-muted-foreground ml-1">({department.departmentHead.jobTitle || 'Head'})</span>
						</div>
						{/if}

						{#if department.parentDepartment}
						<div class="flex items-center text-sm text-muted-foreground">
							<Building class="h-4 w-4 mr-2" />
							<span>Parent: {department.parentDepartment.name}</span>
						</div>
						{/if}

						<div class="flex items-center text-sm text-muted-foreground">
							<Users class="h-4 w-4 mr-2" />
							<span>{formatEmployeeCount(department.employees?.totalCount || 0)}</span>
						</div>

						{#if department.subDepartments?.totalCount > 0}
						<div class="flex items-center text-sm text-muted-foreground">
							<TreePine class="h-4 w-4 mr-2" />
							<span>{department.subDepartments.totalCount} sub-departments</span>
						</div>
						{/if}

						<!-- Department Size Badge -->
						<div class="flex items-center text-sm">
							<Badge variant="outline" class="bg-{sizeInfo.color}-50 border-{sizeInfo.color}-200 text-{sizeInfo.color}-800">
								<BarChart3 class="h-3 w-3 mr-1" />
								{sizeInfo.label}
							</Badge>
						</div>
					</div>

					<Separator />

					<!-- Actions -->
					<div class="flex gap-2">
						{#if canViewEmployees}
						<Button variant="outline" size="sm" href="/departments/{department.id}">
							<Eye class="h-4 w-4 mr-2" />
							View Details
						</Button>
						{/if}
						{#if canManageDepartments}
						<Button variant="outline" size="sm" href="/departments/{department.id}/edit">
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
	{#if departments.length === 0}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<Building class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No departments found</h3>
					<p class="text-muted-foreground">
						{#if filters.searchTerm || filters.parentFilter || filters.hasHeadFilter}
							Try adjusting your search criteria or clearing filters.
						{:else}
							No departments have been created yet.
						{/if}
					</p>
					{#if canManageDepartments && !filters.searchTerm && !filters.parentFilter && !filters.hasHeadFilter}
						<Button class="mt-4" href="/departments/new">
							<Plus class="h-4 w-4 mr-2" />
							Create First Department
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
						Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalDepartments)} of {totalDepartments} departments
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
