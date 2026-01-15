<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';

	interface Props {
		open: boolean;
		roleForm: { name: string; description: string };
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
		onSuccess: () => void;
	}

	let {
		open = $bindable(),
		roleForm = $bindable(),
		loading,
		onClose,
		onSubmit,
		onSuccess
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Role</Dialog.Title>
			<Dialog.Description>
				Create a new role and assign permissions to control access.
			</Dialog.Description>
		</Dialog.Header>

		<form
			id="create-role-form"
			method="POST"
			action="?/createRole"
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
			<div>
				<label for="role-name" class="block text-sm font-medium text-foreground">Role Name *</label>
				<input
					id="role-name"
					name="name"
					type="text"
					bind:value={roleForm.name}
					required
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					placeholder="e.g., HR Manager, Team Lead"
				/>
			</div>

			<div>
				<label for="role-description" class="block text-sm font-medium text-foreground"
					>Description</label
				>
				<textarea
					id="role-description"
					name="description"
					bind:value={roleForm.description}
					rows="3"
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					placeholder="Describe the role's responsibilities..."
				></textarea>
			</div>
		</form>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={onClose}>Cancel</Button>
			<Button type="submit" form="create-role-form" disabled={loading}>
				{loading ? 'Creating...' : 'Create Role'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
