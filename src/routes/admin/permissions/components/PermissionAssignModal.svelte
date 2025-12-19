<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import type { Permission } from '$lib/types';

	interface Props {
		open: boolean;
		selectedRole: any;
		permissionsSelection: Set<string>;
		permissionsByResource: Record<string, Permission[]>;
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
		onSuccess: () => void;
	}

	let {
		open = $bindable(),
		selectedRole,
		permissionsSelection = $bindable(),
		permissionsByResource,
		loading,
		onClose,
		onSubmit,
		onSuccess
	}: Props = $props();

	function togglePermissionSelection(permissionId: string) {
		if (permissionsSelection.has(permissionId)) {
			permissionsSelection.delete(permissionId);
		} else {
			permissionsSelection.add(permissionId);
		}
		permissionsSelection = new Set(permissionsSelection);
	}

	function hasPermission(role: any, permissionId: string): boolean {
		return role?.permissions?.some((p: any) => p.id === permissionId) || false;
	}
</script>

<Dialog.Root bind:open={open}>
	<Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Manage Permissions for {selectedRole?.name}</Dialog.Title>
			<Dialog.Description>
				Select permissions to assign to this role. Changes are saved when you click Apply.
			</Dialog.Description>
		</Dialog.Header>

		<form
			id="permissions-form"
			method="POST"
			action="?/bulkAssignPermissions"
			use:enhance={() => {
				onSubmit();
				return async ({ result, update }) => {
					if (result.type === 'success') {
						onSuccess();
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="roleId" value={selectedRole?.id} />
			<input
				type="hidden"
				name="permissionIds"
				value={JSON.stringify(Array.from(permissionsSelection))}
			/>

			<div class="space-y-4">
				{#each Object.entries(permissionsByResource) as [resource, permissions]}
					{@const typedPermissions = permissions as Permission[]}
					<div class="rounded-md border p-3">
						<h4 class="mb-2 font-medium capitalize text-foreground">{resource}</h4>
						<div class="space-y-2">
							{#each typedPermissions as permission (permission.id)}
								<label class="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-2">
									<input
										type="checkbox"
										checked={permissionsSelection.has(permission.id)}
										onchange={() => togglePermissionSelection(permission.id)}
										class="h-4 w-4 rounded border-gray-300"
									/>
									<div class="flex-1">
										<span class="text-sm font-medium text-foreground">
											{permission.resource}:{permission.action}
										</span>
										{#if permission.description}
											<p class="text-xs text-muted-foreground">{permission.description}</p>
										{/if}
									</div>
									{#if hasPermission(selectedRole, permission.id)}
										<Badge variant="secondary" class="text-xs">Current</Badge>
									{/if}
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</form>

		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
			<button
				type="button"
				class="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border border-input bg-background text-foreground text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors shadow-xs"
				onclick={onClose}
			>
				Cancel
			</button>
			<button
				type="submit"
				form="permissions-form"
				disabled={loading}
				class="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs"
			>
				{loading ? 'Applying...' : 'Apply Changes'}
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>
