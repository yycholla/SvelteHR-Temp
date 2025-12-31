<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import {
		AlertCircle,
		CheckCircle2,
		Filter,
		ArrowRight,
		ArrowLeft,
		ArrowLeftRight,
		Users,
		Building2,
		Search,
		Zap,
		RefreshCw
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { TRIGGER_SELECTIVE_SYNC } from '$lib/graphql/operations/selective-sync';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';

	let { data } = $props();

	let employees = $derived(data.employees || []);
	let departments = $derived(data.departments || []);

	let syncDirection = $state('Pull');
	let forceFullSync = $state(false);
	let selectedEmployees = $state<Set<string>>(new Set());
	let selectedDepartments = $state<Set<string>>(new Set());
	let searchTerm = $state('');
	let departmentFilter = $state<string | null>(null);
	let showSyncedOnly = $state(false);
	let submitting = $state(false);
	let syncResult = $state<any>(null);
	let error = $state<string | null>(null);

	// Filter employees based on search and filters
	let filteredEmployees = $derived(
		employees.filter((emp: any) => {
			const matchesSearch = searchTerm === '' ||
				emp.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesSynced = !showSyncedOnly || emp.quickbooksId;
			return matchesSearch && matchesSynced;
		})
	);

	// Filter departments based on search
	let filteredDepartments = $derived(
		departments.filter((dept: any) => {
			const matchesSearch = searchTerm === '' ||
				dept.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesSynced = !showSyncedOnly || dept.quickbooksId;
			return matchesSearch && matchesSynced;
		})
	);

	// Sync directions
	const syncDirections = [
		{ value: 'Pull', label: 'Pull from QuickBooks', icon: ArrowLeft },
		{ value: 'Push', label: 'Push to QuickBooks', icon: ArrowRight },
		{ value: 'Bidirectional', label: 'Bidirectional Sync', icon: ArrowLeftRight }
	];

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
		selectedEmployees = new Set(filteredEmployees.map((e: any) => e.id));
	}

	function deselectAllEmployees() {
		selectedEmployees = new Set();
	}

	function selectAllDepartments() {
		selectedDepartments = new Set(filteredDepartments.map((d: any) => d.id));
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
		} catch (e: any) {
			error = e.message || 'An error occurred while triggering sync';
		} finally {
			submitting = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<Filter class="h-6 w-6" />
			<h1 class="text-2xl font-bold">Selective Sync</h1>
		</div>
		<p class="text-sm text-muted-foreground">
			Choose specific employees or departments to synchronize with QuickBooks
		</p>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if syncResult}
		<Alert class="mb-6">
			<CheckCircle2 class="h-4 w-4" />
			<AlertDescription>
				<p class="font-medium">{syncResult.message}</p>
				<p class="text-sm mt-1">
					Job ID: <code class="bg-muted px-1 rounded">{syncResult.jobId}</code>
				</p>
				<p class="text-sm">
					{syncResult.summary.totalEmployees} employees, {syncResult.summary.totalDepartments} departments
				</p>
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Configuration Panel -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Sync Configuration</CardTitle>
			<CardDescription>Configure how the selected entities will be synced</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<Label for="syncDirection">Sync Direction</Label>
					<Select
						type="single"
						value={syncDirection as any}
						onValueChange={(value: any) => {
							syncDirection = value;
						}}
					>
						<SelectTrigger id="syncDirection">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each syncDirections as direction}
								<SelectItem value={direction.value}>
									<div class="flex items-center gap-2">
										<direction.icon class="h-4 w-4" />
										{direction.label}
									</div>
								</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="flex items-center gap-2 mt-8">
					<Switch id="forceFullSync" bind:checked={forceFullSync} />
					<Label for="forceFullSync">Force full sync (ignore sync tokens)</Label>
				</div>
			</div>

			<!-- Selection Summary -->
			<div class="mt-6 pt-6 border-t">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-muted-foreground">Selected Employees</p>
						<p class="text-2xl font-bold">{selectedEmployees.size}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Selected Departments</p>
						<p class="text-2xl font-bold">{selectedDepartments.size}</p>
					</div>
				</div>

				<Button onclick={triggerSync} disabled={submitting || (selectedEmployees.size === 0 && selectedDepartments.size === 0)} class="w-full mt-4">
					{#if submitting}
						<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
						Triggering Sync...
					{:else}
						<Zap class="h-4 w-4 mr-2" />
						Trigger Selective Sync
					{/if}
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Search and Filters -->
	<Card class="mb-6">
		<CardContent class="pt-6">
			<div class="flex gap-4">
				<div class="flex-1">
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							bind:value={searchTerm}
							placeholder="Search employees or departments..."
							class="pl-10"
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="showSynced" bind:checked={showSyncedOnly} />
					<Label for="showSynced" class="text-sm">Synced only</Label>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Selection Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Employees Section -->
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Users class="h-5 w-5" />
						<CardTitle>Employees</CardTitle>
					</div>
					<div class="flex gap-2">
						<Button onclick={selectAllEmployees} variant="outline" size="sm">
							Select All
						</Button>
						<Button onclick={deselectAllEmployees} variant="outline" size="sm">
							Clear
						</Button>
					</div>
				</div>
				<CardDescription>
					{filteredEmployees.length} employees available
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-2 max-h-96 overflow-y-auto">
					{#if filteredEmployees.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Users class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No employees found</p>
							<p class="text-sm">Try adjusting your filters</p>
						</div>
					{:else}
						{#each filteredEmployees as employee}
							<button
								onclick={() => toggleEmployee(employee.id)}
								class="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors {selectedEmployees.has(
									employee.id
								)
									? 'bg-primary/10 border-primary'
									: ''}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Checkbox checked={selectedEmployees.has(employee.id)} />
											<p class="font-medium">{employee.name}</p>
											{#if employee.quickbooksId}
												<Badge variant="outline" class="text-xs">
													QB: {employee.quickbooksId.slice(0, 8)}
												</Badge>
											{/if}
											{#if employee.hasLocalChanges}
												<Badge variant="secondary" class="text-xs">Local changes</Badge>
											{/if}
										</div>
										{#if employee.lastSyncedAt}
											<p class="text-xs text-muted-foreground">
												Last synced: {formatDate(employee.lastSyncedAt)}
											</p>
										{:else}
											<p class="text-xs text-muted-foreground">Never synced</p>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Departments Section -->
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						<CardTitle>Departments</CardTitle>
					</div>
					<div class="flex gap-2">
						<Button onclick={selectAllDepartments} variant="outline" size="sm">
							Select All
						</Button>
						<Button onclick={deselectAllDepartments} variant="outline" size="sm">
							Clear
						</Button>
					</div>
				</div>
				<CardDescription>
					{filteredDepartments.length} departments available
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-2 max-h-96 overflow-y-auto">
					{#if filteredDepartments.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Building2 class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No departments found</p>
							<p class="text-sm">Try adjusting your filters</p>
						</div>
					{:else}
						{#each filteredDepartments as department}
							<button
								onclick={() => toggleDepartment(department.id)}
								class="w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors {selectedDepartments.has(
									department.id
								)
									? 'bg-primary/10 border-primary'
									: ''}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Checkbox checked={selectedDepartments.has(department.id)} />
											<p class="font-medium">{department.name}</p>
											{#if department.quickbooksId}
												<Badge variant="outline" class="text-xs">
													QB: {department.quickbooksId.slice(0, 8)}
												</Badge>
											{/if}
											{#if department.hasLocalChanges}
												<Badge variant="secondary" class="text-xs">Local changes</Badge>
											{/if}
										</div>
										{#if department.lastSyncedAt}
											<p class="text-xs text-muted-foreground">
												Last synced: {formatDate(department.lastSyncedAt)}
											</p>
										{:else}
											<p class="text-xs text-muted-foreground">Never synced</p>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>
</div>
