<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		AlertCircle,
		CheckCircle2,
		Pencil,
		Trash2,
		Plus,
		ArrowRight,
		ArrowLeft,
		ArrowLeftRight,
		Sparkles,
		Database,
		Activity,
		TrendingUp
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		GET_AVAILABLE_FIELDS,
		CREATE_FIELD_MAPPING,
		UPDATE_FIELD_MAPPING,
		DELETE_FIELD_MAPPING
	} from '$lib/graphql/operations/field-mapping';
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';

	let { data } = $props();

	let mappings = $derived(data.mappings || []);
	let total = $derived(data.total || 0);

	// Dialog states
	let createDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let availableFieldsDialogOpen = $state(false);

	// Form states
	let selectedEntityType = $state('Employee');
	let selectedLocalField = $state('');
	let selectedQuickbooksField = $state('');
	let selectedDirection = $state('Bidirectional');
	let transformation = $state('');
	let isActive = $state(true);
	let editingMappingId = $state<string | null>(null);
	let deletingMappingId = $state<string | null>(null);

	// Available fields
	let availableLocalFields = $state<any[]>([]);
	let availableQuickbooksFields = $state<any[]>([]);
	let loadingFields = $state(false);

	// UI states
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// Entity type filter
	let entityTypeFilter = $state<string | null>(null);

	const entityTypes = [
		{ value: 'Employee', label: 'Employee' },
		{ value: 'Department', label: 'Department' }
	];

	const directions = [
		{ value: 'Pull', label: 'Pull from QuickBooks', icon: ArrowLeft },
		{ value: 'Push', label: 'Push to QuickBooks', icon: ArrowRight },
		{ value: 'Bidirectional', label: 'Bidirectional Sync', icon: ArrowLeftRight }
	];

	// Filter mappings by entity type
	let filteredMappings = $derived(
		entityTypeFilter ? mappings.filter((m: any) => m.entityType === entityTypeFilter) : mappings
	);

	// Calculated KPIs
	let activeMappings = $derived(filteredMappings.filter((m: any) => m.isActive).length);
	let inactiveMappings = $derived(filteredMappings.filter((m: any) => !m.isActive).length);
	let bidirectionalCount = $derived(
		filteredMappings.filter((m: any) => m.direction === 'Bidirectional').length
	);

	async function loadAvailableFields(entityType: string) {
		if (!browser) return;

		loadingFields = true;
		try {
			const client = createUrqlClient(fetch);
			const result = await client.query(GET_AVAILABLE_FIELDS, { entityType }).toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				const data = result.data?.field_mapping?.get_available_fields;
				availableLocalFields = data?.localFields || [];
				availableQuickbooksFields = data?.quickbooksFields || [];
			}
		} catch (e: any) {
			error = e.message || 'Failed to load available fields';
		} finally {
			loadingFields = false;
		}
	}

	function openCreateDialog() {
		resetForm();
		createDialogOpen = true;
		loadAvailableFields(selectedEntityType);
	}

	function openEditDialog(mapping: any) {
		editingMappingId = mapping.id;
		selectedEntityType = mapping.entityType;
		selectedLocalField = mapping.localField;
		selectedQuickbooksField = mapping.quickbooksField;
		selectedDirection = mapping.direction;
		transformation = mapping.transformation || '';
		isActive = mapping.isActive;
		editDialogOpen = true;
		loadAvailableFields(mapping.entityType);
	}

	function openDeleteDialog(mappingId: string) {
		deletingMappingId = mappingId;
		deleteDialogOpen = true;
	}

	function resetForm() {
		selectedEntityType = 'Employee';
		selectedLocalField = '';
		selectedQuickbooksField = '';
		selectedDirection = 'Bidirectional';
		transformation = '';
		isActive = true;
		editingMappingId = null;
		availableLocalFields = [];
		availableQuickbooksFields = [];
	}

	async function createMapping() {
		if (!browser) return;
		if (!selectedLocalField || !selectedQuickbooksField) {
			error = 'Please select both local and QuickBooks fields';
			return;
		}

		submitting = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(CREATE_FIELD_MAPPING, {
					input: {
						entity_type: selectedEntityType,
						local_field: selectedLocalField,
						quickbooks_field: selectedQuickbooksField,
						direction: selectedDirection,
						transformation: transformation || null,
						is_active: isActive
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.field_mapping?.create_field_mapping?.message ||
					'Mapping created successfully';
				createDialogOpen = false;
				resetForm();
				await invalidate('app:field-mappings');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while creating mapping';
		} finally {
			submitting = false;
		}
	}

	async function updateMapping() {
		if (!browser || !editingMappingId) return;

		submitting = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(UPDATE_FIELD_MAPPING, {
					input: {
						mapping_id: editingMappingId,
						quickbooks_field: selectedQuickbooksField,
						direction: selectedDirection,
						transformation: transformation || null,
						is_active: isActive
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.field_mapping?.update_field_mapping?.message ||
					'Mapping updated successfully';
				editDialogOpen = false;
				resetForm();
				await invalidate('app:field-mappings');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while updating mapping';
		} finally {
			submitting = false;
		}
	}

	async function deleteMapping() {
		if (!browser || !deletingMappingId) return;

		submitting = true;
		error = null;
		success = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(DELETE_FIELD_MAPPING, {
					mappingId: deletingMappingId
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				success =
					result.data?.field_mapping?.delete_field_mapping?.message ||
					'Mapping deleted successfully';
				deleteDialogOpen = false;
				deletingMappingId = null;
				await invalidate('app:field-mappings');
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while deleting mapping';
		} finally {
			submitting = false;
		}
	}

	function getDirectionIcon(direction: string) {
		switch (direction) {
			case 'Pull':
				return ArrowLeft;
			case 'Push':
				return ArrowRight;
			case 'Bidirectional':
				return ArrowLeftRight;
			default:
				return ArrowLeftRight;
		}
	}

	function getDirectionBadgeVariant(direction: string) {
		switch (direction) {
			case 'Pull':
				return 'secondary' as const;
			case 'Push':
				return 'default' as const;
			case 'Bidirectional':
				return 'outline' as const;
			default:
				return 'outline' as const;
		}
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-3">
				<Sparkles class="h-6 w-6" />
				<h1 class="text-2xl font-bold">Field Mapping Configuration</h1>
			</div>
			<Button onclick={openCreateDialog}>
				<Plus class="h-4 w-4 mr-2" />
				Create Mapping
			</Button>
		</div>
		<p class="text-sm text-muted-foreground">
			Configure how fields are mapped between your local system and QuickBooks
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

	{#if success}
		<Alert class="mb-6">
			<CheckCircle2 class="h-4 w-4" />
			<AlertDescription>{success}</AlertDescription>
		</Alert>
	{/if}

	<!-- KPI Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="border rounded-lg p-4 h-32 flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Database class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm font-medium text-muted-foreground">Total Mappings</span>
				</div>
			</div>
			<div class="flex items-end justify-between">
				<div class="text-3xl font-bold">{filteredMappings.length}</div>
				<div class="text-xs text-muted-foreground">of {total} total</div>
			</div>
		</div>

		<div class="border rounded-lg p-4 h-32 flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Activity class="h-4 w-4 text-green-600" />
					<span class="text-sm font-medium text-muted-foreground">Active Mappings</span>
				</div>
			</div>
			<div class="flex items-end justify-between">
				<div class="text-3xl font-bold text-green-600">{activeMappings}</div>
				<div class="text-xs text-muted-foreground">{inactiveMappings} inactive</div>
			</div>
		</div>

		<div class="border rounded-lg p-4 h-32 flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<TrendingUp class="h-4 w-4 text-blue-600" />
					<span class="text-sm font-medium text-muted-foreground">Bidirectional Sync</span>
				</div>
			</div>
			<div class="flex items-end justify-between">
				<div class="text-3xl font-bold text-blue-600">{bidirectionalCount}</div>
				<div class="text-xs text-muted-foreground">two-way sync</div>
			</div>
		</div>
	</div>

	<!-- Toolbar -->
	<div class="h-14 px-4 border-b flex items-center justify-between bg-background mb-6">
		<div class="flex items-center gap-4">
			<Label for="entityFilter" class="text-sm font-medium">Filter:</Label>
			<Select
				type="single"
				value={entityTypeFilter as any}
				onValueChange={(value: any) => {
					entityTypeFilter = value === 'All' ? null : value;
				}}
			>
				<SelectTrigger id="entityFilter" class="w-48">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="All">All Entity Types</SelectItem>
					{#each entityTypes as type}
						<SelectItem value={type.value}>{type.label}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
		<div class="text-sm text-muted-foreground">
			{filteredMappings.length} of {total} mappings
		</div>
	</div>

	<!-- Mappings Table -->
	{#if filteredMappings.length === 0}
		<div class="text-center py-12 text-muted-foreground border rounded-lg">
			<Sparkles class="h-12 w-12 mx-auto mb-3" />
			<p class="font-medium">No field mappings found</p>
			<p class="text-sm">Create a mapping to get started</p>
			<Button onclick={openCreateDialog} variant="outline" class="mt-4">
				<Plus class="h-4 w-4 mr-2" />
				Create First Mapping
			</Button>
		</div>
	{:else}
		<div class="border rounded-lg overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-muted/40 backdrop-blur-sm sticky top-0 z-10">
						<tr>
							<th class="text-left px-4 py-3 text-sm font-medium">Entity Type</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Local Field</th>
							<th class="text-left px-4 py-3 text-sm font-medium">QuickBooks Field</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Direction</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Transformation</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Status</th>
							<th class="text-right px-4 py-3 text-sm font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMappings as mapping}
							<tr class="border-t hover:bg-muted/30 transition-colors">
								<td class="px-4 py-3">
									<Badge variant="outline">{mapping.entityType}</Badge>
								</td>
								<td class="px-4 py-3 font-mono text-sm">{mapping.localField}</td>
								<td class="px-4 py-3 font-mono text-sm">{mapping.quickbooksField}</td>
								{#each [getDirectionIcon(mapping.direction)] as DirectionIcon}
									<td class="px-4 py-3">
										<Badge variant={getDirectionBadgeVariant(mapping.direction)}>
											<DirectionIcon class="h-3 w-3 mr-1" />
											{mapping.direction}
										</Badge>
									</td>
								{/each}
								<td class="px-4 py-3">
									{#if mapping.transformation}
										<code class="bg-muted px-2 py-1 rounded text-xs">
											{mapping.transformation.slice(0, 30)}{mapping.transformation.length > 30
												? '...'
												: ''}
										</code>
									{:else}
										<span class="text-muted-foreground text-sm">None</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if mapping.isActive}
										<Badge variant="default">Active</Badge>
									{:else}
										<Badge variant="secondary">Inactive</Badge>
									{/if}
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex gap-2 justify-end">
										<Button onclick={() => openEditDialog(mapping)} variant="ghost" size="sm">
											<Pencil class="h-4 w-4" />
										</Button>
										<Button onclick={() => openDeleteDialog(mapping.id)} variant="ghost" size="sm">
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Create Dialog -->
<Dialog bind:open={createDialogOpen}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Create Field Mapping</DialogTitle>
			<DialogDescription>Define how a local field maps to a QuickBooks field</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label for="create-entity-type">Entity Type</Label>
				<Select
					type="single"
					value={selectedEntityType as any}
					onValueChange={(value: any) => {
						selectedEntityType = value;
						selectedLocalField = '';
						selectedQuickbooksField = '';
						loadAvailableFields(value);
					}}
				>
					<SelectTrigger id="create-entity-type">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each entityTypes as type}
							<SelectItem value={type.value}>{type.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="create-local-field">Local Field</Label>
					<Select
						type="single"
						value={selectedLocalField as any}
						onValueChange={(value: any) => {
							selectedLocalField = value;
						}}
					>
						<SelectTrigger id="create-local-field">
							<SelectValue placeholder="Select local field" />
						</SelectTrigger>
						<SelectContent>
							{#each availableLocalFields as field}
								<SelectItem value={field.fieldName}>
									<div class="flex flex-col gap-1">
										<span class="font-mono">{field.fieldName}</span>
										<span class="text-xs text-muted-foreground">{field.description}</span>
									</div>
								</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label for="create-qb-field">QuickBooks Field</Label>
					<Select
						type="single"
						value={selectedQuickbooksField as any}
						onValueChange={(value: any) => {
							selectedQuickbooksField = value;
						}}
					>
						<SelectTrigger id="create-qb-field">
							<SelectValue placeholder="Select QuickBooks field" />
						</SelectTrigger>
						<SelectContent>
							{#each availableQuickbooksFields as field}
								<SelectItem value={field.fieldName}>
									<div class="flex flex-col gap-1">
										<span class="font-mono">{field.fieldName}</span>
										<span class="text-xs text-muted-foreground">{field.description}</span>
									</div>
								</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<Label for="create-direction">Sync Direction</Label>
				<Select
					type="single"
					value={selectedDirection as any}
					onValueChange={(value: any) => {
						selectedDirection = value;
					}}
				>
					<SelectTrigger id="create-direction">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each directions as direction}
							{@const Icon = direction.icon}
							<SelectItem value={direction.value}>
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4" />
									{direction.label}
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label for="create-transformation">Transformation Rule (Optional)</Label>
				<Input
					id="create-transformation"
					bind:value={transformation}
					placeholder="e.g., uppercase, trim, date_format"
				/>
				<p class="text-xs text-muted-foreground mt-1">
					Optional transformation to apply when syncing this field
				</p>
			</div>

			<div class="flex items-center gap-2">
				<Switch id="create-active" bind:checked={isActive} />
				<Label for="create-active">Enable this mapping</Label>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					createDialogOpen = false;
					resetForm();
				}}
			>
				Cancel
			</Button>
			<Button
				onclick={createMapping}
				disabled={submitting || !selectedLocalField || !selectedQuickbooksField}
			>
				{submitting ? 'Creating...' : 'Create Mapping'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Edit Dialog -->
<Dialog bind:open={editDialogOpen}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Edit Field Mapping</DialogTitle>
			<DialogDescription>Update field mapping configuration</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			<div>
				<Label>Entity Type</Label>
				<div class="px-3 py-2 bg-muted rounded-md">
					<Badge variant="outline">{selectedEntityType}</Badge>
				</div>
			</div>

			<div>
				<Label>Local Field</Label>
				<div class="px-3 py-2 bg-muted rounded-md font-mono text-sm">
					{selectedLocalField}
				</div>
			</div>

			<div>
				<Label for="edit-qb-field">QuickBooks Field</Label>
				<Select
					type="single"
					value={selectedQuickbooksField as any}
					onValueChange={(value: any) => {
						selectedQuickbooksField = value;
					}}
				>
					<SelectTrigger id="edit-qb-field">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each availableQuickbooksFields as field}
							<SelectItem value={field.fieldName}>
								<div class="flex flex-col gap-1">
									<span class="font-mono">{field.fieldName}</span>
									<span class="text-xs text-muted-foreground">{field.description}</span>
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label for="edit-direction">Sync Direction</Label>
				<Select
					type="single"
					value={selectedDirection as any}
					onValueChange={(value: any) => {
						selectedDirection = value;
					}}
				>
					<SelectTrigger id="edit-direction">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{#each directions as direction}
							{@const Icon = direction.icon}
							<SelectItem value={direction.value}>
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4" />
									{direction.label}
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label for="edit-transformation">Transformation Rule (Optional)</Label>
				<Input
					id="edit-transformation"
					bind:value={transformation}
					placeholder="e.g., uppercase, trim, date_format"
				/>
			</div>

			<div class="flex items-center gap-2">
				<Switch id="edit-active" bind:checked={isActive} />
				<Label for="edit-active">Enable this mapping</Label>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					editDialogOpen = false;
					resetForm();
				}}
			>
				Cancel
			</Button>
			<Button onclick={updateMapping} disabled={submitting}>
				{submitting ? 'Updating...' : 'Update Mapping'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Delete Confirmation Dialog -->
<Dialog bind:open={deleteDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete Field Mapping</DialogTitle>
			<DialogDescription>
				Are you sure you want to delete this field mapping? This action cannot be undone.
			</DialogDescription>
		</DialogHeader>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => {
					deleteDialogOpen = false;
					deletingMappingId = null;
				}}
			>
				Cancel
			</Button>
			<Button variant="destructive" onclick={deleteMapping} disabled={submitting}>
				{submitting ? 'Deleting...' : 'Delete'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
