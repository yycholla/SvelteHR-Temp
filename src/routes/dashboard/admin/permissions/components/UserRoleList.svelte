<script lang="ts">
	import { Shield } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Props {
		filteredUsers: any[];
		onManageRoles: (user: any) => void;
	}

	const { filteredUsers, onManageRoles }: Props = $props();
</script>

<Card.Card>
	<Table.Table>
		<Table.TableHeader>
			<Table.TableRow>
				<Table.TableHead>Email</Table.TableHead>
				<Table.TableHead>Display Name</Table.TableHead>
				<Table.TableHead>Department</Table.TableHead>
				<Table.TableHead>Assigned Roles</Table.TableHead>
				<Table.TableHead>Status</Table.TableHead>
				<Table.TableHead class="text-right">Actions</Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each filteredUsers as user (user.id)}
				<Table.TableRow>
					<Table.TableCell class="font-medium">{user.email}</Table.TableCell>
					<Table.TableCell>{user.displayName || '—'}</Table.TableCell>
					<Table.TableCell>{user.department?.name || '—'}</Table.TableCell>
					<Table.TableCell>
						<div class="flex flex-wrap gap-1">
							{#if user.role}
								<Badge variant="secondary">{user.role}</Badge>
							{:else}
								<span class="text-sm text-muted-foreground">No role</span>
							{/if}
						</div>
					</Table.TableCell>
					<Table.TableCell>
						{#if user.isActive}
							<Badge
								variant="default"
								class="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
							>
								Active
							</Badge>
						{:else}
							<Badge variant="secondary">Inactive</Badge>
						{/if}
					</Table.TableCell>
					<Table.TableCell class="text-right">
						<Button variant="outline" size="sm" onclick={() => onManageRoles(user)}>
							<Shield class="mr-2 h-3 w-3" />
							Manage Roles
						</Button>
					</Table.TableCell>
				</Table.TableRow>
			{:else}
				<Table.TableRow>
					<Table.TableCell colspan={6} class="text-center text-muted-foreground">
						No users found
					</Table.TableCell>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
</Card.Card>
