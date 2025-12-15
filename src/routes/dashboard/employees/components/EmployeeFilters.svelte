<script lang="ts">
	import { ChevronDown, Settings2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';

	interface Props {
		searchTerms: string[];
		selectedDepartment: string;
		selectedRole: string;
		selectedStatus: string;
		pageSize: number;
		departments: any[];
		uniqueRoles: string[];
		employeeSearchOptions: any[];
		canViewInactiveEmployees: boolean;
		layout?: 'horizontal' | 'vertical';
		columnVisibility?: Record<string, boolean>;
		onSearch: () => void;
		onClear: () => void;
		onPageSizeChange: (size: number) => void;
		onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
	}

	let {
		searchTerms = $bindable(),
		selectedDepartment = $bindable(),
		selectedRole = $bindable(),
		selectedStatus = $bindable(),
		pageSize = $bindable(),
		departments,
		uniqueRoles,
		employeeSearchOptions,
		canViewInactiveEmployees,
		layout = 'horizontal',
		columnVisibility = $bindable(),
		onSearch,
		onClear,
		onPageSizeChange,
		onColumnVisibilityChange
	}: Props = $props();

	// Local state for showInactive checkbox (syncs with selectedStatus)
	let showInactive = $state(selectedStatus === 'inactive' || selectedStatus === '');

	function handleShowInactiveChange() {
		selectedStatus = showInactive ? 'inactive' : 'active';
		onSearch();
	}
</script>

<div class={layout === 'vertical' ? 'space-y-4' : 'flex items-end justify-between gap-3'}>
	<!-- Filters Group -->
	<div class={layout === 'vertical' ? 'grid grid-cols-1 gap-4 md:grid-cols-3' : 'flex items-end gap-3'}>
		<!-- Search Input -->
		<div class={layout === 'vertical' ? 'space-y-2' : 'w-96 space-y-2'}>
			<label for="search-filter" class="text-sm font-medium">Search</label>
			<MultiSearchInput
				bind:searchTerms
				options={employeeSearchOptions}
				onSearchChange={onSearch}
				debounceMs={500}
				allowCustomTerms={true}
			/>
		</div>

		<!-- Department Filter -->
		<div class={layout === 'vertical' ? 'space-y-2' : 'w-40 space-y-2'}>
			<label for="department-filter" class="text-sm font-medium">Department</label>
			<select
				id="department-filter"
				bind:value={selectedDepartment}
				onchange={onSearch}
				class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
				data-testid="employee-department-filter"
			>
				<option value="">All Departments</option>
				{#each departments as dept}
					<option value={dept.id}>{dept.name}</option>
				{/each}
			</select>
		</div>

		{#if layout === 'horizontal'}
			<!-- Role Filter (Horizontal only usually, or add to vertical if needed) -->
			<div class="w-36 space-y-2">
				<label for="role-filter" class="text-sm font-medium">Role</label>
				<select
					id="role-filter"
					bind:value={selectedRole}
					onchange={onSearch}
					class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
				>
					<option value="">All Roles</option>
					{#each uniqueRoles as roleName (roleName)}
						<option value={roleName}>{roleName}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter (Dropdown for Horizontal) -->
			{#if canViewInactiveEmployees}
				<div class="w-36 space-y-2">
					<label for="status-filter" class="text-sm font-medium">Status</label>
					<select
						id="status-filter"
						bind:value={selectedStatus}
						onchange={onSearch}
						class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
						data-testid="employee-status-filter"
					>
						<option value="active">Active Only</option>
						<option value="">All Employees</option>
						<option value="inactive">Inactive Only</option>
					</select>
				</div>
			{/if}
		{/if}

		{#if layout === 'vertical'}
			<!-- Page Size (Vertical) -->
			<div class="space-y-2">
				<label for="pagesize-filter" class="text-sm font-medium">Per Page</label>
				<select
					id="pagesize-filter"
					bind:value={pageSize}
					onchange={() => onPageSizeChange(pageSize)}
					class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
					<option value={100}>100</option>
				</select>
			</div>
		{/if}

		<!-- Clear Button -->
		<div class={layout === 'vertical' ? 'flex gap-2' : 'space-y-2'}>
			{#if layout === 'horizontal'}
				<div class="invisible text-sm font-medium">Clear</div>
			{/if}
			<Button type="button" variant="outline" size={layout === 'horizontal' ? 'sm' : 'default'} onclick={onClear}>Clear</Button>
		</div>
	</div>

	{#if layout === 'vertical' && canViewInactiveEmployees}
		<!-- Checkbox Status Filter (Vertical) -->
		<div class="flex items-center space-x-2 pt-2">
			<input
				type="checkbox"
				id="showInactive"
				bind:checked={showInactive}
				onchange={handleShowInactiveChange}
				class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
				data-testid="employee-status-filter"
			/>
			<label for="showInactive" class="cursor-pointer text-sm font-medium">
				Show Inactive Employees
			</label>
		</div>
	{/if}

	{#if layout === 'horizontal'}
		<!-- Right Controls (Horizontal) -->
		<div class="flex items-end gap-2">
			<!-- Per Page Dropdown -->
			<div class="space-y-2">
				<div class="invisible text-sm font-medium">Per Page</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button variant="outline" size="sm" {...props}>
								Per Page: {pageSize}
								<ChevronDown class="ml-2 h-4 w-4" />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-32">
						<DropdownMenu.Label>Rows per page</DropdownMenu.Label>
						<DropdownMenu.Separator />
						{#each [10, 20, 50, 100] as size (size)}
							<DropdownMenu.Item
								onclick={() => onPageSizeChange(size)}
								class={pageSize === size ? 'bg-accent' : ''}
							>
								{size}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			<!-- Column Visibility Dropdown -->
			{#if columnVisibility}
				<div class="space-y-2">
					<div class="invisible text-sm font-medium">Columns</div>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button variant="outline" size="sm" {...props}>
									<Settings2 class="mr-2 h-4 w-4" />
									Columns
									<ChevronDown class="ml-2 h-4 w-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-48">
							<DropdownMenu.Label>Toggle Columns</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.CheckboxItem
								checked={columnVisibility.displayName}
								onCheckedChange={(value) => {
									if (columnVisibility) columnVisibility = { ...columnVisibility, displayName: !!value };
								}}
							>
								Name
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={columnVisibility.email}
								onCheckedChange={(value) => {
									if (columnVisibility) columnVisibility = { ...columnVisibility, email: !!value };
								}}
							>
								Email
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={columnVisibility.departmentId}
								onCheckedChange={(value) => {
									if (columnVisibility) columnVisibility = { ...columnVisibility, departmentId: !!value };
								}}
							>
								Department
							</DropdownMenu.CheckboxItem>
							<DropdownMenu.CheckboxItem
								checked={columnVisibility.role}
								onCheckedChange={(value) => {
									if (columnVisibility) columnVisibility = { ...columnVisibility, role: !!value };
								}}
							>
								Role
							</DropdownMenu.CheckboxItem>
							{#if canViewInactiveEmployees}
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.hireDate}
									onCheckedChange={(value) => {
										if (columnVisibility) columnVisibility = { ...columnVisibility, hireDate: !!value };
									}}
								>
									Hire Date
								</DropdownMenu.CheckboxItem>
								<DropdownMenu.CheckboxItem
									checked={columnVisibility.isActive}
									onCheckedChange={(value) => {
										if (columnVisibility) columnVisibility = { ...columnVisibility, isActive: !!value };
									}}
								>
									Status
								</DropdownMenu.CheckboxItem>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</div>
	{/if}
</div>
