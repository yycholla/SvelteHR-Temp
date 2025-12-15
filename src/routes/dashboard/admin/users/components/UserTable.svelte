<script lang="ts">
	import { Edit, Trash2, UserCheck, UserX } from '@lucide/svelte';

	interface Props {
		filteredUsers: any[];
		loading: boolean;
		onToggleStatus: (user: any) => void;
		onEditUser: (user: any) => void;
		onDeleteUser: (userId: string) => void;
	}

	const { filteredUsers, loading, onToggleStatus, onEditUser, onDeleteUser }: Props = $props();
</script>

<div class="overflow-x-auto rounded-md border">
	<table class="w-full text-sm" data-testid="admin-users-table">
		<thead class="border-b bg-muted/50">
			<tr>
				<th class="px-4 py-3 text-left font-medium">Email</th>
				<th class="px-4 py-3 text-left font-medium">Display Name</th>
				<th class="px-4 py-3 text-left font-medium">Role</th>
				<th class="px-4 py-3 text-left font-medium">Department</th>
				<th class="px-4 py-3 text-left font-medium">Status</th>
				<th class="px-4 py-3 text-right font-medium">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredUsers as user (user.id)}
				<tr class="border-b hover:bg-muted/50">
					<td class="px-4 py-3">{user.email}</td>
					<td class="px-4 py-3">{user.displayName || '—'}</td>
					<td class="px-4 py-3">
						{user.role || 'employee'}
					</td>
					<td class="px-4 py-3">{user.department?.name || '—'}</td>
					<td class="px-4 py-3">
						<button
							onclick={() => onToggleStatus(user)}
							disabled={loading}
							class="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
							class:bg-green-100={user.isActive}
							class:text-green-700={user.isActive}
							class:bg-red-100={!user.isActive}
							class:text-red-700={!user.isActive}
						>
							{#if user.isActive}
								<UserCheck class="h-3 w-3" />
								Active
							{:else}
								<UserX class="h-3 w-3" />
								Inactive
							{/if}
						</button>
					</td>
					<td class="px-4 py-3 text-right">
						<div class="flex justify-end gap-2">
							<button
								onclick={() => onEditUser(user)}
								disabled={loading}
								class="rounded-md p-2 hover:bg-accent"
								title="Edit user"
								data-testid="admin-edit-user-button"
							>
								<Edit class="h-4 w-4" />
							</button>
							<button
								onclick={() => onDeleteUser(user.id)}
								disabled={loading}
								class="rounded-md p-2 text-destructive hover:bg-destructive/10"
								title="Delete user"
								data-testid="admin-delete-user-button"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="px-4 py-8 text-center text-muted-foreground"> No users found </td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
