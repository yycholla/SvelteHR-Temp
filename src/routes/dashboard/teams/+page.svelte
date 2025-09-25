<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		Building, Users, Plus, Search, Filter, Eye, Edit, Crown,
		UserCheck, TreePine, BarChart3, Target, TrendingUp, Building2
	} from 'lucide-svelte';
	import { categorizeTeamSize } from '$lib/graphql/team-management-operations';

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

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const teams = $derived(data.teams);
	const totalTeams = $derived(data.totalTeams);
	const hierarchy = $derived(data.hierarchy);
	const teamStats = $derived(data.teamStats);
	const filters = $derived(data.filters);
	const permissions = $derived(data.permissions);
	const canManageTeams = $derived(data.canManageTeams);
	const canViewEmployees = $derived(data.canViewEmployees);

	// Local state for filters and search
	let searchTerm = $state(filters.searchTerm);
	let selectedSize = $state(filters.sizeFilter);
	let selectedHead = $state(filters.headFilter);
	let selectedParent = $state(filters.parentFilter);
	let viewMode = $state<'table' | 'hierarchy'>(filters.viewMode as 'table' | 'hierarchy');
	let currentPage = $state(filters.page);
	let pageSize = $state(filters.limit);

	// Pagination state
	const totalPages = $derived(Math.ceil(totalTeams / pageSize));
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
		if (selectedParent) searchParams.set('parent', selectedParent);
		if (viewMode !== 'table') searchParams.set('view', viewMode);
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
		selectedSize = '';
		selectedHead = '';
		selectedParent = '';
		viewMode = 'table';
		pageSize = 20;
		goto($page.url.pathname);
	}

	// Format employee count
	function formatEmployeeCount(count: number): string {
		if (count === 0) return 'No employees';
		if (count === 1) return '1 employee';
		return `${count} employees`;
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
	<title>Teams Management - SvelteHR</title>
	<meta name="description" content="Manage teams and organizational structure" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Teams Management</h1>
			<p class="text-muted-foreground">
				Manage organizational structure and team composition
			</p>
		</div>

		{#if canManageTeams}
			<div class="flex gap-2">
				<Button variant="outline" size="sm">
					<TreePine class="h-4 w-4 mr-2" />
					Org Chart
				</Button>
				<Button size="sm" href="/dashboard/teams/new">
					<Plus class="h-4 w-4 mr-2" />
					Create Team
				</Button>
			</div>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Teams</Card.Title>
				<Building class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{teamStats.totalTeams}</div>
				<p class="text-xs text-muted-foreground">
					organizational units
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
				<Users class="h-4 w-4 text-blue-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{teamStats.totalEmployees}</div>
				<p class="text-xs text-muted-foreground">
					across all teams
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Average Team Size</Card.Title>
				<BarChart3 class="h-4 w-4 text-green-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{teamStats.averageTeamSize}</div>
				<p class="text-xs text-muted-foreground">
					employees per team
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Teams with Heads</Card.Title>
				<Crown class="h-4 w-4 text-yellow-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-yellow-600">{teamStats.teamsWithHeads}</div>
				<p class="text-xs text-muted-foreground">
					{Math.round((teamStats.teamsWithHeads / teamStats.totalTeams) * 100)}% have leadership
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- View Mode Tabs -->
	<Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as 'table' | 'hierarchy')}>
		<div class="flex items-center justify-between">
			<TabsList>
				<TabsTrigger value="table">
					<Building2 class="h-4 w-4 mr-2" />
					Card View
				</TabsTrigger>
				<TabsTrigger value="hierarchy">
					<TreePine class="h-4 w-4 mr-2" />
					Hierarchy
				</TabsTrigger>
			</TabsList>

			<!-- Search and Filters Card -->
			<Card.Root class="mb-6">
				<Card.Header>
					<Card.Title>Search & Filter Teams</Card.Title>
					<Card.Description>Find teams by name, size, or leadership status</Card.Description>
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
										placeholder="Search team names..."
										bind:value={searchTerm}
										class="pl-9"
									/>
								</div>
							</div>

							<!-- Size Filter -->
							<div class="space-y-2">
								<label for="size" class="text-sm font-medium">Team Size</label>
								<Select bind:value={selectedSize}>
									<SelectTrigger>
										<SelectValue placeholder="All Sizes" />
									</SelectTrigger>
									<SelectContent>
										{#each sizeOptions as option}
											<SelectItem value={option.value}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>

							<!-- Head Filter -->
							<div class="space-y-2">
								<label for="head" class="text-sm font-medium">Leadership</label>
								<Select bind:value={selectedHead}>
									<SelectTrigger>
										<SelectValue placeholder="All Teams" />
									</SelectTrigger>
									<SelectContent>
										{#each headOptions as option}
											<SelectItem value={option.value}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>

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
		</div>

		<!-- Card View Content -->
		<TabsContent value="table" class="space-y-6">
			<!-- Teams Grid -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each teams as team}
					<Card.Root class="hover:shadow-md transition-shadow">
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex items-center space-x-3">
									<div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
										<Building2 class="h-6 w-6 text-primary" />
									</div>
									<div>
										<Card.Title class="text-lg">{team.name}</Card.Title>
										<Card.Description>{team.description || 'No description'}</Card.Description>
									</div>
								</div>
								{#if team.departmentHead}
									<Badge variant="default">
										<Crown class="h-3 w-3 mr-1" />
										Has Head
									</Badge>
								{:else}
									<Badge variant="outline">
										<UserCheck class="h-3 w-3 mr-1" />
										No Head
									</Badge>
								{/if}
							</div>
						</Card.Header>
						<Card.Content class="space-y-3">
							<!-- Team Information -->
							<div class="space-y-2">
								{#if team.departmentHead}
								<div class="flex items-center text-sm">
									<UserCheck class="h-4 w-4 mr-2 text-green-600" />
									<span class="font-medium">{team.departmentHead.displayName}</span>
									<span class="text-muted-foreground ml-1">({team.departmentHead.jobTitle || 'Head'})</span>
								</div>
								{/if}

								{#if team.parentDepartment}
								<div class="flex items-center text-sm text-muted-foreground">
									<Building class="h-4 w-4 mr-2" />
									<span>Parent: {team.parentDepartment.name}</span>
								</div>
								{/if}

								<div class="flex items-center text-sm text-muted-foreground">
									<Users class="h-4 w-4 mr-2" />
									<span>{formatEmployeeCount(team.employees?.totalCount || 0)}</span>
								</div>

								{#if team.subDepartments?.totalCount > 0}
								<div class="flex items-center text-sm text-muted-foreground">
									<TreePine class="h-4 w-4 mr-2" />
									<span>{team.subDepartments.totalCount} sub-teams</span>
								</div>
								{/if}

								<!-- Team Size Badge -->
								{@const sizeInfo = categorizeTeamSize(team.employees?.totalCount || 0)}
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
								<Button variant="outline" size="sm" href="/dashboard/teams/{team.id}">
									<Eye class="h-4 w-4 mr-2" />
									View Details
								</Button>
								{/if}
								{#if canManageTeams}
								<Button variant="outline" size="sm" href="/dashboard/teams/{team.id}/edit">
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
									<Plus class="h-4 w-4 mr-2" />
									Create First Team
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
								Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTeams)} of {totalTeams} teams
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
		</TabsContent>

		<!-- Hierarchy View Content -->
		<TabsContent value="hierarchy" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Organization Hierarchy</Card.Title>
					<Card.Description>Visual representation of team structure</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="text-center py-8 text-muted-foreground">
						<TreePine class="mx-auto h-12 w-12 mb-4" />
						<p>Hierarchy view will be implemented with team relationship data.</p>
						<p class="text-sm mt-2">Switch to Card View to see individual teams.</p>
					</div>
				</Card.Content>
			</Card.Root>
		</TabsContent>
	</Tabs>
</div>