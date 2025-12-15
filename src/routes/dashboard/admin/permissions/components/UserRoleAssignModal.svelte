<script lang="ts">
	import { enhance } from '$app/forms';
	import { Plus, X } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';

	interface Props {
		open: boolean;
		selectedUser: any;
		roles: any[];
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
		onSuccess: () => void;
	}

	let {
		open = $bindable(),
		selectedUser,
		roles,
		loading,
		onClose,
		onSubmit,
		onSuccess
	}: Props = $props();

	function userHasRole(user: any, roleId: string): boolean {
		return user.role === roleId || false;
	}
</script>

<Dialog.Root bind:open={open}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Manage Roles for {selectedUser?.email}</Dialog.Title>
			<Dialog.Description>Assign or remove roles for this user.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="rounded-md border">
				<div class="p-4">
					<h4 class="mb-3 text-sm font-medium text-foreground">Available Roles</h4>
					<div class="space-y-2">
						{#each roles as role}
							<div class="flex items-center justify-between rounded-md border p-3">
								<div>
									<p class="font-medium text-foreground">{role.name}</p>
									{#if role.description}
										<p class="text-xs text-muted-foreground">{role.description}</p>
									{/if}
								</div>
								{#if userHasRole(selectedUser, role.id)}
									<form
										method="POST"
										action="?/removeRoleFromUser"
										use:enhance={() => {
											onSubmit();
											return async ({ result, update }) => {
												if (result.type === 'success') {
													onSuccess();
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="userId" value={selectedUser?.id} />
										<input type="hidden" name="roleId" value={role.id} />
										<Button type="submit" variant="outline" size="sm" disabled={loading}>
											<X class="mr-1 h-3 w-3" />
											Remove
										</Button>
									</form>
								{:else}
									<form
										method="POST"
										action="?/assignRoleToUser"
										use:enhance={() => {
											onSubmit();
											return async ({ result, update }) => {
												if (result.type === 'success') {
													onSuccess();
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="userId" value={selectedUser?.id} />
										<input type="hidden" name="roleId" value={role.id} />
										<Button type="submit" variant="outline" size="sm" disabled={loading}>
											<Plus class="mr-1 h-3 w-3" />
											Assign
										</Button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={onClose}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
