<!--
  AttendeePickerModal Component
  Feature: 027-we-need-to - Task T056

  Modal for selecting event attendees from employee list

  Features:
  - Searchable employee list
  - Multi-select with checkboxes
  - Department filtering
  - Selected count display
  - Bulk select/deselect

  Props:
  - open: boolean - Modal open state
  - employees: Array of employee objects
  - selectedIds: string[] - Currently selected employee IDs
  - onConfirm: (selectedIds: string[]) => void
  - onCancel: () => void
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Users, X } from '@lucide/svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

	// Props with Svelte 5 runes
	let {
		open = $bindable(),
		employees,
		selectedIds = $bindable([]),
		onConfirm,
		onCancel
	}: {
		open: boolean;
		employees: Array<{
			id: string;
			displayName: string;
			email: string;
			jobTitle?: string;
			department?: { id: string; name: string };
		}>;
		selectedIds: string[];
		onConfirm: (selectedIds: string[]) => void;
		onCancel: () => void;
	} = $props();

	// State
	let searchTerm = $state('');
	let departmentFilter = $state<string>('all');
	let localSelectedIds = $state<string[]>([...selectedIds]);

	// Derived - unique departments
	let departments = $derived(
		Array.from(new Set(employees.map(e => e.department?.id).filter(Boolean)))
			.map(id => {
				const emp = employees.find(e => e.department?.id === id);
				return { id: id!, name: emp?.department?.name || 'Unknown' };
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	// Derived - filtered employees
	let filteredEmployees = $derived(
		employees.filter(emp => {
			// Search filter
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				emp.displayName.toLowerCase().includes(searchLower) ||
				emp.email.toLowerCase().includes(searchLower) ||
				emp.jobTitle?.toLowerCase().includes(searchLower);

			if (!matchesSearch) return false;

			// Department filter
			if (departmentFilter !== 'all') {
				return emp.department?.id === departmentFilter;
			}

			return true;
		})
	);

	// Derived - selection state
	let selectedCount = $derived(localSelectedIds.length);
	let allFilteredSelected = $derived(
		filteredEmployees.length > 0 &&
		filteredEmployees.every(emp => localSelectedIds.includes(emp.id))
	);

	// Toggle employee selection
	function toggleEmployee(employeeId: string) {
		if (localSelectedIds.includes(employeeId)) {
			localSelectedIds = localSelectedIds.filter(id => id !== employeeId);
		} else {
			localSelectedIds = [...localSelectedIds, employeeId];
		}
	}

	// Toggle all filtered employees
	function toggleAllFiltered() {
		if (allFilteredSelected) {
			// Deselect all filtered
			const filteredIds = new Set(filteredEmployees.map(e => e.id));
			localSelectedIds = localSelectedIds.filter(id => !filteredIds.has(id));
		} else {
			// Select all filtered
			const filteredIds = filteredEmployees.map(e => e.id);
			const uniqueIds = new Set([...localSelectedIds, ...filteredIds]);
			localSelectedIds = Array.from(uniqueIds);
		}
	}

	// Clear all selections
	function clearAll() {
		localSelectedIds = [];
	}

	// Handle confirm
	function handleConfirm() {
		onConfirm(localSelectedIds);
		selectedIds = localSelectedIds;
		open = false;
	}

	// Handle cancel
	function handleCancel() {
		localSelectedIds = [...selectedIds]; // Reset to original
		onCancel();
		open = false;
	}

	// Reset local state when modal opens
	$effect(() => {
		if (open) {
			localSelectedIds = [...selectedIds];
			searchTerm = '';
			departmentFilter = 'all';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl max-h-[80vh]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Select Attendees
			</Dialog.Title>
			<Dialog.Description>
				Choose employees to invite to this event
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Search and Filters -->
			<div class="flex gap-2">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search by name, email, or job title..."
						class="pl-9"
						bind:value={searchTerm}
					/>
				</div>

				<Select.Root bind:value={departmentFilter}>
					<Select.Trigger class="w-48">
						<Select.Value placeholder="All Departments" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All Departments</Select.Item>
						{#each departments as dept}
							<Select.Item value={dept.id}>{dept.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Selection Controls -->
			<div class="flex items-center justify-between border-b pb-2">
				<div class="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onclick={toggleAllFiltered}
						disabled={filteredEmployees.length === 0}
					>
						{allFilteredSelected ? 'Deselect All' : 'Select All'}
					</Button>
					{#if selectedCount > 0}
						<Button variant="ghost" size="sm" onclick={clearAll}>
							<X class="mr-1 h-3 w-3" />
							Clear
						</Button>
					{/if}
				</div>

				<Badge variant="secondary">
					{selectedCount} selected
				</Badge>
			</div>

			<!-- Employee List -->
			<ScrollArea class="h-96">
				<div class="space-y-2 pr-4">
					{#if filteredEmployees.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<Users class="mb-2 h-12 w-12 text-muted-foreground" />
							<p class="text-sm text-muted-foreground">
								No employees found matching your criteria
							</p>
						</div>
					{:else}
						{#each filteredEmployees as employee}
							<div
								class="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent"
								role="button"
								tabindex={0}
								onclick={() => toggleEmployee(employee.id)}
								onkeydown={(e) => e.key === 'Enter' && toggleEmployee(employee.id)}
							>
								<Checkbox
									checked={localSelectedIds.includes(employee.id)}
									onCheckedChange={() => toggleEmployee(employee.id)}
								/>
								<div class="flex-1 min-w-0">
									<p class="font-medium truncate">{employee.displayName}</p>
									<p class="text-sm text-muted-foreground truncate">
										{employee.email}
									</p>
									{#if employee.jobTitle || employee.department}
										<p class="text-xs text-muted-foreground">
											{employee.jobTitle || ''}
											{employee.jobTitle && employee.department ? ' • ' : ''}
											{employee.department?.name || ''}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</ScrollArea>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>
				Cancel
			</Button>
			<Button onclick={handleConfirm}>
				Add {selectedCount} {selectedCount === 1 ? 'Attendee' : 'Attendees'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
