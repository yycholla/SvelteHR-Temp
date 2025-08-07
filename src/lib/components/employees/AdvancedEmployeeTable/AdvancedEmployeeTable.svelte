<script lang="ts">
	import { ChevronUp, ChevronDown, Settings, Download, Columns, Grid, Users, Search, Filter, Plus, Bell, Sun, Moon } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import TableHeader from './TableHeader.svelte';
	import TableRow from './TableRow.svelte';
	import BulkActionsBar from './BulkActionsBar.svelte';
	import TablePagination from './TablePagination.svelte';
	import type { Employee } from '$lib/data/mockEmployees.js';

	let {
		employees,
		loading = false,
		searchQuery = $bindable(''),
		showFilters = $bindable(false),
		activeFilters = [],
		clearFilters,
		addEmployee,
		exportEmployees
	}: {
		employees: Employee[];
		loading?: boolean;
		searchQuery?: string;
		showFilters?: boolean;
		activeFilters?: string[];
		clearFilters?: () => void;
		addEmployee?: () => void;
		exportEmployees?: () => void;
	} = $props();

	// Table state management
	let selectedRows = $state<Set<string>>(new Set());
	let expandedRows = $state<Set<string>>(new Set());
	let sortConfig = $state<{
		field: keyof Employee | 'name';
		direction: 'asc' | 'desc';
	}>({ field: 'firstName', direction: 'asc' });

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);
	let pageSizeOptions = [10, 20, 50, 100];

	// Column management
	let visibleColumns = $state([
		'select', 'expand', 'name', 'position', 'department', 'status', 'location', 'hireDate', 'actions'
	]);
	let density = $state<'compact' | 'comfortable' | 'spacious'>('comfortable');

	// Computed values
	let sortedEmployees = $derived.by(() => {
		const sorted = [...employees].sort((a, b) => {
			let aValue: any;
			let bValue: any;

			if (sortConfig.field === 'name') {
				aValue = `${a.firstName} ${a.lastName}`;
				bValue = `${b.firstName} ${b.lastName}`;
			} else if (sortConfig.field === 'department') {
				aValue = a.department.name;
				bValue = b.department.name;
			} else if (sortConfig.field === 'position') {
				aValue = a.position.title;
				bValue = b.position.title;
			} else {
				aValue = a[sortConfig.field as keyof Employee];
				bValue = b[sortConfig.field as keyof Employee];
			}

			if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
			return 0;
		});
		return sorted;
	});

	let paginatedEmployees = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		const end = start + pageSize;
		return sortedEmployees.slice(start, end);
	});

	let totalPages = $derived(Math.ceil(sortedEmployees.length / pageSize));
	let hasSelection = $derived(selectedRows.size > 0);
	let isAllSelected = $derived(selectedRows.size === paginatedEmployees.length && paginatedEmployees.length > 0);
	let isIndeterminate = $derived(selectedRows.size > 0 && selectedRows.size < paginatedEmployees.length);

	// Selection handlers
	function toggleSelectAll() {
		if (isAllSelected) {
			selectedRows.clear();
		} else {
			paginatedEmployees.forEach(emp => selectedRows.add(emp.id));
		}
		selectedRows = new Set(selectedRows);
	}

	function toggleRowSelection(employeeId: string) {
		if (selectedRows.has(employeeId)) {
			selectedRows.delete(employeeId);
		} else {
			selectedRows.add(employeeId);
		}
		selectedRows = new Set(selectedRows);
	}

	function clearSelection() {
		selectedRows.clear();
		selectedRows = new Set(selectedRows);
	}

	// Expansion handlers
	function toggleRowExpansion(employeeId: string) {
		if (expandedRows.has(employeeId)) {
			expandedRows.delete(employeeId);
		} else {
			expandedRows.add(employeeId);
		}
		expandedRows = new Set(expandedRows);
	}

	function expandAll() {
		const allExpanded = expandedRows.size === paginatedEmployees.length;
		if (allExpanded) {
			expandedRows.clear();
		} else {
			paginatedEmployees.forEach(emp => expandedRows.add(emp.id));
		}
		expandedRows = new Set(expandedRows);
	}

	// Sorting handler
	function handleSort(field: keyof Employee | 'name') {
		if (sortConfig.field === field) {
			sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
		} else {
			sortConfig.field = field;
			sortConfig.direction = 'asc';
		}
	}

	// Pagination handlers
	function goToPage(page: number) {
		currentPage = Math.max(1, Math.min(page, totalPages));
		clearSelection(); // Clear selection when changing pages
	}

	function changePageSize(newSize: number) {
		pageSize = newSize;
		currentPage = 1; // Reset to first page
		clearSelection();
	}

	// Bulk action handlers
	function handleBulkAction(action: string) {
		console.log(`Bulk action: ${action}`, Array.from(selectedRows));
		// TODO: Implement bulk actions
	}

	// Get density classes
	function getDensityClasses() {
		switch (density) {
			case 'compact': return 'text-sm';
			case 'spacious': return 'text-base py-6';
			default: return 'text-sm py-4';
		}
	}
