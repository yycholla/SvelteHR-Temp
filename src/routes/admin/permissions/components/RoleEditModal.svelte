<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';

	interface RoleSummary {
		id: string;
	}

	interface Props {
		open: boolean;
		selectedRole: RoleSummary | null;
		roleForm: { name: string; description: string };
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
		onSuccess: () => void;
	}

	let {
		open = $bindable(),
		selectedRole,
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
			<Dialog.Title>Edit Role</Dialog.Title>
			<Dialog.Description>Update role name and description.</Dialog.Description>
		</Dialog.Header>

		<form
			id="edit-role-form"
			method="POST"
			action="?/updateRole"
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
			<input type="hidden" name="id" value={selectedRole?.id} />

			<div>
				<label for="edit-role-name" class="block text-sm font-medium text-foreground"
					>Role Name *</label
				>
				<input
					id="edit-role-name"
					name="name"
					type="text"
					bind:value={roleForm.name}
					required
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="edit-role-description" class="block text-sm font-medium text-foreground"
					>Description</label
				>
				<textarea
					id="edit-role-description"
					name="description"
					bind:value={roleForm.description}
					rows="3"
					class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				></textarea>
			</div>
		</form>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={onClose}>Cancel</Button>
			<Button type="submit" form="edit-role-form" disabled={loading}>
				{loading ? 'Updating...' : 'Update Role'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
