<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Building, Building2, Edit, Eye, TreePine, Users } from '@lucide/svelte';

	interface Props {
		departments: any[];
		canViewEmployees: boolean;
		canManageDepartments: boolean;
	}

	let { departments, canViewEmployees, canManageDepartments }: Props = $props();
</script>

<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Name</Table.Head>
				<Table.Head>Parent</Table.Head>
				<Table.Head>Head</Table.Head>
				<Table.Head>Employees</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each departments as department}
				<Table.Row>
					<Table.Cell class="font-medium">
						<div class="flex items-center gap-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
								<Building2 class="h-4 w-4 text-primary" />
							</div>
							<div>
								<div>{department.name}</div>
								<div class="text-xs text-muted-foreground line-clamp-1">
									{department.description || ''}
								</div>
							</div>
						</div>
					</Table.Cell>
					<Table.Cell>
						{#if department.parentDepartment}
							<div class="flex items-center gap-1 text-muted-foreground">
								<Building class="h-3 w-3" />
								{department.parentDepartment.name}
							</div>
						{:else}
							<span class="text-muted-foreground text-xs">Top Level</span>
						{/if}
					</Table.Cell>
					<Table.Cell>
						{#if department.departmentHead}
							<div class="flex items-center gap-2">
								<div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
									<span class="text-xs font-medium"
										>{department.departmentHead.firstName?.[0]}{department.departmentHead
											.lastName?.[0]}</span
									>
								</div>
								<div class="flex flex-col">
									<span class="text-sm font-medium"
										>{department.departmentHead.displayName}</span
									>
									<span class="text-xs text-muted-foreground"
										>{department.departmentHead.jobTitle || 'Head'}</span
									>
								</div>
							</div>
						{:else}
							<Badge variant="outline" class="text-xs font-normal">Vacant</Badge>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<div class="flex flex-col gap-1">
							<div class="flex items-center gap-1">
								<Users class="h-3 w-3 text-muted-foreground" />
								<span>{department.employees?.totalCount || 0}</span>
							</div>
							{#if department.subDepartments?.totalCount > 0}
								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									<TreePine class="h-3 w-3" />
									<span>{department.subDepartments.totalCount} sub</span>
								</div>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="text-right">
						<div class="flex justify-end gap-2">
							{#if canViewEmployees}
								<Button
									variant="ghost"
									size="icon"
									href="/dashboard/departments/{department.id}"
								>
									<Eye class="h-4 w-4" />
								</Button>
							{/if}
							{#if canManageDepartments}
								<Button
									variant="ghost"
									size="icon"
									href="/dashboard/departments/{department.id}/edit"
								>
									<Edit class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
