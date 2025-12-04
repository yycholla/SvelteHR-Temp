<script lang="ts">
	import { Check, X } from '@lucide/svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Permission {
		id: string;
		resource: string;
		action: string;
		description?: string;
	}

	interface ResourcePermissions {
		readScope: 'none' | 'self' | 'team' | 'all';
		write: boolean;
		delete: boolean;
		special: { action: string; id: string; enabled: boolean }[];
	}

	interface Props {
		permissions: Permission[];
		permissionsState: Map<string, ResourcePermissions>;
		onPermissionChange: (resource: string, changes: Partial<ResourcePermissions>) => void;
	}

	let { permissions, permissionsState, onPermissionChange }: Props = $props();

	// Group permissions by resource with state
	let permissionsByResource = $derived.by(() => {
		const grouped: Record<string, ResourcePermissions & { allPermissions: Permission[] }> = {};

		// First, organize all permissions by resource
		permissions.forEach((perm) => {
			const resource = perm.resource;

			if (!grouped[resource]) {
				// Get state from parent or use defaults
				const state = permissionsState.get(resource) || {
					readScope: 'none',
					write: false,
					delete: false,
					special: []
				};

				grouped[resource] = {
					...state,
					allPermissions: []
				};
			}

			grouped[resource].allPermissions.push(perm);
		});

		// Ensure special permissions are properly populated
		Object.entries(grouped).forEach(([resource, data]) => {
			const allSpecialActions = data.allPermissions
				.filter(
					(p) =>
						![
							'read',
							'read:self',
							'read:team',
							'read:all',
							'write',
							'create',
							'update',
							'delete'
						].includes(p.action)
				)
				.map((p) => {
					const existingSpecial = data.special.find((s) => s.action === p.action);
					return {
						action: p.action,
						id: p.id,
						enabled: existingSpecial?.enabled || false
					};
				});

			grouped[resource].special = allSpecialActions;
		});

		return grouped;
	});

	// Resource icons mapping
	const resourceIcons: Record<string, string> = {
		dashboard: '📊',
		users: '👤',
		employees: '👥',
		departments: '🏢',
		events: '📅',
		tasks: '📋',
		activities: '📝',
		notifications: '🔔',
		attendance: '🕐',
		leave: '🏖️',
		performance: '📈',
		reviews: '⭐',
		goals: '🎯',
		reports: '📊',
		documents: '📄',
		management: '👔',
		teams: '👥',
		roles: '🛡️',
		permissions: '🔐',
		payroll: '💰',
		admin: '⚙️'
	};

	// Get resource icon or default
	function getResourceIcon(resource: string): string {
		return resourceIcons[resource.toLowerCase()] || '📦';
	}

	// Handle read scope change
	function handleReadScopeChange(resource: string, event: Event) {
		const target = event.target as HTMLSelectElement;
		const newScope = target.value as 'none' | 'self' | 'team' | 'all';

		// If changing to 'none', disable write and delete
		if (newScope === 'none') {
			onPermissionChange(resource, {
				readScope: newScope,
				write: false,
				delete: false
			});
		} else {
			onPermissionChange(resource, {
				readScope: newScope
			});
		}
	}

	// Handle write/delete checkbox change
	function handleCheckboxChange(resource: string, type: 'write' | 'delete', enabled: boolean) {
		// If enabling write/delete but no read scope, auto-grant read:self
		const currentScope = permissionsByResource[resource]?.readScope;
		if (enabled && currentScope === 'none') {
			onPermissionChange(resource, {
				[type]: enabled,
				readScope: 'self'
			});
		} else {
			onPermissionChange(resource, {
				[type]: enabled
			});
		}
	}

	// Handle special permission change
	function handleSpecialPermissionChange(
		resource: string,
		specialAction: string,
		enabled: boolean
	) {
		onPermissionChange(resource, {
			special: permissionsByResource[resource].special.map((s) =>
				s.action === specialAction ? { ...s, enabled } : s
			)
		});
	}

	// Sort resources alphabetically
	let sortedResources = $derived(Object.keys(permissionsByResource).sort());
</script>

<div class="overflow-x-auto">
	<table class="w-full border-collapse">
		<thead class="sticky top-0 bg-background border-b-2 z-10">
			<tr class="text-sm font-medium text-muted-foreground">
				<th class="text-left p-3 border-r">Resource</th>
				<th class="text-center p-3 border-r min-w-[140px]">Read Scope</th>
				<th class="text-center p-3 border-r w-20">Write</th>
				<th class="text-center p-3 border-r w-20">Delete</th>
				<th class="text-center p-3">Special Permissions</th>
			</tr>
		</thead>
		<tbody>
			{#each sortedResources as resource, index}
				{@const data = permissionsByResource[resource]}
				<tr
					class="border-b hover:bg-muted/50 transition-colors {index % 2 === 0
						? 'bg-muted/20'
						: ''}"
				>
					<!-- Resource Name -->
					<td class="p-3 border-r font-medium">
						<div class="flex items-center gap-2">
							<span class="text-xl">{getResourceIcon(resource)}</span>
							<span class="capitalize">{resource}</span>
						</div>
					</td>

					<!-- Read Scope Select -->
					<td class="p-3 border-r text-center">
						<select
							class="w-full px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							value={data.readScope}
							onchange={(e) => handleReadScopeChange(resource, e)}
						>
							<option value="none" class="text-muted-foreground">None</option>
							<option value="self" class="text-blue-600">Self</option>
							<option value="team" class="text-purple-600">Team</option>
							<option value="all" class="text-green-600">All</option>
						</select>
					</td>

					<!-- Write Checkbox -->
					<td class="p-3 border-r text-center">
						<input
							type="checkbox"
							class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring cursor-pointer"
							checked={data.write}
							onchange={(e) =>
								handleCheckboxChange(resource, 'write', (e.target as HTMLInputElement).checked)}
						/>
					</td>

					<!-- Delete Checkbox -->
					<td class="p-3 border-r text-center">
						<input
							type="checkbox"
							class="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-2 focus:ring-destructive cursor-pointer"
							checked={data.delete}
							onchange={(e) =>
								handleCheckboxChange(resource, 'delete', (e.target as HTMLInputElement).checked)}
						/>
					</td>

					<!-- Special Permissions -->
					<td class="p-3">
						{#if data.special.length > 0}
							<div class="flex flex-wrap gap-2 items-center justify-center">
								{#each data.special as special}
									<label
										class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background hover:bg-muted/50 cursor-pointer text-xs"
									>
										<input
											type="checkbox"
											class="w-3 h-3 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring cursor-pointer"
											checked={special.enabled}
											onchange={(e) =>
												handleSpecialPermissionChange(
													resource,
													special.action,
													(e.target as HTMLInputElement).checked
												)}
										/>
										<span class="capitalize">{special.action}</span>
									</label>
								{/each}
							</div>
						{:else}
							<span class="text-muted-foreground text-sm">—</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Ensure sticky header works properly */
	thead {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	/* Custom select styling */
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
</style>
