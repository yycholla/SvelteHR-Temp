<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Edit, Shield, Trash2, ChevronRight, ChevronDown } from '@lucide/svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface PermissionRecord {
		id: string;
		resource?: string;
		action?: string;
	}

	interface RoleRecord {
		id: string;
		name: string;
		description?: string | null;
		permissions?: PermissionRecord[];
	}

	interface Props {
		filteredRoles: RoleRecord[];
		expandedRoles: Set<string>;
		onEditRole: (role: RoleRecord) => void;
	}

	let { filteredRoles, expandedRoles = $bindable(), onEditRole }: Props = $props();

	function toggleRoleExpansion(roleId: string) {
		if (expandedRoles.has(roleId)) {
			expandedRoles.delete(roleId);
		} else {
			expandedRoles.add(roleId);
		}
		expandedRoles = new Set(expandedRoles); // Trigger reactivity
	}

	function getPermissionBadgeVariant(
		action: string | undefined
	): 'default' | 'secondary' | 'destructive' {
		if (!action) return 'secondary';
		if (action.includes('delete') || action.includes('remove')) return 'destructive';
		if (action.includes('write') || action.includes('update')) return 'default';
		return 'secondary';
	}
</script>

<div class="border rounded-none">
	<div
		class="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0 z-10"
	>
		<div class="w-8"></div>
		<div>Role Name</div>
		<div>Description</div>
		<div class="text-right">Actions</div>
	</div>

	<div class="divide-y">
		{#each filteredRoles as role (role.id)}
			<div class="group bg-background hover:bg-muted/5 transition-colors">
				<div class="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 items-center">
					<button
						onclick={() => toggleRoleExpansion(role.id)}
						class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
					>
						{#if expandedRoles.has(role.id)}
							<ChevronDown class="h-4 w-4" />
						{:else}
							<ChevronRight class="h-4 w-4" />
						{/if}
					</button>

					<div class="font-medium text-sm text-foreground">
						{role.name}
						<span
							class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
						>
							{role.permissions?.length || 0} perms
						</span>
					</div>

					<div class="text-sm text-muted-foreground truncate">
						{role.description || '-'}
					</div>

					<div
						class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<Button
							variant="ghost"
							size="sm"
							class="h-8 px-2"
							onclick={() => goto(`/admin/permissions/${role.id}`)}
							title="Manage Permissions"
						>
							<Shield class="h-4 w-4 text-muted-foreground hover:text-primary" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="h-8 px-2"
							onclick={() => onEditRole(role)}
							title="Edit Role"
						>
							<Edit class="h-4 w-4 text-muted-foreground hover:text-primary" />
						</Button>
						<form method="POST" action="?/deleteRole" use:enhance class="inline-block">
							<input type="hidden" name="id" value={role.id} />
							<Button
								type="submit"
								variant="ghost"
								size="sm"
								class="h-8 px-2"
								onclick={(event) => {
									if (!confirm(`Delete role "${role.name}"? This action cannot be undone.`)) {
										event.preventDefault();
									}
								}}
								title="Delete Role"
							>
								<Trash2 class="h-4 w-4 text-muted-foreground hover:text-destructive" />
							</Button>
						</form>
					</div>
				</div>

				{#if expandedRoles.has(role.id)}
					<div class="px-4 pb-4 pt-0 pl-16">
						<div class="p-4 bg-muted/30 rounded-md border border-dashed">
							<h4 class="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
								Assigned Permissions
							</h4>
							{#if role.permissions && role.permissions.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each role.permissions as permission (permission.id)}
										<Badge
											variant={getPermissionBadgeVariant(permission.action)}
											class="text-[10px] px-1.5 py-0.5 h-5"
										>
											{permission.resource || 'general'}:{permission.action || 'read'}
										</Badge>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground italic">No permissions assigned</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="py-12 text-center text-sm text-muted-foreground">No roles found</div>
		{/each}
	</div>
</div>
