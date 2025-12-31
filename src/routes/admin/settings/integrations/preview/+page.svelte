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
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		AlertCircle,
		CheckCircle2,
		Eye,
		ArrowRight,
		ArrowLeft,
		ArrowLeftRight,
		Plus,
		Edit,
		Trash2,
		Clock,
		AlertTriangle,
		FileWarning,
		Info
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { PREVIEW_SYNC } from '$lib/graphql/operations/sync-preview';
	import { browser } from '$app/environment';

	let { data } = $props();

	let entityType = $state('Employee');
	let syncDirection = $state('Pull');
	let includeFieldChanges = $state(true);
	let loading = $state(false);
	let previewData = $state<any>(null);
	let error = $state<string | null>(null);
	let selectedTab = $state<'creates' | 'updates' | 'deletes'>('updates');
	let expandedChanges = $state<Set<string>>(new Set());

	// Entity types
	const entityTypes = [
		{ value: 'Employee', label: 'Employees' },
		{ value: 'Department', label: 'Departments' },
		{ value: 'Both', label: 'Both' }
	];

	// Sync directions
	const syncDirections = [
		{ value: 'Pull', label: 'Pull from QuickBooks', icon: ArrowLeft },
		{ value: 'Push', label: 'Push to QuickBooks', icon: ArrowRight },
		{ value: 'Bidirectional', label: 'Bidirectional Sync', icon: ArrowLeftRight }
	];

	async function runPreview() {
		if (!browser) return;

		loading = true;
		error = null;
		previewData = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(PREVIEW_SYNC, {
					input: {
						entity_type: entityType,
						sync_direction: syncDirection,
						entity_ids: null,
						include_field_changes: includeFieldChanges
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				previewData = result.data?.sync_preview?.preview_sync;
				// Auto-select the tab with the most changes
				if (previewData) {
					if (previewData.updates.length > 0) {
						selectedTab = 'updates';
					} else if (previewData.creates.length > 0) {
						selectedTab = 'creates';
					} else if (previewData.deletes.length > 0) {
						selectedTab = 'deletes';
					}
				}
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while generating preview';
		} finally {
			loading = false;
		}
	}

	function toggleExpanded(id: string) {
		if (expandedChanges.has(id)) {
			expandedChanges.delete(id);
			expandedChanges = new Set(expandedChanges);
		} else {
			expandedChanges.add(id);
			expandedChanges = new Set(expandedChanges);
		}
	}

	function getChangeIcon(changeType: string) {
		switch (changeType) {
			case 'create':
				return Plus;
			case 'update':
				return Edit;
			case 'delete':
				return Trash2;
			default:
				return Info;
		}
	}

	function getChangeColor(changeType: string) {
		switch (changeType) {
			case 'create':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'update':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'delete':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function formatDuration(seconds: number | null): string {
		if (!seconds) return 'Unknown';
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<Eye class="h-6 w-6" />
			<h1 class="text-2xl font-bold">Sync Preview / Dry Run</h1>
		</div>
		<p class="text-sm text-muted-foreground">
			Preview synchronization changes before executing them
		</p>
	</div>

	<!-- Configuration Panel -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Preview Configuration</CardTitle>
			<CardDescription>
				Configure what you want to preview without making any actual changes
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<Label for="entityType">Entity Type</Label>
					<Select
						type="single"
						value={entityType as any}
						onValueChange={(value: any) => {
							entityType = value;
						}}
					>
						<SelectTrigger id="entityType">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

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
			</div>

			<div class="mt-4 flex items-center gap-2">
				<Switch id="includeFields" bind:checked={includeFieldChanges} />
				<Label for="includeFields">Include field-level changes (detailed view)</Label>
			</div>

			<div class="mt-6">
				<Button onclick={runPreview} disabled={loading} class="w-full md:w-auto">
					{#if loading}
						<Clock class="h-4 w-4 mr-2 animate-spin" />
						Generating Preview...
					{:else}
						<Eye class="h-4 w-4 mr-2" />
						Run Preview
					{/if}
				</Button>
			</div>
		</CardContent>
	</Card>

	{#if error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if previewData}
		<!-- Summary Statistics -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Changes</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{previewData.totalChanges}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Creates</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<Plus class="h-8 w-8 text-green-500" />
						<p class="text-3xl font-bold">{previewData.summary.totalCreates}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Updates</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<Edit class="h-8 w-8 text-blue-500" />
						<p class="text-3xl font-bold">{previewData.summary.totalUpdates}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Deletes</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<Trash2 class="h-8 w-8 text-red-500" />
						<p class="text-3xl font-bold">{previewData.summary.totalDeletes}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Conflicts</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-2">
						<AlertTriangle class="h-8 w-8 text-orange-500" />
						<p class="text-3xl font-bold">{previewData.summary.totalConflicts}</p>
					</div>
				</CardContent>
			</Card>
		</div>

		{#if previewData.summary.totalWarnings > 0}
			<Alert class="mb-6">
				<FileWarning class="h-4 w-4" />
				<AlertDescription>
					{previewData.summary.totalWarnings} warning{previewData.summary.totalWarnings > 1 ? 's' : ''} detected.
					Please review changes carefully before proceeding.
				</AlertDescription>
			</Alert>
		{/if}

		<!-- Estimated Duration -->
		{#if previewData.summary.estimatedDurationSeconds}
			<div class="mb-6 text-sm text-muted-foreground flex items-center gap-2">
				<Clock class="h-4 w-4" />
				Estimated sync duration: {formatDuration(previewData.summary.estimatedDurationSeconds)}
			</div>
		{/if}

		<!-- Changes Detail -->
		<Card>
			<CardHeader>
				<CardTitle>Change Details</CardTitle>
				<CardDescription>Review all changes that will be made during synchronization</CardDescription>
			</CardHeader>
			<CardContent>
				<!-- Tabs -->
				<div class="flex gap-2 mb-4 border-b">
					<button
						onclick={() => { selectedTab = 'creates'; }}
						class="px-4 py-2 font-medium transition-colors {selectedTab === 'creates'
							? 'border-b-2 border-primary text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Creates ({previewData.creates.length})
					</button>
					<button
						onclick={() => { selectedTab = 'updates'; }}
						class="px-4 py-2 font-medium transition-colors {selectedTab === 'updates'
							? 'border-b-2 border-primary text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Updates ({previewData.updates.length})
					</button>
					<button
						onclick={() => { selectedTab = 'deletes'; }}
						class="px-4 py-2 font-medium transition-colors {selectedTab === 'deletes'
							? 'border-b-2 border-primary text-primary'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Deletes ({previewData.deletes.length})
					</button>
				</div>

				<!-- Changes List -->
				<div class="space-y-3">
					{#if selectedTab === 'creates'}
						{#if previewData.creates.length === 0}
							<div class="text-center py-12 text-muted-foreground">
								<Plus class="h-12 w-12 mx-auto mb-3" />
								<p class="font-medium">No records to create</p>
							</div>
						{:else}
							{#each previewData.creates as change, idx}
								{@const changeId = `create-${idx}`}
								{@const ChangeIcon = getChangeIcon(change.changeType)}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<ChangeIcon
													class="h-5 w-5 text-green-600"
												/>
												<p class="font-medium">{change.displayName}</p>
												<Badge variant="outline">{change.entityType}</Badge>
												{#if change.quickbooksId}
													<code class="text-xs bg-muted px-2 py-1 rounded">QB: {change.quickbooksId}</code>
												{/if}
											</div>
										</div>
									</div>

									{#if change.fieldChanges && includeFieldChanges}
										<button
											onclick={() => toggleExpanded(changeId)}
											class="text-sm text-primary hover:underline mt-2"
										>
											{expandedChanges.has(changeId) ? 'Hide' : 'Show'} field changes ({change.fieldChanges.length})
										</button>

										{#if expandedChanges.has(changeId)}
											<div class="mt-3 space-y-2">
												{#each change.fieldChanges as field}
													<div class="text-sm bg-muted p-2 rounded">
														<span class="font-medium">{field.fieldName}:</span>
														<span class="text-green-600 ml-2">{field.newValue || '(empty)'}</span>
													</div>
												{/each}
											</div>
										{/if}
									{/if}

									{#if change.warnings && change.warnings.length > 0}
										<div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
											<AlertTriangle class="inline h-4 w-4 mr-1" />
											{change.warnings.join(', ')}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					{:else if selectedTab === 'updates'}
						{#if previewData.updates.length === 0}
							<div class="text-center py-12 text-muted-foreground">
								<Edit class="h-12 w-12 mx-auto mb-3" />
								<p class="font-medium">No records to update</p>
							</div>
						{:else}
							{#each previewData.updates as change, idx}
								{@const changeId = `update-${idx}`}
								{@const ChangeIcon = getChangeIcon(change.changeType)}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<ChangeIcon
													class="h-5 w-5 text-blue-600"
												/>
												<p class="font-medium">{change.displayName}</p>
												<Badge variant="outline">{change.entityType}</Badge>
												{#if change.localId}
													<code class="text-xs bg-muted px-2 py-1 rounded">Local: {change.localId.slice(0, 8)}</code>
												{/if}
												{#if change.quickbooksId}
													<code class="text-xs bg-muted px-2 py-1 rounded">QB: {change.quickbooksId}</code>
												{/if}
											</div>
										</div>
									</div>

									{#if change.fieldChanges && includeFieldChanges}
										<button
											onclick={() => toggleExpanded(changeId)}
											class="text-sm text-primary hover:underline mt-2"
										>
											{expandedChanges.has(changeId) ? 'Hide' : 'Show'} field changes ({change.fieldChanges.length})
										</button>

										{#if expandedChanges.has(changeId)}
											<div class="mt-3 space-y-2">
												{#each change.fieldChanges as field}
													<div class="text-sm bg-muted p-2 rounded">
														<div class="flex items-center gap-2 mb-1">
															<span class="font-medium">{field.fieldName}:</span>
															{#if field.hasConflict}
																<Badge variant="destructive" class="text-xs">Conflict</Badge>
															{/if}
														</div>
														<div class="flex items-center gap-2">
															<span class="text-red-600 line-through">{field.currentValue || '(empty)'}</span>
															<ArrowRight class="h-3 w-3" />
															<span class="text-green-600">{field.newValue || '(empty)'}</span>
														</div>
													</div>
												{/each}
											</div>
										{/if}
									{/if}

									{#if change.warnings && change.warnings.length > 0}
										<div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
											<AlertTriangle class="inline h-4 w-4 mr-1" />
											{change.warnings.join(', ')}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					{:else if selectedTab === 'deletes'}
						{#if previewData.deletes.length === 0}
							<div class="text-center py-12 text-muted-foreground">
								<Trash2 class="h-12 w-12 mx-auto mb-3" />
								<p class="font-medium">No records to delete</p>
							</div>
						{:else}
							{#each previewData.deletes as change}
								{@const ChangeIcon = getChangeIcon(change.changeType)}
								<div class="border rounded-lg p-4 bg-red-50">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<ChangeIcon
													class="h-5 w-5 text-red-600"
												/>
												<p class="font-medium">{change.displayName}</p>
												<Badge variant="outline">{change.entityType}</Badge>
											</div>
											<p class="text-sm text-red-600">This record will be deleted</p>
										</div>
									</div>

									{#if change.warnings && change.warnings.length > 0}
										<div class="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-900">
											<AlertTriangle class="inline h-4 w-4 mr-1" />
											{change.warnings.join(', ')}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Action Buttons -->
		<div class="mt-6 flex gap-4">
			<Button onclick={runPreview} variant="outline">
				<Eye class="h-4 w-4 mr-2" />
				Run Preview Again
			</Button>
			<Button disabled={previewData.totalChanges === 0}>
				<CheckCircle2 class="h-4 w-4 mr-2" />
				Proceed with Sync
			</Button>
		</div>
	{/if}

	{#if !previewData && !loading && !error}
		<div class="text-center py-12 text-muted-foreground">
			<Eye class="h-16 w-16 mx-auto mb-4" />
			<h3 class="text-lg font-medium mb-2">Ready to Preview</h3>
			<p class="text-sm">
				Configure your sync options above and click "Run Preview" to see what changes will be made
			</p>
		</div>
	{/if}
</div>
