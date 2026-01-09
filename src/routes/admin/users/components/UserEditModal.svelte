<script lang="ts">
	interface Props {
		open: boolean;
		selectedUser: any;
		formData: any;
		departments: any[];
		allUsers: any[];
		loading: boolean;
		onClose: () => void;
		onSubmit: () => void;
	}

	let {
		open = $bindable(),
		selectedUser,
		formData = $bindable(),
		departments,
		allUsers,
		loading,
		onClose,
		onSubmit
	}: Props = $props();
</script>

{#if open && selectedUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Edit User</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
				class="space-y-4"
			>
				<div>
					<label for="edit-email" class="block text-sm font-medium">Email *</label>
					<input
						id="edit-email"
						type="email"
						bind:value={formData.email}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-displayName" class="block text-sm font-medium">Display Name</label>
					<input
						id="edit-displayName"
						type="text"
						bind:value={formData.displayName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-department" class="block text-sm font-medium">Department</label>
					<select
						id="edit-department"
						bind:value={formData.departmentId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">None</option>
						{#each departments as dept}
							<option value={dept.id}>{dept.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="edit-manager" class="block text-sm font-medium">Manager</label>
					<select
						id="edit-manager"
						bind:value={formData.managerId}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">None</option>
						{#each allUsers as user}
							{#if user.id !== selectedUser?.id}
								<option value={user.id}>{user.displayName || user.email}</option>
							{/if}
						{/each}
					</select>
				</div>

				<div>
					<label for="edit-jobTitle" class="block text-sm font-medium">Job Title</label>
					<input
						id="edit-jobTitle"
						type="text"
						bind:value={formData.jobTitle}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-phone" class="block text-sm font-medium">Phone</label>
					<input
						id="edit-phone"
						type="tel"
						bind:value={formData.phone}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-mobile" class="block text-sm font-medium">Mobile</label>
					<input
						id="edit-mobile"
						type="tel"
						bind:value={formData.mobilePhone}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-birthDate" class="block text-sm font-medium">Birth Date</label>
					<input
						id="edit-birthDate"
						type="date"
						bind:value={formData.birthDate}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="edit-hireDate" class="block text-sm font-medium">Hire Date</label>
					<input
						id="edit-hireDate"
						type="date"
						bind:value={formData.hireDate}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div class="flex items-center gap-2">
					<input id="edit-isActive" type="checkbox" bind:checked={formData.isActive} />
					<label for="edit-isActive" class="text-sm font-medium">Active</label>
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
						{loading ? 'Updating...' : 'Update User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
