<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Table from '$lib/components/ui/table';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import {
		BarChart3,
		Building,
		Building2,
		ChevronDown,
		ChevronRight,
		Crown,
		Edit,
		Eye,
		Filter,
		Grid,
		List,
		Plus,
		Search,
		Trash2,
		TreePine,
		User,
		UserCheck,
		Users
	} from '@lucide/svelte';
	import { buildTeamHierarchy, categorizeTeamSize } from '$lib/graphql/team-management-operations';
	import DepartmentCreateDialog from '$lib/components/departments/DepartmentCreateDialog.svelte';

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

	const { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const departments = $derived(data.departments);
	const totalDepartments = $derived(data.totalDepartments);
	const hierarchy = $derived(data.hierarchy);
	const filters = $derived(data.filters);
	const permissions = $derived(data.permissions);
	const canManageDepartments = $derived(data.canManageDepartments);
	const canViewEmployees = $derived(data.canViewEmployees);

	// Prepare search options from departments list
	const departmentSearchOptions = $derived(
		departments.map((d) => ({
			value: d.name,
			label: d.name
		}))
	);

	// Local state for filters and search
	let searchTerms = $state<string[]>([]);
	let selectedParent = $state(data.filters.parentFilter);
	let selectedHasHead = $state(data.filters.hasHeadFilter);
	const currentPage = $state(data.filters.page);
	let pageSize = $state(data.filters.limit);
	let viewMode = $state<'grid' | 'list'>('list');

	// Sync search terms from URL
	$effect(() => {
		const searchParam = data.filters.searchTerm || '';
		searchTerms = searchParam
			? searchParam
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
	});

	// Dialog state
	let showCreateDialog = $state(false);

	// Hierarchy display state
	let expandedNodes = $state<Set<string>>(new Set());

	// Pagination state
	const totalPages = $derived(Math.ceil(totalDepartments / pageSize));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Statistics derived from server data
	const departmentStats = $derived({
		totalDepartments,
		withHeads: departments.filter((dept) => dept.departmentHead).length,
		withoutHeads: departments.filter((dept) => !dept.departmentHead).length,
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
		if (searchTerms.length > 0) searchParams.set('search', searchTerms.join(','));
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
		searchTerms = [];
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
	<title>Departments - MountainHR</title>
	<meta name="description" content="View and manage all departments in your organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Department Management</h1>
			<p class="text-muted-foreground">Organize and manage departments in your organization</p>
		</div>

		<div class="flex gap-2">
			{#if canManageDepartments}
				<Button variant="outline" size="sm">
					<TreePine class="mr-2 h-4 w-4" />
					Hierarchy
				</Button>
				<Button size="sm" onclick={() => (showCreateDialog = true)}>
					<Plus class="mr-2 h-4 w-4" />
					Add Department
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

	<!-- Filters (Inline for List View, Card for Grid View) -->
	{#if viewMode === 'grid'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Search & Filter Departments</Card.Title>
				<Card.Description>Find departments by name, parent, or leadership status</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSearch();
					}}
					class="space-y-4"
				>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
						<div class="space-y-2">
							<label for="search" class="text-sm font-medium">Search</label>
							<MultiSearchInput
								bind:searchTerms
								onSearchChange={handleSearch}
								debounceMs={500}
								allowCustomTerms={true}
								placeholder="Search departments..."
								options={departmentSearchOptions}
							/>
						</div>
						<div class="space-y-2">
							<label for="parent" class="text-sm font-medium">Parent Department</label>
							<Select bind:value={selectedParent}>
								<SelectTrigger placeholder="All Parents" />
								<SelectContent>
									<SelectItem value="">All Parents</SelectItem>
									<SelectItem value="null">Top-level Only</SelectItem>
									{#each departments.filter((dept) => !dept.parentDepartmentId) as parent}
										<SelectItem value={parent.id}>{parent.name}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>
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
						<Button type="button" variant="outline" onclick={clearFilters}>Clear Filters</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- List View Filters (Inline) -->
		<div class="flex items-end justify-between gap-3">
			<div class="flex items-end gap-3 flex-1">
				<!-- Search Input -->
				<div class="w-96 space-y-2">
					<label for="search-inline" class="text-sm font-medium">Search</label>
					<MultiSearchInput
						bind:searchTerms
						onSearchChange={handleSearch}
						debounceMs={500}
						allowCustomTerms={true}
						placeholder="Search..."
						options={departmentSearchOptions}
					/>
				</div>

				<!-- Parent Filter -->
				<div class="w-48 space-y-2">
					<label for="parent-inline" class="text-sm font-medium">Parent</label>
					<select
						id="parent-inline"
						bind:value={selectedParent}
						onchange={handleSearch}
						class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
					>
						<option value="">All Parents</option>
						<option value="null">Top-level Only</option>
						{#each departments.filter((dept) => !dept.parentDepartmentId) as parent}
							<option value={parent.id}>{parent.name}</option>
						{/each}
					</select>
				</div>

				<!-- Status Filter -->
				<div class="w-48 space-y-2">
					<label for="head-inline" class="text-sm font-medium">Leadership</label>
					<select
						id="head-inline"
						bind:value={selectedHasHead}
						onchange={handleSearch}
						class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
					>
						{#each hasHeadOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<div class="invisible text-sm font-medium">Clear</div>
					<Button type="button" variant="outline" size="sm" onclick={clearFilters}>Clear</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Content -->
	{#if viewMode === 'grid'}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each departments as department}
				{@const sizeInfo = categorizeTeamSize(department.employees?.totalCount || 0)}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between">
							<div class="flex items-center space-x-3">
								<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Building2 class="h-6 w-6 text-primary" />
								</div>
								<div>
									<Card.Title class="text-lg">{department.name}</Card.Title>
									<Card.Description>{department.description || 'No description'}</Card.Description>
								</div>
							</div>
							{#if department.departmentHead}
								<Badge variant="default">
									<Crown class="mr-1 h-3 w-3" />
									Has Head
								</Badge>
							{:else}
								<Badge variant="outline">
									<User class="mr-1 h-3 w-3" />
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
									<UserCheck class="mr-2 h-4 w-4 text-green-600" />
									<span class="font-medium">{department.departmentHead.displayName}</span>
									<span class="ml-1 text-muted-foreground"
										>({department.departmentHead.jobTitle || 'Head'})</span
									>
								</div>
							{/if}

							{#if department.parentDepartment}
								<div class="flex items-center text-sm text-muted-foreground">
									<Building class="mr-2 h-4 w-4" />
									<span>Parent: {department.parentDepartment.name}</span>
								</div>
							{/if}

							<div class="flex items-center text-sm text-muted-foreground">
								<Users class="mr-2 h-4 w-4" />
								<span>{formatEmployeeCount(department.employees?.totalCount || 0)}</span>
							</div>

							{#if department.subDepartments?.totalCount > 0}
								<div class="flex items-center text-sm text-muted-foreground">
									<TreePine class="mr-2 h-4 w-4" />
									<span>{department.subDepartments.totalCount} sub-departments</span>
								</div>
							{/if}

							<!-- Department Size Badge -->
							<div class="flex items-center text-sm">
								<Badge
									variant="outline"
									class="bg-{sizeInfo.color}-50 border-{sizeInfo.color}-200 text-{sizeInfo.color}-800"
								>
									<BarChart3 class="mr-1 h-3 w-3" />
									{sizeInfo.label}
								</Badge>
							</div>
						</div>

						<Separator />

						<!-- Actions -->
						<div class="flex gap-2">
							{#if canViewEmployees}
								<Button variant="outline" size="sm" href="/dashboard/departments/{department.id}">
									<Eye class="mr-2 h-4 w-4" />
									View Details
								</Button>
							{/if}
							{#if canManageDepartments}
								<Button
									variant="outline"
									size="sm"
									href="/dashboard/departments/{department.id}/edit"
								>
									<Edit class="mr-2 h-4 w-4" />
									Edit
								</Button>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<!-- List View (Table) -->
		<div class="rounded-md border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Parent</Table.Head>
						<Table.Head>Head</Table.Head>
						<Table.Head>Employees</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each departments as department}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex items-center gap-2">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
										<Building2 class="h-4 w-4 text-primary" />
									</div>
									<div>
										<div>{department.name}</div>
										<div class="text-xs text-muted-foreground line-clamp-1">
											{department.description || ''}
										</div>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if department.parentDepartment}
									<div class="flex items-center gap-1 text-muted-foreground">
										<Building class="h-3 w-3" />
										{department.parentDepartment.name}
									</div>
								{:else}
									<span class="text-muted-foreground text-xs">Top Level</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if department.departmentHead}
									<div class="flex items-center gap-2">
										<div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
											<span class="text-xs font-medium"
												>{department.departmentHead.firstName?.[0]}{department.departmentHead
													.lastName?.[0]}</span
											>
										</div>
										<div class="flex flex-col">
											<span class="text-sm font-medium"
												>{department.departmentHead.displayName}</span
											>
											<span class="text-xs text-muted-foreground"
												>{department.departmentHead.jobTitle || 'Head'}</span
											>
										</div>
									</div>
								{:else}
									<Badge variant="outline" class="text-xs font-normal">Vacant</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1">
										<Users class="h-3 w-3 text-muted-foreground" />
										<span>{department.employees?.totalCount || 0}</span>
									</div>
									{#if department.subDepartments?.totalCount > 0}
										<div class="flex items-center gap-1 text-xs text-muted-foreground">
											<TreePine class="h-3 w-3" />
											<span>{department.subDepartments.totalCount} sub</span>
										</div>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									{#if canViewEmployees}
										<Button
											variant="ghost"
											size="icon"
											href="/dashboard/departments/{department.id}"
										>
											<Eye class="h-4 w-4" />
										</Button>
									{/if}
									{#if canManageDepartments}
										<Button
											variant="ghost"
											size="icon"
											href="/dashboard/departments/{department.id}/edit"
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
						<Button class="mt-4" href="/dashboard/departments/new">
							<Plus class="mr-2 h-4 w-4" />
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
						Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
							currentPage * pageSize,
							totalDepartments
						)} of {totalDepartments} departments
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

<!-- Department Create Dialog -->
<DepartmentCreateDialog bind:open={showCreateDialog} users={data.users || []} {departments} />
