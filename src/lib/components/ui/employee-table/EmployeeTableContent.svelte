<script lang="ts">
	import {
		ChevronDown,
		ChevronUp,
		ChevronsUpDown,
		Edit,
		Eye,
		Users,
		UserCheck,
		UserX,
		Trash2
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import HtmlCheckbox from '$lib/components/ui/checkbox/html-checkbox.svelte';
	import * as Table from '$lib/components/ui/table';

	interface Props {
		table: any;
		columns: any[];
		hasActiveFilters: boolean;
		departmentMap: Map<string, string>;
		canViewEmployees: boolean;
		canEditEmployees: boolean;
		loading: boolean;
		onRowClick: (id: string) => void;
		onViewEmployee: (id: string, event: Event) => void;
		onEditEmployee: (id: string, event: Event) => void;
		onToggleStatus?: (user: any) => void; // Optional if used for admin table
		onDeleteEmployee?: (id: string) => void; // Optional
		canManageEmployee: (employee: any) => boolean;
		formatRole: (role: string | null) => string;
		formatHireDate: (date: string | null) => string;
		getStatusBadgeVariant: (isActive: boolean) => 'default' | 'secondary';
	}

	const {
		table,
		columns,
		hasActiveFilters,
		departmentMap,
		canViewEmployees,
		canEditEmployees,
		loading,
		onRowClick,
		onViewEmployee,
		onEditEmployee,
		onToggleStatus,
		onDeleteEmployee,
		canManageEmployee,
		formatRole,
		formatHireDate,
		getStatusBadgeVariant
	}: Props = $props();
</script>

<div
	class="overflow-auto rounded-md border bg-card text-card-foreground"
	data-testid="employee-datatable"
>
	<Table.Root class="w-full table-auto">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						<Table.Head
							class={header.column.getCanSort()
								? 'cursor-pointer'
								: '' +
									(header.column.id === 'select'
										? ' pr-2 pl-6'
										: header.column.id === 'displayName'
											? ' pl-2'
											: '')}
							style={header.column.columnDef.size
								? `width: ${header.column.columnDef.size}px; min-width: ${header.column.columnDef.size}px;`
								: ''}
							onclick={header.column.getCanSort()
								? () => header.column.toggleSorting()
								: undefined}
						>
							{#if !header.isPlaceholder}
								<div class="flex items-center gap-2">
									{#if header.column.id === 'select'}
										<div class="flex items-center justify-center">
											<HtmlCheckbox
												checked={table?.getIsAllPageRowsSelected() ?? false}
												indeterminate={(table?.getIsSomePageRowsSelected() ?? false) &&
													!(table?.getIsAllPageRowsSelected() ?? false)}
												disabled={!hasActiveFilters}
												onCheckedChange={(value) => {
													table?.toggleAllPageRowsSelected(!!value);
												}}
												aria-label="Select all rows"
											/>
										</div>
									{:else if header.column.id === 'actions'}
										<div class="w-full text-right">Actions</div>
									{:else}
										<span>{header.column.columnDef.header}</span>
									{/if}
									{#if header.column.getCanSort()}
										{#if header.column.getIsSorted() === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else if header.column.getIsSorted() === 'desc'}
											<ChevronDown class="h-4 w-4" />
										{:else}
											<ChevronsUpDown class="h-4 w-4 opacity-50" />
										{/if}
									{/if}
								</div>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#if table.getRowModel().rows?.length}
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row
						class="cursor-pointer hover:bg-muted/50"
						onclick={() => onRowClick(row.original.id)}
					>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell
								class={cell.column.id === 'select'
									? 'pr-2 pl-6'
									: cell.column.id === 'displayName'
										? 'pl-2'
										: ''}
								style={cell.column.columnDef.size
									? `width: ${cell.column.columnDef.size}px; min-width: ${cell.column.columnDef.size}px;`
									: ''}
							>
								{#if cell.column.id === 'select'}
									{@const isRowSelected = row?.getIsSelected() ?? false}
									<HtmlCheckbox
										checked={isRowSelected}
										disabled={!row?.getCanSelect()}
										onCheckedChange={(value) => {
											row?.toggleSelected(!!value);
										}}
										onclick={(e: MouseEvent) => e.stopPropagation()}
									/>
								{:else if cell.column.id === 'displayName'}
									<div class="flex items-center gap-1.5">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
										>
											<Users class="h-5 w-5 text-primary" />
										</div>
										<div class="font-medium">{row.original.displayName}</div>
									</div>
								{:else if cell.column.id === 'email'}
									{#if row.original.email}
										<a
											href="mailto:{row.original.email}"
											class="text-sm hover:text-primary"
											onclick={(e: Event) => e.stopPropagation()}
										>
											{row.original.email}
										</a>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'departmentId'}
									{#if row.original.departmentId}
										<span class="text-sm"
											>{departmentMap.get(row.original.departmentId) || 'Unknown'}</span
										>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'role'}
									{#if row.original.role}
										<Badge variant="outline">{formatRole(row.original.role)}</Badge>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'hireDate'}
									<span class="text-sm text-muted-foreground">
										{formatHireDate(row.original.hireDate)}
									</span>
								{:else if cell.column.id === 'isActive'}
									<Badge variant={getStatusBadgeVariant(row.original.isActive)}>
										{row.original.isActive ? 'Active' : 'Inactive'}
									</Badge>
								{:else if cell.column.id === 'actions'}
									{@const canManage = canManageEmployee(row.original)}
									<div class="flex justify-end gap-1">
										{#if canViewEmployees}
											<Button
												variant="ghost"
												size="sm"
												disabled={!canManage}
												class={!canManage ? 'cursor-not-allowed opacity-50' : ''}
												onclick={(e) => {
													if (canManage) {
														onViewEmployee(row.original.id, e);
													} else {
														e.stopPropagation();
													}
												}}
											>
												<Eye class="h-4 w-4" />
											</Button>
										{/if}
										{#if canEditEmployees}
											<Button
												variant="ghost"
												size="sm"
												disabled={!canManage}
												class={!canManage ? 'cursor-not-allowed opacity-50' : ''}
												onclick={(e) => {
													if (canManage) {
														onEditEmployee(row.original.id, e);
													} else {
														e.stopPropagation();
													}
												}}
											>
												<Edit class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">
						<div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
							<Users class="h-8 w-8" />
							<p>No employees found</p>
						</div>
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>
