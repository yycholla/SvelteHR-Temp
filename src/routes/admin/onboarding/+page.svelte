<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		BookOpen,
		CheckCircle2,
		Edit,
		FileText,
		MoreHorizontal,
		Plus,
		Search,
		Trash2,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	const { data } = $props();

	let searchQuery = $state('');
	let moduleToDelete = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	// Derived state for filtering
	const filteredModules = $derived(
		(data.modules || []).filter(
			(m: any) =>
				m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				m.category?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Statistics
	const totalModules = $derived(data.modules?.length || 0);
	const activeModules = $derived(data.modules?.filter((m: any) => m.isActive).length || 0);
	const totalAssignments = $derived(
		data.modules?.reduce((sum: number, m: any) => sum + (m.assignmentCount || 0), 0) || 0
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
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

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight whitespace-nowrap">Onboarding</h1>
			<div class="h-4 w-px bg-border"></div>

			<!-- Search -->
			<div class="relative w-64">
				<Search
					class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					placeholder="Search modules..."
					class="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none transition-colors"
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<!-- Stats Summary -->
			<div
				class="hidden lg:flex items-center gap-4 text-xs text-muted-foreground border-r pr-4 h-8"
			>
				<div class="flex items-center gap-1.5" title="Total Modules">
					<BookOpen class="h-3.5 w-3.5" />
					<span>{totalModules}</span>
				</div>
				<div class="flex items-center gap-1.5" title="Active">
					<CheckCircle2 class="h-3.5 w-3.5 text-green-600" />
					<span>{activeModules}</span>
				</div>
				<div class="flex items-center gap-1.5" title=" assignments">
					<Users class="h-3.5 w-3.5 text-blue-600" />
					<span>{totalAssignments}</span>
				</div>
			</div>

			<Button href="/admin/onboarding/create" class="gap-1.5 h-8 text-xs px-3">
				<Plus class="h-3.5 w-3.5" />
				Create
			</Button>
		</div>
	</header>

	<!-- Table Area -->
	<div class="flex-1 overflow-auto min-h-0 relative bg-background">
		{#if filteredModules.length === 0}
			<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
				<BookOpen class="h-12 w-12 mb-4 opacity-20" />
				<h3 class="text-lg font-medium">No onboarding modules found</h3>
				<p class="text-sm mt-1 max-w-sm text-center">
					{searchQuery
						? 'Try adjusting your search query.'
						: 'Get started by creating your first onboarding workflow.'}
				</p>
				{#if !searchQuery}
					<Button href="/admin/onboarding/create" class="mt-4 gap-2">
						<Plus class="h-4 w-4" />
						Create Module
					</Button>
				{/if}
			</div>
		{:else}
			<table class="w-full text-sm text-left border-collapse">
				<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
					<tr>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-1/3"
							>Title</th
						>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32"
							>Category</th
						>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-24"
							>Status</th
						>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
							>Assignments</th
						>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-32"
							>Created</th
						>
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right w-16"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each filteredModules as module (module.id)}
						<tr class="hover:bg-muted/30 group">
							<td class="px-3 py-2 border-r last:border-r-0 align-top">
								<div class="flex flex-col gap-0.5">
									<a
										href="/admin/onboarding/{module.id}"
										class="font-medium hover:text-primary hover:underline transition-colors"
									>
										{module.title}
									</a>
									{#if module.description}
										<span class="text-xs text-muted-foreground line-clamp-1">
											{module.description}
										</span>
									{/if}
								</div>
							</td>
							<td class="px-3 py-2 border-r last:border-r-0 align-top text-xs">
								{#if module.category}
									<Badge variant="outline" class="font-normal text-[10px] h-5"
										>{module.category}</Badge
									>
								{:else}
									<span class="text-muted-foreground italic">Uncategorized</span>
								{/if}
							</td>
							<td class="px-3 py-2 border-r last:border-r-0 align-top">
								{#if module.isActive}
									<Badge
										variant="default"
										class="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 text-[10px] h-5"
										>Active</Badge
									>
								{:else}
									<Badge variant="secondary" class="text-[10px] h-5">Inactive</Badge>
								{/if}
							</td>
							<td class="px-3 py-2 border-r last:border-r-0 align-top">
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="gap-1 h-5 text-[10px] font-normal">
										<Users class="h-3 w-3" />
										{module.assignmentCount || 0}
									</Badge>
									{#if module.assignments && module.assignments.length > 0}
										<span class="text-xs text-muted-foreground truncate max-w-[200px]">
											{module.assignments.map((a: any) => a.user?.displayName).join(', ')}
										</span>
									{/if}
								</div>
							</td>
							<td
								class="px-3 py-2 border-r last:border-r-0 align-top text-xs text-muted-foreground whitespace-nowrap"
							>
								{formatDate(module.createdAt)}
							</td>
							<td class="px-3 py-2 text-right align-top">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="ghost"
												size="icon"
												class="h-6 w-6 p-0 hover:bg-muted"
											>
												<MoreHorizontal class="h-4 w-4" />
												<span class="sr-only">Actions</span>
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onclick={() => goto(`/admin/onboarding/${module.id}`)}>
											<Edit class="mr-2 h-4 w-4" />
											Edit Details
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => goto(`/admin/onboarding/${module.id}/content`)}
										>
											<FileText class="mr-2 h-4 w-4" />
											Manage Content
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => goto(`/admin/onboarding/${module.id}/assignments`)}
										>
											<Users class="mr-2 h-4 w-4" />
											Assignments
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive"
											onclick={() => confirmDelete(module)}
										>
											<Trash2 class="mr-2 h-4 w-4" />
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Dialog -->
{#if moduleToDelete}
	<AlertDialog.Root open={true} onOpenChange={cancelDelete}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Onboarding Module</AlertDialog.Title>
				<AlertDialog.Description>
					Are you sure you want to delete <strong>"{moduleToDelete.title}"</strong>? This action
					cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						isDeleting = true;
						return async ({ result, update }) => {
							await update();
							isDeleting = false;
							moduleToDelete = null;
						};
					}}
				>
					<input type="hidden" name="id" value={moduleToDelete.id} />
					<AlertDialog.Action
						type="submit"
						disabled={isDeleting}
						class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</AlertDialog.Action>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
