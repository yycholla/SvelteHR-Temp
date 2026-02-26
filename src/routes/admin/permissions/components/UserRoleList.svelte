<script lang="ts">
	import { Shield } from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface UserRoleRecord {
		id: string;
		email?: string;
		displayName?: string | null;
		department?: { name?: string } | null;
		role?: string | null;
		isActive?: boolean;
	}

	interface Props {
		filteredUsers: UserRoleRecord[];
		onManageRoles: (user: UserRoleRecord) => void;
	}

	const { filteredUsers, onManageRoles }: Props = $props();
</script>

<div class="border rounded-none">
	<Table.Table>
		<Table.TableHeader class="bg-muted/40 sticky top-0 z-10">
			<Table.TableRow class="border-b hover:bg-transparent">
				<Table.TableHead class="text-xs uppercase w-[20%]">Email</Table.TableHead>
				<Table.TableHead class="text-xs uppercase w-[20%]">Display Name</Table.TableHead>
				<Table.TableHead class="text-xs uppercase w-[15%]">Department</Table.TableHead>
				<Table.TableHead class="text-xs uppercase w-[25%]">Assigned Roles</Table.TableHead>
				<Table.TableHead class="text-xs uppercase w-[10%]">Status</Table.TableHead>
				<Table.TableHead class="text-right text-xs uppercase w-[10%]">Actions</Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each filteredUsers as user (user.id)}
				<Table.TableRow class="hover:bg-muted/5 group">
					<Table.TableCell class="font-medium py-2">{user.email}</Table.TableCell>
					<Table.TableCell class="py-2">{user.displayName || '—'}</Table.TableCell>
					<Table.TableCell class="py-2">{user.department?.name || '—'}</Table.TableCell>
					<Table.TableCell class="py-2">
						<div class="flex flex-wrap gap-1">
							{#if user.role}
								<Badge variant="secondary" class="font-normal text-xs">{user.role}</Badge>
							{:else}
								<span class="text-xs text-muted-foreground">No role</span>
							{/if}
						</div>
					</Table.TableCell>
					<Table.TableCell class="py-2">
						{#if user.isActive}
							<div
								class="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full ring-1 ring-inset ring-green-600/20"
							>
								Active
							</div>
						{:else}
							<div
								class="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
							>
								Inactive
							</div>
						{/if}
					</Table.TableCell>
					<Table.TableCell class="text-right py-2">
						<Button
							variant="ghost"
							size="sm"
							class="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={() => onManageRoles(user)}
						>
							<Shield class="mr-2 h-3.5 w-3.5" />
							Manage
						</Button>
					</Table.TableCell>
				</Table.TableRow>
			{:else}
				<Table.TableRow>
					<Table.TableCell colspan={6} class="text-center py-8 text-muted-foreground">
						No users found
					</Table.TableCell>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
</div>
