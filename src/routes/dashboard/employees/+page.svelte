<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Chart from '$lib/components/ui/chart';
	import { Slider } from '$lib/components/ui/slider';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Area, AreaChart } from 'layerchart';
	import { scaleUtc } from 'd3-scale';
	import { queryStore, getContextClient } from '@urql/svelte';
	import { GET_EMPLOYEE_STATISTICS_QUERY } from '$lib/graphql/employee-operations';
	import type { EmployeeStatistic } from '$lib/graphql/employee-operations';
	import EmployeeDataTable from '$lib/components/ui/employee-datatable.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
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
		List,
		TrendingUp,
		ChevronDown,
		Settings2
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

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const employees = $derived(data.employees);
	const totalEmployees = $derived(data.totalEmployees);
	const totalActiveEmployees = $derived(data.totalActiveEmployees);
	const totalInactiveEmployees = $derived(data.totalInactiveEmployees);
	const departments = $derived(data.departments);
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
		searchTerms = searchParam ? searchParam.split(',').map((t) => t.trim()).filter(Boolean) : [];
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

	// Statistics from server (calculated from ALL employees, not just current page)
	const employeeStats = $derived({
		totalEmployees: totalActiveEmployees + totalInactiveEmployees, // Total from server
		activeEmployees: totalActiveEmployees,
		inactiveEmployees: totalInactiveEmployees,
		departmentCount: departments.length
	});

	// Historical employee statistics query with range slider
	// Slider positions 0-365 represent chronological time:
	// Position 0 = 1 year ago (365 days back)
	// Position 365 = today (0 days back)
	// Default: all available data
	let dateRangeSlider = $state([0, 365]);

	const today = new Date();

	// Calculate dates based on slider values
	// Convert slider position to days back: daysBack = 365 - sliderPosition
	// Left thumb (index 0) = start date (older)
	// Right thumb (index 1) = end date (newer)
	const startDate = $derived.by(() => {
		const date = new Date(today);
		const daysBack = 365 - dateRangeSlider[0];
		date.setDate(today.getDate() - daysBack);
		return date.toISOString().split('T')[0];
	});

	const endDate = $derived.by(() => {
		const date = new Date(today);
		const daysBack = 365 - dateRangeSlider[1];
		date.setDate(today.getDate() - daysBack);
		return date.toISOString().split('T')[0];
	});

	const client = getContextClient();

	// Create reactive query - urql queryStore is reactive and will update when variables change
	// Wrap in $derived to signal to Svelte that this tracks startDate/endDate reactively
	const employeeStatisticsQuery = $derived(queryStore({
		client,
		query: GET_EMPLOYEE_STATISTICS_QUERY,
		variables: { startDate, endDate }
	}));

	// Transform employee statistics for area chart
	const historicalChartData = $derived.by(() => {
		if (!$employeeStatisticsQuery?.data?.employeeStatistics) {
			return [];
		}
		const stats = $employeeStatisticsQuery.data.employeeStatistics;
		if (!Array.isArray(stats) || stats.length === 0) {
			return [];
		}
		return stats.map((stat: EmployeeStatistic) => ({
			date: new Date(stat.snapshotDate), // Keep as Date object for time scale
			active: stat.activeCount,
			inactive: stat.inactiveCount,
			total: stat.totalCount
		}));
	});

	const isHistoricalDataLoading = $derived($employeeStatisticsQuery?.fetching ?? true);
	const hasHistoricalData = $derived(historicalChartData.length > 0);

	// Calculate the earliest available date to set slider minimum
	const earliestDataDate = $derived.by(() => {
		if (historicalChartData.length === 0) return null;
		// Find the earliest date in the dataset
		const earliest = historicalChartData.reduce((earliest, item) => {
			return item.date < earliest ? item.date : earliest;
		}, historicalChartData[0].date);
		return earliest;
	});

	// Calculate slider minimum based on earliest data
	// Position 0 = 365 days ago, Position 365 = today
	const sliderMin = $derived.by(() => {
		if (!earliestDataDate) return 0;
		const daysAgo = Math.floor((today.getTime() - earliestDataDate.getTime()) / (1000 * 60 * 60 * 24));
		// Convert days ago to slider position: position = 365 - daysAgo
		return Math.max(0, 365 - daysAgo);
	});

	// Update slider to show all available data when data first loads
	$effect(() => {
		if (hasHistoricalData && sliderMin > 0 && dateRangeSlider[0] < sliderMin) {
			dateRangeSlider = [sliderMin, 365];
		}
	});

	// Filter chart data based on slider range for responsive UI
	const filteredChartData = $derived.by(() => {
		if (historicalChartData.length === 0) return [];

		// Calculate actual date range from slider positions
		const startMs = new Date(startDate).getTime();
		const endMs = new Date(endDate).getTime();

		// Filter data to only show dates within the slider range
		return historicalChartData.filter((item) => {
			const itemMs = item.date.getTime();
			return itemMs >= startMs && itemMs <= endMs;
		});
	});

	const historicalChartConfig = {
		active: {
			label: 'Active',
			color: 'var(--chart-1)'
		},
		inactive: {
			label: 'Inactive',
			color: 'var(--chart-2)'
		},
		total: {
			label: 'Total',
			color: 'var(--chart-3)'
		}
	} satisfies Chart.ChartConfig;

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
</script>

