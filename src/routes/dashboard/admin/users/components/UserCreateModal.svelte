<script lang="ts">
	interface Props {
		open: boolean;
		formData: any;
		roles: any[];
		departments: any[];
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
	}

	let {
		open = $bindable(),
		formData = $bindable(),
		roles,
		departments,
		loading,
		onClose,
		onSubmit
	}: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Create New User</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
				class="space-y-4"
			>
				<div>
					<label for="email" class="block text-sm font-medium">Email *</label>
					<input
						id="email"
						type="email"
						bind:value={formData.email}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="displayName" class="block text-sm font-medium">Display Name</label>
					<input
						id="displayName"
						type="text"
						bind:value={formData.displayName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium">Password *</label>
					<input
						id="password"
						type="password"
						bind:value={formData.password}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="role" class="block text-sm font-medium">Role</label>
					<select
						id="role"
						bind:value={formData.roleId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						{#each roles as role}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="department" class="block text-sm font-medium">Department</label>
					<select
						id="department"
						bind:value={formData.departmentId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">None</option>
						{#each departments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<input id="isActive" type="checkbox" bind:checked={formData.isActive} />
					<label for="isActive" class="text-sm font-medium">Active</label>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={onClose}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
