<script lang="ts">
	import { X } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import type { Department } from '$lib/data/mockEmployees.js';

	let {
		selectedDepartments = $bindable<string[]>(),
		selectedStatuses = $bindable<string[]>(),
		departments
	}: {
		selectedDepartments: string[];
		selectedStatuses: string[];
		departments: Department[];
	} = $props();

	const statusOptions = [
		{ value: 'ACTIVE', label: 'Active', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
		{ value: 'ON_LEAVE', label: 'On Leave', color: 'bg-orange-500/20 text-orange-700 border-orange-500/30' },
		{ value: 'INACTIVE', label: 'Inactive', color: 'bg-gray-500/20 text-gray-700 border-gray-500/30' }
	];

	function getDepartmentColor(color: string) {
		const colors: Record<string, string> = {
			'blue': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
			'green': 'bg-green-500/20 text-green-700 border-green-500/30',
			'purple': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
			'orange': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
			'emerald': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
			'indigo': 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
			'pink': 'bg-pink-500/20 text-pink-700 border-pink-500/30',
			'slate': 'bg-slate-500/20 text-slate-700 border-slate-500/30'
		};
		return colors[color] || colors['slate'];
	}

	function toggleDepartment(departmentId: string) {
		if (selectedDepartments.includes(departmentId)) {
			selectedDepartments = selectedDepartments.filter(id => id !== departmentId);
		} else {
			selectedDepartments = [...selectedDepartments, departmentId];
		}
	}

	function toggleStatus(status: string) {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter(s => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
	}

	function clearAllFilters() {
		selectedDepartments = [];
		selectedStatuses = [];
	}

	let hasActiveFilters = $derived(selectedDepartments.length > 0 || selectedStatuses.length > 0);
</script>

<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
	<div class="p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="font-semibold text-lg text-foreground">Filters</h3>
			{#if hasActiveFilters}
				<Button
					variant="ghost"
					size="sm"
					onclick={clearAllFilters}
					class="text-sm rounded-lg"
				>
					<X class="h-3 w-3 mr-1" />
					Clear All
				</Button>
			{/if}
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Department Filters -->
			<div>
				<h4 class="font-medium text-foreground mb-3">Department</h4>
				<div class="space-y-3">
					{#each departments as department}
						<div class="flex items-center space-x-3">
							<Checkbox
								id="dept-{department.id}"
								checked={selectedDepartments.includes(department.id)}
								onCheckedChange={() => toggleDepartment(department.id)}
							/>
							<Label 
								for="dept-{department.id}" 
								class="flex items-center space-x-2 cursor-pointer"
							>
								<Badge class="rounded-lg border {getDepartmentColor(department.color)} text-xs">
									{department.name}
								</Badge>
							</Label>
						</div>
					{/each}
				</div>
			</div>

			<!-- Status Filters -->
			<div>
				<h4 class="font-medium text-foreground mb-3">Status</h4>
				<div class="space-y-3">
					{#each statusOptions as status}
						<div class="flex items-center space-x-3">
							<Checkbox
								id="status-{status.value}"
								checked={selectedStatuses.includes(status.value)}
								onCheckedChange={() => toggleStatus(status.value)}
							/>
							<Label 
								for="status-{status.value}" 
								class="flex items-center space-x-2 cursor-pointer"
							>
								<Badge class="rounded-lg border {status.color} text-xs">
									{status.label}
								</Badge>
							</Label>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Active Filter Summary -->
		{#if hasActiveFilters}
			<div class="mt-6 pt-4 border-t border-border/20">
				<div class="flex items-center justify-between text-sm text-muted-foreground">
					<span>
						{selectedDepartments.length + selectedStatuses.length} filter(s) active
					</span>
					<span>
						Results will update automatically
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>