<svelte:head>
	<title>Employee Directory - SvelteHR</title>
	<meta name="description" content="Browse and manage employees in the organization" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6" data-testid="employee-directory">
	<div class="flex items-center justify-between">
		{#if canManageEmployees}
			<ButtonGroup.Root>
				<Button variant="outline" size="sm">
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
				<Button size="sm" href="/dashboard/employees/new" data-testid="employee-add-button">
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
			<!-- Employee Statistics Summary with Historical Trend -->
			<div class="mb-6 pb-6 border-b">
				<!-- Historical Employee Trend Chart -->
				{#if !isHistoricalDataLoading && hasHistoricalData}
					<Accordion.Root type="single" collapsible>
						<Accordion.Item value="trend-chart">
							<Accordion.Trigger class="hover:no-underline">
								<div class="flex items-center gap-2">
									<TrendingUp class="h-5 w-5" />
									<span class="text-lg font-semibold">
										Employee Trend ({dateRangeSlider[1] - dateRangeSlider[0]} days)
									</span>
								</div>
							</Accordion.Trigger>
							<Accordion.Content>
								<p class="text-sm text-muted-foreground mb-4">Historical employee count over time</p>

								<div class="h-[300px]">
									<Chart.Container config={historicalChartConfig} class="h-full w-full">
										<AreaChart
											data={filteredChartData}
											x="date"
											xScale={scaleUtc()}
											series={[
												{
													key: 'active',
													label: 'Active Employees',
													color: historicalChartConfig.active.color
												},
												{
													key: 'inactive',
													label: 'Inactive Employees',
													color: historicalChartConfig.inactive.color
												}
											]}
											props={{
												area: {
													'fill-opacity': 0.4,
													line: { class: 'stroke-1' },
													motion: 'tween'
												},
												xAxis: {
													format: (v) => {
														return v.toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric'
														});
													}
												},
												yAxis: {
													format: (v) => v.toString()
												}
											}}
										>
											{#snippet marks({ series, getAreaProps })}
												<defs>
													<linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stop-color="var(--color-active)" stop-opacity={1.0} />
														<stop offset="95%" stop-color="var(--color-active)" stop-opacity={0.1} />
													</linearGradient>
													<linearGradient id="fillInactive" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stop-color="var(--color-inactive)" stop-opacity={0.8} />
														<stop offset="95%" stop-color="var(--color-inactive)" stop-opacity={0.1} />
													</linearGradient>
												</defs>
												{#each series as s, i (s.key)}
													<Area
														{...getAreaProps(s, i)}
														fill={s.key === 'active' ? 'url(#fillActive)' : 'url(#fillInactive)'}
													/>
												{/each}
											{/snippet}
											{#snippet tooltip()}
												<Chart.Tooltip
													labelFormatter={(v) => {
														return v.toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric'
														});
													}}
													indicator="line"
												/>
											{/snippet}
										</AreaChart>
									</Chart.Container>
								</div>

								<!-- Date Range Slider -->
								<div class="mt-6 px-3">
									<div class="flex items-center justify-between mb-3">
										<span class="text-sm font-medium">Date Range</span>
										<span class="text-sm text-muted-foreground">
											{new Date(startDate).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
											-
											{new Date(endDate).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</span>
									</div>
									<Slider
										bind:value={dateRangeSlider}
										min={sliderMin}
										max={365}
										step={1}
										class="w-full"
									/>
									<div class="flex items-center justify-between mt-2 text-xs text-muted-foreground">
										<span>
											{#if earliestDataDate}
												{earliestDataDate.toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric'
												})}
											{:else}
												Earliest
											{/if}
										</span>
										<span>Today</span>
									</div>
								</div>

								<!-- Stats Summary -->
								<div class="grid grid-cols-3 gap-4 mt-6">
									<div>
										<div class="text-3xl font-bold">{employeeStats.totalEmployees}</div>
										<p class="text-sm text-muted-foreground">Total Employees</p>
									</div>
									<div>
										<div class="text-2xl font-bold text-green-600">{employeeStats.activeEmployees}</div>
										<p class="text-xs text-muted-foreground">Active</p>
									</div>
									{#if canViewInactiveEmployees}
										<div>
											<div class="text-2xl font-bold text-orange-600">{employeeStats.inactiveEmployees}</div>
											<p class="text-xs text-muted-foreground">Inactive</p>
										</div>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground mt-4">
									Across {employeeStats.departmentCount} departments
								</p>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
				{/if}
			</div>

			<!-- Search and Filter Form -->
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<!-- Search Input -->
					<div class="space-y-2">
						<label for="search" class="text-sm font-medium">Search</label>
						<MultiSearchInput
							bind:searchTerms={searchTerms}
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
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							data-testid="employee-department-filter"
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
							data-testid="employee-status-filter"
						/>
						<label for="showInactive" class="text-sm font-medium cursor-pointer">
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
								<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Users class="h-6 w-6 text-primary" />
								</div>
								<div>
									<Card.Title class="text-lg">{employee.displayName}</Card.Title>
									<Card.Description>{employee.role ? formatRole(employee.role) : 'No role'}</Card.Description>
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

							{#if employee.departmentId}
								{@const deptName = departments.find(d => d.id === employee.departmentId)?.name}
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
	{:else}
		<!-- DataTable View -->
		<div data-testid="employee-list-container" class="space-y-4">
			<!-- Filters and Controls Row -->
			<div class="flex items-end gap-3 justify-between">
				<!-- Left: Filters -->
				<div class="flex items-end gap-3">
					<!-- Search Input -->
					<div class="space-y-2 w-96">
						<label for="search-inline" class="text-sm font-medium">Search</label>
						<MultiSearchInput
							bind:searchTerms={searchTerms}
							options={employeeSearchOptions}
							onSearchChange={handleSearch}
							debounceMs={500}
							allowCustomTerms={true}
						/>
					</div>

					<!-- Department Filter -->
					<div class="space-y-2 w-40">
						<label for="department-inline" class="text-sm font-medium">Department</label>
						<select
							id="department-inline"
							bind:value={selectedDepartment}
							onchange={handleSearch}
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							data-testid="employee-department-filter"
						>
							<option value="">All Departments</option>
							{#each departments as dept}
								<option value={dept.id}>{dept.name}</option>
							{/each}
						</select>
					</div>

					<!-- Role Filter -->
					<div class="space-y-2 w-36">
						<label for="role-inline" class="text-sm font-medium">Role</label>
						<select
							id="role-inline"
							bind:value={selectedRole}
							onchange={handleSearch}
							class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="">All Roles</option>
							<option value="admin">Admin</option>
							<option value="manager">Manager</option>
							<option value="employee">Employee</option>
						</select>
					</div>

					<!-- Status Filter (Managers and above only) -->
					{#if canViewInactiveEmployees}
						<div class="space-y-2 w-36">
							<label for="status-inline" class="text-sm font-medium">Status</label>
							<select
								id="status-inline"
								bind:value={selectedStatus}
								onchange={handleSearch}
								class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
						<div class="text-sm font-medium invisible">Clear</div>
						<Button type="button" variant="outline" size="sm" onclick={clearFilters}>
							Clear
						</Button>
					</div>
				</div>

				<!-- Right: Controls -->
				<div class="flex items-end gap-2">
					<!-- Per Page Dropdown -->
					<div class="space-y-2">
						<div class="text-sm font-medium invisible">Per Page</div>
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
								{#each [10, 20, 50, 100] as size}
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
						<div class="text-sm font-medium invisible">Columns</div>
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
						<Button class="mt-4" href="/dashboard/employees/new">
							<UserPlus class="mr-2 h-4 w-4" />
							Add First Employee
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
