<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Building, Plus } from '@lucide/svelte';
	import DepartmentCreateDialog from '$lib/components/departments/DepartmentCreateDialog.svelte';

	// Import decomposed components
	import PageHeader from '$lib/components/departments/page/PageHeader.svelte';
	import PageFilters from '$lib/components/departments/page/PageFilters.svelte';
	import DepartmentGrid from '$lib/components/departments/page/DepartmentGrid.svelte';
	import DepartmentTable from '$lib/components/departments/page/DepartmentTable.svelte';
	import PagePagination from '$lib/components/departments/page/PagePagination.svelte';

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
	let pageSize = $state(String(data.filters.limit));
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

	// Pagination state
	const totalPages = $derived(Math.ceil(totalDepartments / Number(pageSize)));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

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
		if (pageSize !== '20') searchParams.set('limit', pageSize);

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
		pageSize = '20';
		goto(currentPathname);
	}
</script>

<svelte:head>
	<title>Departments - MountainHR</title>
	<meta name="description" content="View and manage all departments in your organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<PageHeader {canManageDepartments} bind:viewMode bind:showCreateDialog />

	<PageFilters
		{viewMode}
		bind:searchTerms
		bind:selectedParent
		bind:selectedHasHead
		bind:pageSize
		{departments}
		{departmentSearchOptions}
		{hasHeadOptions}
		onSearch={handleSearch}
		onClear={clearFilters}
	/>

	<!-- Content -->
	{#if viewMode === 'grid'}
		<DepartmentGrid {departments} {canViewEmployees} {canManageDepartments} />
	{:else}
		<DepartmentTable {departments} {canViewEmployees} {canManageDepartments} />
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
		<PagePagination
			{currentPage}
			{totalPages}
			{totalDepartments}
			{pageSize}
			{hasPreviousPage}
			{hasNextPage}
			onPageChange={goToPage}
		/>
	{/if}
</div>

<!-- Department Create Dialog -->
<DepartmentCreateDialog bind:open={showCreateDialog} users={[]} {departments} />
