<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ChevronDown, ChevronRight, Edit, Shield, Trash2 } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Props {
		filteredRoles: any[];
		expandedRoles: Set<string>;
		onEditRole: (role: any) => void;
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

	function getPermissionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
		if (action.includes('delete') || action.includes('remove')) return 'destructive';
		if (action.includes('write') || action.includes('update')) return 'default';
		return 'secondary';
	}
</script>

<div class="space-y-4">
	{#each filteredRoles as role (role.id)}
		<Card.Card>
			<Card.CardHeader>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<button
							onclick={() => toggleRoleExpansion(role.id)}
							class="rounded-md p-1 hover:bg-accent"
						>
							{#if expandedRoles.has(role.id)}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronRight class="h-4 w-4" />
							{/if}
						</button>
						<div>
							<Card.CardTitle>{role.name}</Card.CardTitle>
							{#if role.description}
								<Card.CardDescription>{role.description}</Card.CardDescription>
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Badge variant="secondary">
							{role.permissions?.length || 0} permissions
						</Badge>
						<Button
							variant="outline"
							size="sm"
							onclick={() => goto(`/dashboard/admin/permissions/${role.id}`)}
						>
							<Shield class="mr-2 h-3 w-3" />
							Manage Permissions
						</Button>
						<Button variant="outline" size="sm" onclick={() => onEditRole(role)}>
							<Edit class="h-3 w-3" />
						</Button>
						<form method="POST" action="?/deleteRole" use:enhance>
							<input type="hidden" name="id" value={role.id} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								onclick={(event) => {
									if (!confirm(`Delete role "${role.name}"? This action cannot be undone.`)) {
										event.preventDefault();
									}
								}}
							>
								<Trash2 class="h-3 w-3 text-destructive" />
							</Button>
						</form>
					</div>
				</div>
			</Card.CardHeader>

			{#if expandedRoles.has(role.id)}
				<Card.CardContent>
					<div class="space-y-2">
						<h4 class="text-sm font-medium text-foreground">Assigned Permissions:</h4>
						{#if role.permissions && role.permissions.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each role.permissions as permission (permission.id)}
									<Badge variant={getPermissionBadgeVariant(permission.action)}>
										{permission.resource}:{permission.action}
									</Badge>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No permissions assigned</p>
						{/if}
					</div>
				</Card.CardContent>
			{/if}
		</Card.Card>
	{:else}
		<Card.Card>
			<Card.CardContent class="py-8">
				<p class="text-center text-muted-foreground">No roles found</p>
			</Card.CardContent>
		</Card.Card>
	{/each}
</div>
