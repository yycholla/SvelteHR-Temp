<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Calendar,
		CheckCircle2,
		Edit,
		GraduationCap,
		MoreHorizontal,
		Plus,
		Search,
		Trash2,
		Users,
		XCircle,
		Filter
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	const { data } = $props();

	let searchQuery = $state('');
	let trainingToDelete = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	// Derived state for filtering
	const filteredTrainings = $derived(
		(data.trainings || []).filter(
			(t: any) =>
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Statistics
	const totalTrainings = $derived(data.trainings?.length || 0);
	const activeTrainings = $derived(data.trainings?.filter((t: any) => t.isActive).length || 0);
	const upcomingTrainings = $derived(
		data.trainings?.filter((t: any) => t.startDate && new Date(t.startDate) > new Date()).length ||
			0
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Training Management - MountainHR</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight whitespace-nowrap">Trainings</h1>
			<div class="h-4 w-px bg-border"></div>
			
			<!-- Search -->
			<div class="relative w-64">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
			<div class="hidden lg:flex items-center gap-4 text-xs text-muted-foreground border-r pr-4 h-8">
				<div class="flex items-center gap-1.5" title="Total Modules">
					<GraduationCap class="h-3.5 w-3.5" />
					<span>{totalTrainings}</span>
				</div>
				<div class="flex items-center gap-1.5" title="Active">
					<CheckCircle2 class="h-3.5 w-3.5 text-green-600" />
					<span>{activeTrainings}</span>
				</div>
				<div class="flex items-center gap-1.5" title="Upcoming">
					<Calendar class="h-3.5 w-3.5 text-blue-600" />
					<span>{upcomingTrainings}</span>
				</div>
			</div>

			<Button href="/admin/trainings/create" class="gap-1.5 h-8 text-xs px-3">
				<Plus class="h-3.5 w-3.5" />
				Create
			</Button>
		</div>
	</header>

	<!-- Table Area -->
	<div class="flex-1 overflow-auto min-h-0 relative bg-background">
		<table class="w-full text-sm text-left border-collapse">
			<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
				<tr>
					<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-1/3">Title</th>
					<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-24">Status</th>
					<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Assigned</th>
					<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 w-48">Schedule</th>
					<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right w-16">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each filteredTrainings as training (training.id)}
					<tr class="hover:bg-muted/30 group">
						<td class="px-3 py-2 border-r last:border-r-0 align-top">
							<div class="flex flex-col gap-0.5">
								<a
									href="/admin/trainings/{training.id}/stats"
									class="font-medium hover:text-primary hover:underline transition-colors"
								>
									{training.title}
								</a>
								{#if training.description}
									<span class="text-xs text-muted-foreground line-clamp-1">
										{training.description}
									</span>
								{/if}
							</div>
						</td>
						<td class="px-3 py-2 border-r last:border-r-0 align-top">
							{#if training.isActive}
								<Badge variant="default" class="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 text-[10px] h-5">Active</Badge>
							{:else}
								<Badge variant="secondary" class="text-[10px] h-5">Inactive</Badge>
							{/if}
						</td>
						<td class="px-3 py-2 border-r last:border-r-0 align-top">
							<div class="flex items-center gap-2">
								{#if training.assignmentCount > 0}
									<Badge variant="outline" class="gap-1 h-5 text-[10px] font-normal">
										<Users class="h-3 w-3" />
										{training.assignmentCount}
									</Badge>
									{#if training.assignments && training.assignments.length > 0}
										<div class="text-xs text-muted-foreground truncate max-w-[200px]">
											{training.assignments
												.map((a: any) => a.user?.displayName || a.user?.email)
												.slice(0, 2)
												.join(', ')}
											{#if training.assignmentCount > 2}
												<span class="font-medium">+{training.assignmentCount - 2}</span>
											{/if}
										</div>
									{/if}
								{:else}
									<span class="text-xs text-muted-foreground italic">None</span>
								{/if}
							</div>
						</td>
						<td class="px-3 py-2 border-r last:border-r-0 align-top">
							<div class="flex flex-col text-xs text-muted-foreground">
								<span class="whitespace-nowrap">Start: {formatDate(training.startDate)}</span>
								<span class="whitespace-nowrap">End: {formatDate(training.endDate)}</span>
							</div>
						</td>
						<td class="px-3 py-2 text-right align-top">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon" class="h-6 w-6 p-0 hover:bg-muted">
											<span class="sr-only">Open menu</span>
											<MoreHorizontal class="h-4 w-4" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Label>Actions</DropdownMenu.Label>
									<DropdownMenu.Item onSelect={() => goto(`/admin/trainings/${training.id}`)}>
										<Edit class="mr-2 h-4 w-4" />
										Edit Details
									</DropdownMenu.Item>
									<DropdownMenu.Item onSelect={() => goto(`/admin/trainings/${training.id}/content`)}>
										<GraduationCap class="mr-2 h-4 w-4" />
										Manage Content
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive"
										onSelect={() => {
											trainingToDelete = { id: training.id, title: training.title };
										}}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Delete
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-12 text-center text-muted-foreground text-xs">
							No trainings found.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root open={trainingToDelete !== null}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Training Module</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>"{trainingToDelete?.title}"</strong>? This action
				cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (trainingToDelete = null)}>Cancel</AlertDialog.Cancel>
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					return async ({ result, update }) => {
						isDeleting = false;
						if (result.type === 'success') {
							trainingToDelete = null;
							await update();
						}
					};
				}}
			>
				<input type="hidden" name="id" value={trainingToDelete?.id || ''} />
				<AlertDialog.Action
					type="submit"
					disabled={isDeleting}
					class="bg-destructive hover:bg-destructive/90"
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>