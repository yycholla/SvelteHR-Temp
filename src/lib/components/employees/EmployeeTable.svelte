<script lang="ts">
	import { ChevronDown, ChevronUp, Mail, Phone, Edit, Eye, MoreHorizontal } from 'lucide-svelte';
	import { formatHireDate } from '$lib/utils/date';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import DropdownMenu from '$lib/components/ui/dropdown-menu/dropdown-menu.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte';
	import DropdownMenuContent from '$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
	import type { Employee } from '$lib/api/types-v2';
	import { goto } from '$app/navigation';

	let { employees }: { employees: Employee[] } = $props();

	type SortField = 'name' | 'department' | 'position' | 'status' | 'hireDate';
	type SortDirection = 'asc' | 'desc';

	let sortField = $state<SortField>('name');
	let sortDirection = $state<SortDirection>('asc');

	let sortedEmployees = $derived.by(() => {
		return [...employees].sort((a, b) => {
			let aValue: string | Date;
			let bValue: string | Date;

			switch (sortField) {
				case 'name':
					aValue = a.full_name || `${a.first_name || ''} ${a.last_name || ''}`;
					bValue = b.full_name || `${b.first_name || ''} ${b.last_name || ''}`;
					break;
				case 'department':
					aValue = a.department_name || '';
					bValue = b.department_name || '';
					break;
				case 'position':
					aValue = a.job_title || '';
					bValue = b.job_title || '';
					break;
				case 'status':
					aValue = a.status || '';
					bValue = b.status || '';
					break;
				case 'hireDate':
					aValue = a.hire_date ? new Date(a.hire_date) : new Date(0);
					bValue = b.hire_date ? new Date(b.hire_date) : new Date(0);
					break;
				default:
					aValue = '';
					bValue = '';
			}

			if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	function handleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'bg-green-500/20 text-green-700 border-green-500/30';
			case 'ON_LEAVE':
				return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
			case 'INACTIVE':
				return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
			default:
				return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
		}
	}

	function getDepartmentColor(color: string) {
		const colors: Record<string, string> = {
			blue: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
			green: 'bg-green-500/20 text-green-700 border-green-500/30',
			purple: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
			orange: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
			emerald: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
			indigo: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
			pink: 'bg-pink-500/20 text-pink-700 border-pink-500/30',
			slate: 'bg-slate-500/20 text-slate-700 border-slate-500/30'
		};
		return colors[color] || colors['slate'];
	}

	function getInitials(employee: Employee) {
		const firstName = employee.first_name || '';
		const lastName = employee.last_name || '';
		return `${firstName.charAt(0) || 'U'}${lastName.charAt(0) || 'U'}`;
	}

	function viewEmployee(employee: Employee) {
		goto(`/employees/${employee.id}`);
	}

	function editEmployee(employee: Employee) {
		goto(`/employees/${employee.id}/edit`);
	}
</script>

<div class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead>
				<tr class="border-b border-border/20">
					<th class="p-4 text-left">
						<Button
							variant="ghost"
							onclick={() => handleSort('name')}
							class="rounded-lg font-semibold text-foreground hover:bg-background/20"
						>
							Employee
							{#if sortField === 'name'}
								{#if sortDirection === 'asc'}
									<ChevronUp class="ml-1 h-4 w-4" />
								{:else}
									<ChevronDown class="ml-1 h-4 w-4" />
								{/if}
							{/if}
						</Button>
					</th>
					<th class="p-4 text-left">
						<Button
							variant="ghost"
							onclick={() => handleSort('position')}
							class="rounded-lg font-semibold text-foreground hover:bg-background/20"
						>
							Position
							{#if sortField === 'position'}
								{#if sortDirection === 'asc'}
									<ChevronUp class="ml-1 h-4 w-4" />
								{:else}
									<ChevronDown class="ml-1 h-4 w-4" />
								{/if}
							{/if}
						</Button>
					</th>
					<th class="p-4 text-left">
						<Button
							variant="ghost"
							onclick={() => handleSort('department')}
							class="rounded-lg font-semibold text-foreground hover:bg-background/20"
						>
							Department
							{#if sortField === 'department'}
								{#if sortDirection === 'asc'}
									<ChevronUp class="ml-1 h-4 w-4" />
								{:else}
									<ChevronDown class="ml-1 h-4 w-4" />
								{/if}
							{/if}
						</Button>
					</th>
					<th class="p-4 text-left">
						<Button
							variant="ghost"
							onclick={() => handleSort('status')}
							class="rounded-lg font-semibold text-foreground hover:bg-background/20"
						>
							Status
							{#if sortField === 'status'}
								{#if sortDirection === 'asc'}
									<ChevronUp class="ml-1 h-4 w-4" />
								{:else}
									<ChevronDown class="ml-1 h-4 w-4" />
								{/if}
							{/if}
						</Button>
					</th>
					<th class="p-4 text-left">
						<Button
							variant="ghost"
							onclick={() => handleSort('hireDate')}
							class="rounded-lg font-semibold text-foreground hover:bg-background/20"
						>
							Hire Date
							{#if sortField === 'hireDate'}
								{#if sortDirection === 'asc'}
									<ChevronUp class="ml-1 h-4 w-4" />
								{:else}
									<ChevronDown class="ml-1 h-4 w-4" />
								{/if}
							{/if}
						</Button>
					</th>
					<th class="p-4 text-left">
						<span class="font-semibold text-foreground">Contact</span>
					</th>
					<th class="p-4 text-right">
						<span class="font-semibold text-foreground">Actions</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedEmployees as employee (employee.id)}
					<tr class="border-b border-border/10 transition-colors hover:bg-background/10">
						<!-- Employee Info -->
						<td class="p-4">
							<div class="flex items-center space-x-3">
								<Avatar class="h-10 w-10 ring-2 ring-background/50">
									<AvatarFallback class="bg-primary/10 text-sm font-semibold text-primary">
										{getInitials(employee)}
									</AvatarFallback>
								</Avatar>
								<div>
									<div class="font-medium text-foreground">
										{employee.full_name ||
											`${employee.first_name || ''} ${employee.last_name || ''}` ||
											'Unknown User'}
									</div>
									<div class="text-sm text-muted-foreground">
										{employee.employee_id || employee.username || employee.id}
									</div>
								</div>
							</div>
						</td>

						<!-- Position -->
						<td class="p-4">
							<div class="font-medium text-foreground">
								{employee.job_title || 'No Title'}
							</div>
							<div class="text-sm text-muted-foreground">
								{employee.employment_type || ''}
							</div>
						</td>

						<!-- Department -->
						<td class="p-4">
							<Badge class="rounded-lg border {getDepartmentColor('blue')}">
								{employee.department_name || 'No Department'}
							</Badge>
						</td>

						<!-- Status -->
						<td class="p-4">
							<Badge class="rounded-lg border {getStatusColor(employee.status)}">
								{employee.status.replace('_', ' ')}
							</Badge>
						</td>

						<!-- Hire Date -->
						<td class="p-4">
							<div class="text-sm text-foreground">
								{employee.hire_date ? formatHireDate(employee.hire_date) : 'Not set'}
							</div>
						</td>

						<!-- Contact -->
						<td class="p-4">
							<div class="space-y-1">
								<div class="flex items-center space-x-2 text-sm text-muted-foreground">
									<Mail class="h-3 w-3" />
									<span class="max-w-[150px] truncate">{employee.email}</span>
								</div>
								{#if employee.phone_number}
									<div class="flex items-center space-x-2 text-sm text-muted-foreground">
										<Phone class="h-3 w-3" />
										<span>{employee.phone_number}</span>
									</div>
								{/if}
							</div>
						</td>

						<!-- Actions -->
						<td class="p-4">
							<div class="flex items-center justify-end space-x-2">
								<Button
									size="sm"
									variant="ghost"
									onclick={() => viewEmployee(employee)}
									class="rounded-lg"
								>
									<Eye class="h-3 w-3" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onclick={() => editEmployee(employee)}
									class="rounded-lg"
								>
									<Edit class="h-3 w-3" />
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="ghost" class="rounded-lg">
											<MoreHorizontal class="h-3 w-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										class="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-md"
									>
										<DropdownMenuItem onclick={() => viewEmployee(employee)} class="rounded-lg">
											<Eye class="mr-2 h-4 w-4" />
											View Details
										</DropdownMenuItem>
										<DropdownMenuItem onclick={() => editEmployee(employee)} class="rounded-lg">
											<Edit class="mr-2 h-4 w-4" />
											Edit Employee
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
