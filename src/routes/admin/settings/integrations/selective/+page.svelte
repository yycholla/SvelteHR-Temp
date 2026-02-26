<script lang="ts">
	import {
		ArrowLeftRight,
		Building2,
		CheckCircle2,
		RefreshCw,
		Search,
		Users,
		Zap
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { TRIGGER_SELECTIVE_SYNC } from '$lib/graphql/operations/selective-sync';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';

	type SyncDirection = 'Pull' | 'Push' | 'Bidirectional';

	interface SelectiveSyncEmployee {
		id: string;
		name: string;
		quickbooksId: string | null;
		hasLocalChanges?: boolean;
		lastSyncedAt: string | null;
	}

	interface SelectiveSyncDepartment {
		id: string;
		name: string;
		quickbooksId: string | null;
		hasLocalChanges?: boolean;
		lastSyncedAt: string | null;
	}

	interface SelectiveSyncResult {
		message: string;
		jobId: string;
		summary: {
			totalEmployees: number;
			totalDepartments: number;
		};
	}

	interface SelectiveSyncPageData {
		employees?: SelectiveSyncEmployee[];
		departments?: SelectiveSyncDepartment[];
		error?: string;
	}

	let { data }: { data: SelectiveSyncPageData } = $props();

	let employees = $derived(data.employees || []);
	let departments = $derived(data.departments || []);

	let syncDirection = $state<SyncDirection>('Pull');
	let forceFullSync = $state(false);
	let selectedEmployees = $state<Set<string>>(new Set());
	let selectedDepartments = $state<Set<string>>(new Set());
	let searchTerm = $state('');
	let showSyncedOnly = $state(false);
	let submitting = $state(false);
	let syncResult = $state<SelectiveSyncResult | null>(null);
	let error = $state<string | null>(null);

	function getErrorMessage(errorValue: unknown): string {
		if (errorValue instanceof Error) return errorValue.message;
		return 'An error occurred while triggering sync';
	}

	// Filter employees based on search and filters
	let filteredEmployees = $derived(
		employees.filter((emp) => {
			const matchesSearch =
				searchTerm === '' || emp.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesSynced = !showSyncedOnly || emp.quickbooksId;
			return matchesSearch && matchesSynced;
		})
	);

	// Filter departments based on search
	let filteredDepartments = $derived(
		departments.filter((dept) => {
			const matchesSearch =
				searchTerm === '' || dept.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesSynced = !showSyncedOnly || dept.quickbooksId;
			return matchesSearch && matchesSynced;
		})
	);

	function toggleEmployee(id: string) {
		if (selectedEmployees.has(id)) {
			selectedEmployees.delete(id);
			selectedEmployees = new Set(selectedEmployees);
		} else {
			selectedEmployees.add(id);
			selectedEmployees = new Set(selectedEmployees);
		}
	}

	function toggleDepartment(id: string) {
		if (selectedDepartments.has(id)) {
			selectedDepartments.delete(id);
			selectedDepartments = new Set(selectedDepartments);
		} else {
			selectedDepartments.add(id);
			selectedDepartments = new Set(selectedDepartments);
		}
	}

	function selectAllEmployees() {
		selectedEmployees = new Set(filteredEmployees.map((employee) => employee.id));
	}

	function deselectAllEmployees() {
		selectedEmployees = new Set();
	}

	function selectAllDepartments() {
		selectedDepartments = new Set(filteredDepartments.map((department) => department.id));
	}

	function deselectAllDepartments() {
		selectedDepartments = new Set();
	}

	async function triggerSync() {
		if (!browser) return;

		const employeeIds = Array.from(selectedEmployees);
		const departmentIds = Array.from(selectedDepartments);

		if (employeeIds.length === 0 && departmentIds.length === 0) {
			error = 'Please select at least one employee or department to sync';
			return;
		}

		submitting = true;
		error = null;
		syncResult = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(TRIGGER_SELECTIVE_SYNC, {
					input: {
						sync_direction: syncDirection,
						employee_ids: employeeIds.length > 0 ? employeeIds : null,
						department_ids: departmentIds.length > 0 ? departmentIds : null,
						force_full_sync: forceFullSync
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				syncResult = result.data?.selective_sync?.trigger_selective_sync;
				// Clear selections after successful trigger
				selectedEmployees = new Set();
				selectedDepartments = new Set();
				// Refresh data
				await invalidate('app:selective-sync');
			}
		} catch (e: unknown) {
			error = getErrorMessage(e);
		} finally {
			submitting = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}

	function getSyncedColor(hasQbId: boolean): string {
		return hasQbId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight">Selective Sync</h1>
			<div class="h-4 w-px bg-border"></div>

			<!-- Search -->
			<div class="relative w-64">
				<Search
					class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search entities..."
					class="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none transition-colors"
				/>
			</div>

			<!-- Synced Only Filter -->
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={showSyncedOnly}
					class="h-3.5 w-3.5 rounded border-input"
				/>
				<span class="text-xs text-muted-foreground">Synced only</span>
			</label>
		</div>
	</header>

	<!-- Error message -->
	{#if data.error || error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div
				class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20"
			>
				{data.error || error}
			</div>
		</div>
	{/if}

	<!-- Success message -->
	{#if syncResult}
		<div class="flex-shrink-0 p-4 pb-0">
			<div
				class="rounded-md bg-green-50 p-3 text-sm text-green-700 font-medium border border-green-200"
			>
				<div class="flex items-start gap-2">
					<CheckCircle2 class="h-4 w-4 mt-0.5" />
					<div>
						<p class="font-semibold">{syncResult.message}</p>
						<p class="text-xs mt-1">
							Job ID: <code class="bg-white px-1 rounded">{syncResult.jobId}</code>
						</p>
						<p class="text-xs">
							{syncResult.summary.totalEmployees} employees, {syncResult.summary.totalDepartments} departments
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- KPI Grid -->
	<div class="flex-shrink-0 p-4">
		<div class="grid grid-cols-4 gap-3">
			<!-- Selected Employees -->
			<div class="bg-muted/30 border rounded-sm p-3 h-32 flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-1.5 text-muted-foreground mb-1">
						<Users class="h-3.5 w-3.5" />
						<span class="text-[10px] uppercase tracking-wider font-semibold"
							>Selected Employees</span
						>
					</div>
					<div class="text-2xl font-bold tabular-nums">{selectedEmployees.size}</div>
				</div>
				<div class="flex gap-1">
					<button
						onclick={selectAllEmployees}
						class="flex-1 h-6 px-2 rounded-sm border border-input bg-background text-[10px] hover:bg-accent transition-colors"
					>
						Select All
					</button>
					<button
						onclick={deselectAllEmployees}
						class="flex-1 h-6 px-2 rounded-sm border border-input bg-background text-[10px] hover:bg-accent transition-colors"
					>
						Clear
					</button>
				</div>
			</div>

			<!-- Selected Departments -->
			<div class="bg-muted/30 border rounded-sm p-3 h-32 flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-1.5 text-muted-foreground mb-1">
						<Building2 class="h-3.5 w-3.5" />
						<span class="text-[10px] uppercase tracking-wider font-semibold"
							>Selected Departments</span
						>
					</div>
					<div class="text-2xl font-bold tabular-nums">{selectedDepartments.size}</div>
				</div>
				<div class="flex gap-1">
					<button
						onclick={selectAllDepartments}
						class="flex-1 h-6 px-2 rounded-sm border border-input bg-background text-[10px] hover:bg-accent transition-colors"
					>
						Select All
					</button>
					<button
						onclick={deselectAllDepartments}
						class="flex-1 h-6 px-2 rounded-sm border border-input bg-background text-[10px] hover:bg-accent transition-colors"
					>
						Clear
					</button>
				</div>
			</div>

			<!-- Sync Direction -->
			<div class="bg-muted/30 border rounded-sm p-3 h-32 flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-1.5 text-muted-foreground mb-1">
						<ArrowLeftRight class="h-3.5 w-3.5" />
						<span class="text-[10px] uppercase tracking-wider font-semibold">Sync Direction</span>
					</div>
					<select
						bind:value={syncDirection}
						class="w-full h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none mt-2"
					>
						<option value="Pull"> ← Pull from QB </option>
						<option value="Push"> → Push to QB </option>
						<option value="Bidirectional"> ↔ Bidirectional </option>
					</select>
				</div>
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={forceFullSync}
						class="h-3 w-3 rounded border-input"
					/>
					<span class="text-[10px] text-muted-foreground">Force full sync</span>
				</label>
			</div>

			<!-- Trigger Sync -->
			<div class="bg-muted/30 border rounded-sm p-3 h-32 flex flex-col justify-between">
				<div>
					<div class="flex items-center gap-1.5 text-muted-foreground mb-1">
						<Zap class="h-3.5 w-3.5" />
						<span class="text-[10px] uppercase tracking-wider font-semibold">Execute</span>
					</div>
					<div class="text-xs text-muted-foreground mt-2">
						{selectedEmployees.size + selectedDepartments.size} entities selected
					</div>
				</div>
				<button
					onclick={triggerSync}
					disabled={submitting || (selectedEmployees.size === 0 && selectedDepartments.size === 0)}
					class="w-full h-8 px-3 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if submitting}
						<RefreshCw class="h-3.5 w-3.5 mr-1 animate-spin inline" />
						Triggering...
					{:else}
						<Zap class="h-3.5 w-3.5 mr-1 inline" />
						Trigger Sync
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Tables Container -->
	<div class="flex-1 overflow-auto min-h-0 relative bg-background">
		<div class="grid grid-cols-2 gap-4 p-4">
			<!-- Employees Table -->
			<div class="border rounded-sm overflow-hidden">
				<div class="bg-muted/40 px-3 py-2 border-b">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Users class="h-4 w-4" />
							<span class="text-xs font-semibold">Employees</span>
						</div>
						<span class="text-[10px] text-muted-foreground"
							>{filteredEmployees.length} available</span
						>
					</div>
				</div>
				<div class="max-h-[600px] overflow-y-auto">
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground w-8"
								>
									<input
										type="checkbox"
										checked={selectedEmployees.size === filteredEmployees.length &&
											filteredEmployees.length > 0}
										onchange={(e) => {
											if ((e.target as HTMLInputElement).checked) {
												selectAllEmployees();
											} else {
												deselectAllEmployees();
											}
										}}
										class="h-3 w-3 rounded border-input"
									/>
								</th>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Name</th
								>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Status</th
								>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Last Sync</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#if filteredEmployees.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-12 text-center text-muted-foreground text-xs">
										No employees found
									</td>
								</tr>
							{:else}
								{#each filteredEmployees as employee}
									<tr
										class="hover:bg-muted/30 cursor-pointer transition-colors group"
										onclick={() => toggleEmployee(employee.id)}
									>
										<td class="px-2 py-1.5 border-r">
											<input
												type="checkbox"
												checked={selectedEmployees.has(employee.id)}
												class="h-3 w-3 rounded border-input"
											/>
										</td>
										<td class="px-2 py-1.5 border-r">
											<div class="text-xs font-medium truncate">{employee.name}</div>
											{#if employee.quickbooksId}
												<div class="text-[10px] text-muted-foreground font-mono truncate">
													QB: {employee.quickbooksId.slice(0, 8)}
												</div>
											{/if}
										</td>
										<td class="px-2 py-1.5 border-r">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getSyncedColor(
													!!employee.quickbooksId
												)}"
											>
												{employee.quickbooksId ? 'Synced' : 'Not Synced'}
											</span>
											{#if employee.hasLocalChanges}
												<span
													class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 ml-1"
												>
													Modified
												</span>
											{/if}
										</td>
										<td class="px-2 py-1.5 text-[10px] text-muted-foreground">
											{formatDate(employee.lastSyncedAt)}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Departments Table -->
			<div class="border rounded-sm overflow-hidden">
				<div class="bg-muted/40 px-3 py-2 border-b">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Building2 class="h-4 w-4" />
							<span class="text-xs font-semibold">Departments</span>
						</div>
						<span class="text-[10px] text-muted-foreground"
							>{filteredDepartments.length} available</span
						>
					</div>
				</div>
				<div class="max-h-[600px] overflow-y-auto">
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground w-8"
								>
									<input
										type="checkbox"
										checked={selectedDepartments.size === filteredDepartments.length &&
											filteredDepartments.length > 0}
										onchange={(e) => {
											if ((e.target as HTMLInputElement).checked) {
												selectAllDepartments();
											} else {
												deselectAllDepartments();
											}
										}}
										class="h-3 w-3 rounded border-input"
									/>
								</th>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Name</th
								>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Status</th
								>
								<th
									class="px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
									>Last Sync</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#if filteredDepartments.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-12 text-center text-muted-foreground text-xs">
										No departments found
									</td>
								</tr>
							{:else}
								{#each filteredDepartments as department}
									<tr
										class="hover:bg-muted/30 cursor-pointer transition-colors group"
										onclick={() => toggleDepartment(department.id)}
									>
										<td class="px-2 py-1.5 border-r">
											<input
												type="checkbox"
												checked={selectedDepartments.has(department.id)}
												class="h-3 w-3 rounded border-input"
											/>
										</td>
										<td class="px-2 py-1.5 border-r">
											<div class="text-xs font-medium truncate">{department.name}</div>
											{#if department.quickbooksId}
												<div class="text-[10px] text-muted-foreground font-mono truncate">
													QB: {department.quickbooksId.slice(0, 8)}
												</div>
											{/if}
										</td>
										<td class="px-2 py-1.5 border-r">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getSyncedColor(
													!!department.quickbooksId
												)}"
											>
												{department.quickbooksId ? 'Synced' : 'Not Synced'}
											</span>
											{#if department.hasLocalChanges}
												<span
													class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 ml-1"
												>
													Modified
												</span>
											{/if}
										</td>
										<td class="px-2 py-1.5 text-[10px] text-muted-foreground">
											{formatDate(department.lastSyncedAt)}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
