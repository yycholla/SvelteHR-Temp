<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Plus,
		Search,
		MoreHorizontal,
		BookOpen,
		Users,
		CheckCircle2,
		XCircle,
		Edit,
		Trash2,
		FileText,
		Settings
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	let { data } = $props();

	let searchQuery = $state('');
	let moduleToDelete = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	// Derived state for filtering
	let filteredModules = $derived(
		(data.modules || []).filter(
			(m: any) =>
				m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	// Statistics
	let totalModules = $derived(data.modules?.length || 0);
	let activeModules = $derived(data.modules?.filter((m: any) => m.isActive).length || 0);
	let totalAssignments = $derived(
		data.modules?.reduce((sum: number, m: any) => sum + (m.assignmentCount || 0), 0) || 0
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function confirmDelete(module: { id: string; title: string }) {
		moduleToDelete = module;
	}

	function cancelDelete() {
		moduleToDelete = null;
	}
</script>

<svelte:head>
	<title>Onboarding Management - MountainHR</title>
</svelte:head>

<div class="container mx-auto p-6 md:p-10 max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Onboarding Modules</h1>
			<p class="text-muted-foreground">
				Manage employee onboarding workflows, documentation, and new hire forms.
			</p>
		</div>
		<Button href="/dashboard/admin/onboarding/create">
			<Plus class="mr-2 h-4 w-4" />
			Create Module
		</Button>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Modules</Card.Title>
				<BookOpen class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalModules}</div>
				<p class="text-xs text-muted-foreground">Onboarding workflows</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Active</Card.Title>
				<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{activeModules}</div>
				<p class="text-xs text-muted-foreground">Currently available</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Assignments</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{totalAssignments}</div>
				<p class="text-xs text-muted-foreground">Assigned to employees</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Content -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>All Onboarding Modules</Card.Title>
				<div class="relative w-64">
					<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search modules..." class="pl-8" bind:value={searchQuery} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if filteredModules.length === 0}
				<div class="text-center py-12">
					<BookOpen class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No onboarding modules found</h3>
					<p class="text-muted-foreground mt-2">
						{searchQuery
							? 'Try adjusting your search query'
							: 'Get started by creating your first onboarding module'}
					</p>
					{#if !searchQuery}
						<Button href="/dashboard/admin/onboarding/create" class="mt-4">
							<Plus class="mr-2 h-4 w-4" />
							Create Module
						</Button>
					{/if}
				</div>
			{:else}
				<div class="rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Title</Table.Head>
								<Table.Head>Category</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Assigned To</Table.Head>
								<Table.Head>Created</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredModules as module (module.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										<div class="flex flex-col">
											<a
												href="/dashboard/admin/onboarding/{module.id}"
												class="hover:underline text-base font-semibold"
											>
												{module.title}
											</a>
											{#if module.description}
												<span class="text-sm text-muted-foreground line-clamp-1 max-w-md">
													{module.description}
												</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										{#if module.category}
											<Badge variant="outline">{module.category}</Badge>
										{:else}
											<span class="text-muted-foreground">Uncategorized</span>
										{/if}
									</Table.Cell>
									<Table.Cell>
										{#if module.isActive}
											<Badge variant="default" class="bg-green-500 hover:bg-green-600"
												>Active</Badge
											>
										{:else}
											<Badge variant="secondary">Inactive</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<Users class="h-4 w-4 text-muted-foreground" />
											<span class="font-medium">{module.assignmentCount || 0}</span>
											{#if module.assignments && module.assignments.length > 0}
												<span class="text-xs text-muted-foreground">
													({module.assignments.map((a: any) => a.user?.displayName).join(', ')})
												</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground"
											>{formatDate(module.createdAt)}</span
										>
									</Table.Cell>
									<Table.Cell class="text-right">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												<Button variant="ghost" size="icon">
													<MoreHorizontal class="h-4 w-4" />
													<span class="sr-only">Actions</span>
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												<DropdownMenu.Item
													onclick={() => goto(`/dashboard/admin/onboarding/${module.id}`)}
												>
													<Edit class="mr-2 h-4 w-4" />
													Edit Module
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() =>
														goto(`/dashboard/admin/onboarding/${module.id}/content`)}
												>
													<FileText class="mr-2 h-4 w-4" />
													Manage Content
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() =>
														goto(`/dashboard/admin/onboarding/${module.id}/assignments`)}
												>
													<Users class="mr-2 h-4 w-4" />
													Manage Assignments
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													class="text-destructive"
													onclick={() => confirmDelete(module)}
												>
													<Trash2 class="mr-2 h-4 w-4" />
													Delete Module
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Delete Confirmation Dialog -->
{#if moduleToDelete}
	<AlertDialog.Root open={true} onOpenChange={cancelDelete}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Onboarding Module</AlertDialog.Title>
				<AlertDialog.Description>
					Are you sure you want to delete "{moduleToDelete.title}"? This action cannot be undone
					and will remove all associated content blocks, assignments, and progress data.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<form method="POST" action="?/delete" use:enhance={() => {
					isDeleting = true;
					return async ({ result, update }) => {
						await update();
						isDeleting = false;
						moduleToDelete = null;
					};
				}}>
					<input type="hidden" name="id" value={moduleToDelete.id} />
					<AlertDialog.Action type="submit" disabled={isDeleting} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
						{isDeleting ? 'Deleting...' : 'Delete Module'}
					</AlertDialog.Action>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
