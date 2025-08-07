<script lang="ts">
	import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { Employee } from '$lib/data/mockEmployees.js';

	let {
		sortConfig,
		isAllSelected = false,
		isIndeterminate = false,
		onSort,
		onToggleSelectAll
	}: {
		sortConfig: { field: keyof Employee | 'name'; direction: 'asc' | 'desc' };
		isAllSelected?: boolean;
		isIndeterminate?: boolean;
		onSort: (field: keyof Employee | 'name') => void;
		onToggleSelectAll: () => void;
	} = $props();

	function getSortIcon(field: keyof Employee | 'name') {
		if (sortConfig.field === field) {
			return sortConfig.direction === 'asc' ? ChevronUp : ChevronDown;
		}
		return ChevronsUpDown;
	}

	function getSortButtonClass(field: keyof Employee | 'name') {
		const baseClass = "h-full w-full flex items-center justify-start font-medium text-foreground hover:bg-background/20 rounded-lg px-2 py-1 transition-all duration-200";
		if (sortConfig.field === field) {
			return `${baseClass} bg-background/30 shadow-sm`;
		}
		return baseClass;
	}
</script>

<thead class="sticky top-0 z-10 bg-background/30 backdrop-blur-lg border-b border-border/20">
	<tr>
		<!-- Select All Column -->
		<th class="w-12 p-4">
			<Checkbox
				checked={isAllSelected}
				indeterminate={isIndeterminate}
				onCheckedChange={onToggleSelectAll}
				aria-label="Select all employees"
			/>
		</th>

		<!-- Expand Column -->
		<th class="w-8"></th>

		<!-- Name Column -->
		<th class="text-left p-4 min-w-[200px]">
			<Button
				variant="ghost"
				onclick={() => onSort('name')}
				class={getSortButtonClass('name')}
			>
				<span class="mr-2">Employee</span>
				{@const SortIcon = getSortIcon('name')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Position Column -->
		<th class="text-left p-4 min-w-[150px]">
			<Button
				variant="ghost"
				onclick={() => onSort('position')}
				class={getSortButtonClass('position')}
			>
				<span class="mr-2">Position</span>
				{@const SortIcon = getSortIcon('position')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Department Column -->
		<th class="text-left p-4 min-w-[120px]">
			<Button
				variant="ghost"
				onclick={() => onSort('department')}
				class={getSortButtonClass('department')}
			>
				<span class="mr-2">Department</span>
				{@const SortIcon = getSortIcon('department')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Status Column -->
		<th class="text-left p-4 min-w-[100px]">
			<Button
				variant="ghost"
				onclick={() => onSort('status')}
				class={getSortButtonClass('status')}
			>
				<span class="mr-2">Status</span>
				{@const SortIcon = getSortIcon('status')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Location Column -->
		<th class="text-left p-4 min-w-[120px]">
			<Button
				variant="ghost"
				onclick={() => onSort('location')}
				class={getSortButtonClass('location')}
			>
				<span class="mr-2">Location</span>
				{@const SortIcon = getSortIcon('location')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Hire Date Column -->
		<th class="text-left p-4 min-w-[120px]">
			<Button
				variant="ghost"
				onclick={() => onSort('hireDate')}
				class={getSortButtonClass('hireDate')}
			>
				<span class="mr-2">Hire Date</span>
				{@const SortIcon = getSortIcon('hireDate')}
				<SortIcon class="h-4 w-4 flex-shrink-0 opacity-60" />
			</Button>
		</th>

		<!-- Actions Column -->
		<th class="text-right p-4 w-20">
			<span class="font-medium text-foreground">Actions</span>
		</th>
	</tr>
</thead>