</script>

<!-- Fixed Table Toolbar -->
<div class="fixed top-20 left-0 right-0 z-40">
	<div class="mx-6 rounded-2xl border border-slate-200/40 bg-slate-50/60 backdrop-blur-md shadow-xl">
		<div class="px-6 py-4">
			<!-- Table Controls -->
			<div class="grid grid-cols-[200px_320px_1fr_140px_200px] gap-3 items-center">
				<!-- Employee Count / Selection Status -->
				<div class="flex h-12 items-center justify-center">
					<h3 class="font-semibold text-lg whitespace-nowrap {hasSelection ? 'text-foreground' : 'text-foreground'}">
						{#if hasSelection}
							{selectedRows.size} of {sortedEmployees.length} selected
						{:else}
							{sortedEmployees.length} Employee{sortedEmployees.length !== 1 ? 's' : ''}
						{/if}
					</h3>
				</div>

				<!-- Search Input with Filters -->
				<div class="relative flex h-12 items-center rounded-xl bg-background/30 border border-border px-4 gap-3 transition-all duration-200 focus-within:border-primary/50">
					<Search class="h-5 w-5 text-muted-foreground flex-shrink-0" />
					<input
						bind:value={searchQuery}
						placeholder="Search employees..."
						class="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-sm"
					/>
					<!-- Filters Toggle inside Search -->
					<Button
						variant="ghost"
						size="sm"
						onclick={() => showFilters = !showFilters}
						class="h-8 w-8 p-0 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {showFilters ? 'bg-background/90 text-foreground' : 'text-muted-foreground hover:text-foreground'} border-0"
						title="Toggle filters"
					>
						<Filter class="h-5 w-5" />
						{#if activeFilters.length > 0}
							<Badge variant="secondary" class="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs bg-primary text-primary-foreground border-0">
								{activeFilters.length}
							</Badge>
						{/if}
					</Button>
				</div>

				<!-- Spacer for filters -->
				<div class="flex items-center space-x-2 min-h-[48px]">
					<!-- Active Filters -->
					{#if activeFilters.length > 0}
						{#each activeFilters as filter}
							<Badge variant="secondary" class="rounded-lg">
								{filter}
							</Badge>
						{/each}
						<Button
							variant="ghost"
							size="sm"
							onclick={clearFilters}
							class="h-8 px-3 text-xs rounded-lg transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground border-0"
						>
							Clear all
						</Button>
					{/if}
				</div>

				<!-- Select All / Deselect All -->
				<div class="flex h-12 items-center justify-center">
					<Button
						variant="ghost"
						size="sm"
						onclick={toggleSelectAll}
						class="h-10 px-4 rounded-xl transition-all duration-300 hover:bg-background/30 {isAllSelected ? 'text-foreground bg-background/20' : 'text-muted-foreground hover:text-foreground'} whitespace-nowrap border-0"
					>
						{#if isAllSelected}
							Deselect All
						{:else if isIndeterminate}
							Select All ({selectedRows.size})
						{:else}
							Select All
						{/if}
					</Button>
				</div>

				<!-- Sort Controls -->
				<div class="flex h-12 items-center rounded-xl bg-background/30 px-2">
					<Button
						variant="ghost"
						size="sm"
						onclick={() => handleSort('name')}
						class="h-10 px-3 rounded-lg text-xs transition-all duration-300 hover:bg-background/30 {sortConfig.field === 'name' ? 'bg-background/60 text-foreground' : 'text-muted-foreground hover:text-foreground'} border-0"
					>
						Name {sortConfig.field === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => handleSort('department')}
						class="h-10 px-3 rounded-lg text-xs transition-all duration-300 hover:bg-background/30 {sortConfig.field === 'department' ? 'bg-background/60 text-foreground' : 'text-muted-foreground hover:text-foreground'} border-0"
					>
						Dept {sortConfig.field === 'department' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => handleSort('hireDate')}
						class="h-10 px-3 rounded-lg text-xs transition-all duration-300 hover:bg-background/30 {sortConfig.field === 'hireDate' ? 'bg-background/60 text-foreground' : 'text-muted-foreground hover:text-foreground'} border-0"
					>
						Date {sortConfig.field === 'hireDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
					</Button>
				</div>
			</div>
			
			<!-- Table Action Buttons -->
			<div class="mt-3 flex items-center justify-end space-x-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						const densities: typeof density[] = ['compact', 'comfortable', 'spacious'];
						const currentIndex = densities.indexOf(density);
						density = densities[(currentIndex + 1) % densities.length];
					}}
					class="h-10 w-10 rounded-lg transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground border-0"
					title="Card density: {density}"
				>
					<Grid class="h-5 w-5" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={expandAll}
					class="h-10 w-10 rounded-lg transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground border-0"
					title={expandedRows.size === paginatedEmployees.length ? 'Collapse all' : 'Expand all'}
				>
					{#if expandedRows.size === paginatedEmployees.length}
						<ChevronUp class="h-5 w-5" />
					{:else}
						<ChevronDown class="h-5 w-5" />
					{/if}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={exportEmployees}
					class="h-10 w-10 rounded-lg transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground border-0"
					title="Export employees"
				>
					<Download class="h-5 w-5" />
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onclick={addEmployee}
					class="h-10 w-10 rounded-lg transition-all duration-300 hover:bg-background/30 text-primary hover:text-primary border-0"
					title="Add employee"
				>
					<Plus class="h-5 w-5" />
				</Button>
			</div>
		</div>
	</div>
</div>

<!-- Spacer to push content below fixed toolbar -->
<div class="h-32"></div>

<!-- Employee Cards Grid -->
<div class="space-y-4">
	{#if paginatedEmployees.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12 rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50/60 via-blue-50/40 to-indigo-50/60 backdrop-blur-md shadow-xl">
			<Users class="h-12 w-12 text-purple-500 mx-auto mb-4" />
			<h3 class="text-lg font-semibold mb-2 text-purple-800">No employees found</h3>
			<p class="text-purple-600">
				{#if loading}
					Loading employees...
				{:else}
					Try adjusting your search or filters
				{/if}
			</p>
		</div>
	{:else}
		{#each paginatedEmployees as employee (employee.id)}
			<TableRow
				{employee}
				selected={selectedRows.has(employee.id)}
				expanded={expandedRows.has(employee.id)}
				onToggleSelection={() => toggleRowSelection(employee.id)}
				onToggleExpansion={() => toggleRowExpansion(employee.id)}
				{density}
				cardMode={true}
			/>
		{/each}
	{/if}
</div>

<!-- Pagination -->
{#if totalPages > 1}
	<div class="mt-6 rounded-2xl border border-slate-200/50 bg-gradient-to-r from-slate-50/60 via-gray-50/40 to-slate-50/60 backdrop-blur-md shadow-xl">
		<TablePagination
			{currentPage}
			{totalPages}
			{pageSize}
			{pageSizeOptions}
			totalItems={sortedEmployees.length}
			onPageChange={goToPage}
			onPageSizeChange={changePageSize}
		/>
	</div>
{/if}

<!-- Bulk Actions Bar (appears when items are selected) -->
{#if hasSelection}
	<BulkActionsBar
		selectedCount={selectedRows.size}
		onAction={handleBulkAction}
		onClear={clearSelection}
	/>
{/if}