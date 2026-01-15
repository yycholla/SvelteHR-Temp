<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Building, Building2, Plus, TreePine } from '@lucide/svelte';

	// Import decomposed components
	import PageHeader from '$lib/components/teams/page/PageHeader.svelte';
	import TeamStats from '$lib/components/teams/page/TeamStats.svelte';
	import PageFilters from '$lib/components/teams/page/PageFilters.svelte';
	import TeamGrid from '$lib/components/teams/page/TeamGrid.svelte';
	import PagePagination from '$lib/components/departments/page/PagePagination.svelte'; // Reusing pagination from departments

	// Subscribe to page store at top level
	const currentUrl = $derived($page.url);
	const currentPathname = $derived(currentUrl.pathname);
	const currentSearchParams = $derived(currentUrl.searchParams);

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			teams: any[];
			totalTeams: number;
			hierarchy: any[];
			teamStats: {
				totalTeams: number;
				totalEmployees: number;
				averageTeamSize: number;
				teamsWithHeads: number;
			};
			filters: {
				searchTerm: string;
				sizeFilter: string;
				headFilter: string;
				parentFilter: string;
				viewMode: string;
				page: number;
				limit: number;
			};
			permissions: string[];
			canManageTeams: boolean;
			canViewEmployees: boolean;
			loadedAt: string;
		};
	}

	const { data }: Props = $props();

	// Extract server-loaded data
	const teams = $derived(data.teams);
	const totalTeams = $derived(data.totalTeams);
	const teamStats = $derived(data.teamStats);
	const filters = $derived(data.filters);
	const canManageTeams = $derived(data.canManageTeams);
	const canViewEmployees = $derived(data.canViewEmployees);

	// Local state for filters and search - initialized from data (not derived filters)
	let searchTerm = $state(data.filters.searchTerm);
	let selectedSize = $state(data.filters.sizeFilter);
	let selectedHead = $state(data.filters.headFilter);
	let viewMode = $state<'table' | 'hierarchy'>(data.filters.viewMode as 'table' | 'hierarchy');
	const currentPage = $state(data.filters.page);
	let pageSize = $state(String(data.filters.limit));

	// Pagination state
	const totalPages = $derived(Math.ceil(totalTeams / Number(pageSize)));
	const hasNextPage = $derived(currentPage < totalPages);
	const hasPreviousPage = $derived(currentPage > 1);

	// Filter options
	const sizeOptions = [
		{ value: '', label: 'All Sizes' },
		{ value: 'small', label: 'Small (1-5)' },
		{ value: 'medium', label: 'Medium (6-15)' },
		{ value: 'large', label: 'Large (16-30)' },
		{ value: 'enterprise', label: 'Enterprise (31+)' }
	];

	const headOptions = [
		{ value: '', label: 'All Teams' },
		{ value: 'with-head', label: 'With Head' },
		{ value: 'without-head', label: 'Without Head' }
	];

	// Handle search form submission
	function handleSearch() {
		const searchParams = new URLSearchParams();
		if (searchTerm) searchParams.set('search', searchTerm);
		if (selectedSize) searchParams.set('size', selectedSize);
		if (selectedHead) searchParams.set('head', selectedHead);
		if (viewMode !== 'table') searchParams.set('view', viewMode);
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
		searchTerm = '';
		selectedSize = '';
		selectedHead = '';
		viewMode = 'table';
		pageSize = '20';
		goto(currentPathname);
	}

	// Handle view mode change
	function handleViewModeChange(mode: 'table' | 'hierarchy') {
		viewMode = mode;
		const searchParams = new URLSearchParams($page.url.searchParams);
		if (mode !== 'table') {
			searchParams.set('view', mode);
		} else {
			searchParams.delete('view');
		}
		goto(`${$page.url.pathname}?${searchParams.toString()}`);
	}
</script>

<svelte:head>
	<title>Teams Management - MountainHR</title>
	<meta name="description" content="Manage teams and organizational structure" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<PageHeader {canManageTeams} />

	<!-- Statistics Cards -->
	<TeamStats {teamStats} />

	<!-- View Mode Tabs -->
	<Tabs
		value={viewMode}
		onValueChange={(value) => handleViewModeChange(value as 'table' | 'hierarchy')}
	>
		<div class="flex items-center justify-between">
			<TabsList>
				<TabsTrigger value="table">
					<Building2 class="mr-2 h-4 w-4" />
					Card View
				</TabsTrigger>
				<TabsTrigger value="hierarchy">
					<TreePine class="mr-2 h-4 w-4" />
					Hierarchy
				</TabsTrigger>
			</TabsList>

			<!-- Search and Filters Card -->
			<PageFilters
				bind:searchTerm
				bind:selectedSize
				bind:selectedHead
				bind:pageSize
				{sizeOptions}
				{headOptions}
				onSearch={handleSearch}
				onClear={clearFilters}
			/>
		</div>

		<!-- Card View Content -->
		<TabsContent value="table" class="space-y-6">
			<!-- Teams Grid -->
			<TeamGrid {teams} {canViewEmployees} {canManageTeams} />

			<!-- Empty State -->
			{#if teams.length === 0}
				<Card.Root>
					<Card.Content class="py-8">
						<div class="text-center">
							<Building class="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 class="mt-4 text-lg font-semibold">No teams found</h3>
							<p class="text-muted-foreground">
								{#if filters.searchTerm || filters.sizeFilter || filters.headFilter}
									Try adjusting your search criteria or clearing filters.
								{:else}
									No teams have been created yet.
								{/if}
							</p>
							{#if canManageTeams && !filters.searchTerm && !filters.sizeFilter && !filters.headFilter}
								<Button class="mt-4" href="/dashboard/teams/new">
									<Plus class="mr-2 h-4 w-4" />
									Create First Team
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
					totalDepartments={totalTeams}
					{pageSize}
					{hasPreviousPage}
					{hasNextPage}
					onPageChange={goToPage}
				/>
			{/if}
		</TabsContent>

		<!-- Hierarchy View Content -->
		<TabsContent value="hierarchy" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Organization Hierarchy</Card.Title>
					<Card.Description>Visual representation of team structure</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="py-8 text-center text-muted-foreground">
						<TreePine class="mx-auto mb-4 h-12 w-12" />
						<p>Hierarchy view will be implemented with team relationship data.</p>
						<p class="mt-2 text-sm">Switch to Card View to see individual teams.</p>
					</div>
				</Card.Content>
			</Card.Root>
		</TabsContent>
	</Tabs>
</div>
