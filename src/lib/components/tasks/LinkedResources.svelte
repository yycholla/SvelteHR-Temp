<!--
  LinkedResources Component
  Feature: 028-task-system-expansion - Task T032
  
  Manage linked resources (Employee, Document, Goal, Performance Review)
  - Display existing resources with availability status
  - Add new resources with type and search selection
  - Remove resources with confirmation
  - Status indicators (Available, Unavailable, Deleted)
  - Last checked timestamp
  - Resource validation warnings
-->

<script lang="ts">
	import type { AvailabilityStatus, LinkedResource, ResourceType } from '$lib/types/task';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		AlertCircle,
		CheckCircle,
		ClipboardCheck,
		Clock,
		FileText,
		Link as LinkIcon,
		Plus,
		Search,
		Target,
		Trash2,
		Unlink,
		Users,
		XCircle
	} from '@lucide/svelte';
	import { formatDistance } from 'date-fns';

	interface Props {
		resources: LinkedResource[];
		availableResources: Array<{
			id: string;
			type: ResourceType;
			title: string;
		}>;
		onAddResource: (
			resourceType: ResourceType,
			resourceId: string,
			resourceTitle: string
		) => Promise<void>;
		onRemoveResource: (resourceId: string) => Promise<void>;
		loading?: boolean;
	}

	const {
		resources,
		availableResources,
		onAddResource,
		onRemoveResource,
		loading = false
	}: Props = $props();

	// State
	let isAddDialogOpen = $state(false);
	let selectedResourceType = $state<ResourceType>('Employee');
	let selectedResourceId = $state('');
	let searchQuery = $state('');
	let isSubmitting = $state(false);

	// Resource type options
	const resourceTypeOptions = [
		{ value: 'Employee', label: 'Employee', icon: Users },
		{ value: 'Document', label: 'Document', icon: FileText },
		{ value: 'Goal', label: 'Goal/OKR', icon: Target },
		{ value: 'Performance_Review', label: 'Performance Review', icon: ClipboardCheck }
	];

	// Filter available resources by type and search query
	const filteredResources = $derived(() => {
		const filtered = availableResources.filter((r) => {
			// Filter by type
			if (r.type !== selectedResourceType) return false;

			// Exclude already linked resources
			if (resources.some((lr) => lr.resourceId === r.id)) return false;

			// Apply search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return r.title.toLowerCase().includes(query);
			}

			return true;
		});

		return filtered;
	});

	// Resource options for select dropdown
	const resourceOptions = $derived(
		filteredResources().map((r) => ({
			value: r.id,
			label: r.title
		}))
	);

	// Get resource type icon
	function getResourceTypeIcon(type: ResourceType) {
		switch (type) {
			case 'Employee':
				return Users;
			case 'Document':
				return FileText;
			case 'Goal':
				return Target;
			case 'Performance_Review':
				return ClipboardCheck;
			default:
				return FileText;
		}
	}

	// Get resource type color
	function getResourceTypeColor(type: ResourceType) {
		switch (type) {
			case 'Employee':
				return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
			case 'Document':
				return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
			case 'Goal':
				return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
			case 'Performance_Review':
				return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
			default:
				return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
		}
	}

	// Get availability status icon
	function getAvailabilityIcon(status: AvailabilityStatus) {
		switch (status) {
			case 'Available':
				return CheckCircle;
			case 'Unavailable':
				return AlertCircle;
			case 'Deleted':
				return XCircle;
			default:
				return AlertCircle;
		}
	}

	// Get availability status color
	function getAvailabilityColor(status: AvailabilityStatus) {
		switch (status) {
			case 'Available':
				return 'text-green-600 dark:text-green-400';
			case 'Unavailable':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'Deleted':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-gray-600';
		}
	}

	// Format resource type for display
	function formatResourceType(type: ResourceType): string {
		return type.replace('_', ' ');
	}

	// Format relative time for last checked
	function formatLastChecked(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return formatDistance(d, new Date(), { addSuffix: true });
	}

	// Open add dialog
	function openAddDialog() {
		selectedResourceType = 'Employee';
		selectedResourceId = '';
		searchQuery = '';
		isAddDialogOpen = true;
	}

	// Handle add resource
	async function handleAddResource() {
		if (!selectedResourceId) return;

		const selectedResource = filteredResources().find((r) => r.id === selectedResourceId);
		if (!selectedResource) return;

		isSubmitting = true;
		try {
			await onAddResource(selectedResourceType, selectedResourceId, selectedResource.title);
			isAddDialogOpen = false;
		} catch (error) {
			console.error('[LinkedResources] Add error:', error);
			// Error handled by parent
		} finally {
			isSubmitting = false;
		}
	}

	// Handle remove resource
	async function handleRemoveResource(resourceId: string) {
		if (!confirm('Are you sure you want to unlink this resource?')) return;

		try {
			await onRemoveResource(resourceId);
		} catch (error) {
			console.error('[LinkedResources] Remove error:', error);
			// Error handled by parent
		}
	}
</script>

