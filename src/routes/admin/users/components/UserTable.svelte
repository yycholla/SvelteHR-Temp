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

<div class="relative w-full h-full overflow-auto bg-background">
	<table class="w-full text-sm text-left border-collapse" data-testid="admin-users-table">
		<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
			<tr>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
					>Email</th
				>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
					>Display Name</th
				>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
					>Role</th
				>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
					>Department</th
				>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
					>Status</th
				>
				<th
					class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right"
					>Actions</th
				>
			</tr>
		</thead>
		<tbody class="divide-y">
			{#each filteredUsers as user (user.id)}
				<tr class="hover:bg-muted/30 group">
					<td class="px-3 py-1.5 border-r last:border-r-0 truncate max-w-[200px]">{user.email}</td>
					<td class="px-3 py-1.5 border-r last:border-r-0 truncate max-w-[150px]"
						>{user.displayName || '—'}</td
					>
					<td class="px-3 py-1.5 border-r last:border-r-0">
						<span
							class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
						>
							{user.role || 'employee'}
						</span>
					</td>
					<td class="px-3 py-1.5 border-r last:border-r-0">{user.department?.name || '—'}</td>
					<td class="px-3 py-1.5 border-r last:border-r-0">
						<button
							onclick={() => onToggleStatus(user)}
							disabled={loading}
							class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-xs font-medium transition-colors hover:bg-muted"
							class:text-green-600={user.isActive}
							class:text-muted-foreground={!user.isActive}
						>
							{#if user.isActive}
								<UserCheck class="h-3.5 w-3.5" />
								<span>Active</span>
							{:else}
								<UserX class="h-3.5 w-3.5" />
								<span>Inactive</span>
							{/if}
						</button>
					</td>
					<td class="px-3 py-1.5 text-right">
						<div
							class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<button
								onclick={() => onEditUser(user)}
								disabled={loading}
								class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
								title="Edit"
							>
								<Edit class="h-3.5 w-3.5" />
							</button>
							<button
								onclick={() => onDeleteUser(user.id)}
								disabled={loading}
								class="p-1 rounded hover:bg-background border border-transparent hover:border-destructive/30 text-muted-foreground hover:text-destructive"
								title="Delete"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="px-4 py-12 text-center text-muted-foreground text-xs">
						No users found matching your filters
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
