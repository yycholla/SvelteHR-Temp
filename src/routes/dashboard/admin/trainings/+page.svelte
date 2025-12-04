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
		XCircle
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
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
		if (!dateStr) return 'N/A';
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

<div class="container mx-auto p-6 md:p-10 max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Training Modules</h1>
			<p class="text-muted-foreground">
				Manage employee training programs, courses, and compliance modules.
			</p>
		</div>
		<Button href="/dashboard/admin/trainings/create">
			<Plus class="mr-2 h-4 w-4" />
			Create Training
		</Button>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Modules</Card.Title>
				<GraduationCap class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalTrainings}</div>
				<p class="text-xs text-muted-foreground">All training programs</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Active</Card.Title>
				<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{activeTrainings}</div>
				<p class="text-xs text-muted-foreground">Currently available</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Upcoming</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-blue-600">{upcomingTrainings}</div>
				<p class="text-xs text-muted-foreground">Scheduled for future</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Content -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title>All Trainings</Card.Title>
				<div class="relative w-64">
					<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search trainings..." class="pl-8" bind:value={searchQuery} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Title</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Assigned To</Table.Head>
							<Table.Head>Schedule</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredTrainings as training (training.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<div class="flex flex-col">
										<a
											href="/dashboard/admin/trainings/{training.id}/stats"
											class="hover:underline text-base font-semibold"
										>
											{training.title}
										</a>
										{#if training.description}
											<span class="text-sm text-muted-foreground line-clamp-1 max-w-md">
												{training.description}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									{#if training.isActive}
										<Badge variant="default" class="bg-green-500 hover:bg-green-600">Active</Badge>
									{:else}
										<Badge variant="secondary">Inactive</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										{#if training.assignmentCount > 0}
											<Badge variant="outline" class="gap-1">
												<Users class="h-3 w-3" />
												{training.assignmentCount}
											</Badge>
											{#if training.assignments && training.assignments.length > 0}
												<div class="text-xs text-muted-foreground">
													{training.assignments
														.map((a: any) => a.user?.displayName || a.user?.email)
														.slice(0, 2)
														.join(', ')}
													{#if training.assignmentCount > 2}
														<span class="font-medium">+{training.assignmentCount - 2} more</span>
													{/if}
												</div>
											{/if}
										{:else}
											<span class="text-xs text-muted-foreground italic">Not assigned</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col text-sm text-muted-foreground">
										<span>Start: {formatDate(training.startDate)}</span>
										<span>End: {formatDate(training.endDate)}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" class="h-8 w-8 p-0">
													<span class="sr-only">Open menu</span>
													<MoreHorizontal class="h-4 w-4" />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Label>Actions</DropdownMenu.Label>
											<DropdownMenu.Item href="/dashboard/admin/trainings/{training.id}">
												<Edit class="mr-2 h-4 w-4" />
												Edit Details
											</DropdownMenu.Item>
											<DropdownMenu.Item href="/dashboard/admin/trainings/{training.id}/content">
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
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-24 text-center">No trainings found.</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root open={trainingToDelete !== null}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Training Module</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>"{trainingToDelete?.title}"</strong>? This action
				cannot be undone. All associated content and assignments will be permanently removed.
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