<div class="linked-resources space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between border-b pb-4">
		<div class="flex items-center gap-3">
			<LinkIcon class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Linked Resources</h3>
			<Badge variant="secondary">{resources.length}</Badge>
		</div>
		<Button size="sm" variant="outline" onclick={openAddDialog} disabled={loading}>
			<Plus class="mr-2 h-4 w-4" />
			Link Resource
		</Button>
	</div>

	<!-- Resources List -->
	{#if resources.length === 0}
		<div class="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
			<Unlink class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
			<p class="text-lg font-medium text-muted-foreground mb-1">No Linked Resources</p>
			<p class="text-sm text-muted-foreground mb-4">
				Link employees, documents, goals, or performance reviews to provide context for this task
			</p>
			<Button variant="outline" onclick={openAddDialog}>
				<Plus class="mr-2 h-4 w-4" />
				Link Your First Resource
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each resources as resource (resource.id)}
				{@const TypeIcon = getResourceTypeIcon(resource.resourceType)}
				{@const StatusIcon = getAvailabilityIcon(resource.availabilityStatus)}

				<div class="rounded-lg border bg-card p-4 space-y-3">
					<!-- Resource Header -->
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-start gap-3 flex-1">
							<!-- Type Icon -->
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 {getResourceTypeColor(
									resource.resourceType
								)}"
							>
								<TypeIcon class="h-5 w-5" />
							</div>

							<!-- Resource Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<Badge variant="outline" class="text-xs">
										{formatResourceType(resource.resourceType)}
									</Badge>
									<StatusIcon
										class="h-4 w-4 flex-shrink-0 {getAvailabilityColor(
											resource.availabilityStatus
										)}"
									/>
								</div>
								<p class="font-medium text-foreground truncate">{resource.resourceTitle}</p>
								<div class="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />
									<span>Checked {formatLastChecked(resource.lastChecked)}</span>
								</div>
							</div>
						</div>

						<!-- Remove Button -->
						<Button
							size="sm"
							variant="ghost"
							onclick={() => handleRemoveResource(resource.id)}
							disabled={loading}
							class="flex-shrink-0"
						>
							<Trash2 class="h-4 w-4 text-destructive" />
						</Button>
					</div>

					<!-- Availability Warning -->
					{#if resource.availabilityStatus !== 'Available'}
						<div
							class="rounded-lg border {resource.availabilityStatus === 'Deleted'
								? 'border-destructive bg-destructive/10'
								: 'border-warning bg-warning/10'} p-2"
						>
							<div
								class="flex items-center gap-2 text-xs {resource.availabilityStatus === 'Deleted'
									? 'text-destructive'
									: 'text-warning'}"
							>
								<AlertCircle class="h-3 w-3 flex-shrink-0" />
								<span>
									{resource.availabilityStatus === 'Deleted'
										? 'This resource has been deleted'
										: 'This resource is currently unavailable'}
								</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Unavailable Resources Warning -->
		{#if resources.some((r) => r.availabilityStatus !== 'Available')}
			<div class="rounded-lg border border-warning bg-warning/10 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
					<div>
						<h4 class="font-semibold text-warning mb-1">Some Resources Are Unavailable</h4>
						<p class="text-sm text-warning/90">
							{resources.filter((r) => r.availabilityStatus === 'Deleted').length > 0
								? 'Deleted resources should be removed or replaced.'
								: 'Unavailable resources may have been archived or restricted.'}
						</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Add Resource Dialog -->
	<Dialog.Root bind:open={isAddDialogOpen}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Link Resource to Task</Dialog.Title>
				<Dialog.Description>
					Select a resource to link to this task. Linked resources provide context and
					documentation.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Resource Type Selection -->
				<div class="space-y-2">
					<Label for="resourceType">Resource Type</Label>
					<Select.Root bind:selected={selectedResourceType}>
						<Select.Trigger id="resourceType">
							<Select.Value placeholder="Select resource type" />
						</Select.Trigger>
						<Select.Content>
							{#each resourceTypeOptions as type}
								{@const TypeIcon = type.icon}
								<Select.Item value={type.value}>
									<div class="flex items-center gap-2">
										<TypeIcon class="h-4 w-4" />
										<span>{type.label}</span>
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Search -->
				<div class="space-y-2">
					<Label for="search">Search {formatResourceType(selectedResourceType)}s</Label>
					<div class="relative">
						<Search
							class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
						/>
						<Input
							id="search"
							bind:value={searchQuery}
							placeholder="Search by name or title"
							class="pl-9"
						/>
					</div>
				</div>

				<!-- Resource Selection -->
				<div class="space-y-2">
					<Label for="resource">Select {formatResourceType(selectedResourceType)}</Label>
					<Select.Root bind:selected={selectedResourceId}>
						<Select.Trigger id="resource">
							<Select.Value placeholder="Choose a resource" />
						</Select.Trigger>
						<Select.Content>
							{#if resourceOptions.length === 0}
								<div class="p-4 text-center text-sm text-muted-foreground">
									No {formatResourceType(selectedResourceType).toLowerCase()}s available
								</div>
							{:else}
								{#each resourceOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (isAddDialogOpen = false)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={handleAddResource} disabled={!selectedResourceId || isSubmitting}>
					{#if isSubmitting}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
					{/if}
					Link Resource
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
