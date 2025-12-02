<script lang="ts">
	import { Search, BookOpen, Calendar, CheckCircle2, Clock, ChevronRight } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';

	let { data } = $props();

	let searchQuery = $state('');

	let filteredTrainings = $derived(
		(data.trainings || []).filter((t: any) => 
			t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isOverdue(dateStr: string | null) {
		if (!dateStr) return false;
		return new Date(dateStr) < new Date();
	}
</script>

<svelte:head>
	<title>My Training - MountainHR</title>
</svelte:head>

<div class="container mx-auto p-6 md:p-10 max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">My Training</h1>
			<p class="text-muted-foreground">View and complete your assigned training modules.</p>
		</div>
		
		<div class="relative w-full md:w-64">
			<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
			<Input placeholder="Search training..." class="pl-8" bind:value={searchQuery} />
		</div>
	</div>

	<!-- Training Grid -->
	{#if filteredTrainings.length === 0}
		<div class="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
			<BookOpen class="h-12 w-12 mb-4 opacity-20" />
			<p class="text-lg font-medium">No training found</p>
			<p class="text-sm">You don't have any assigned training modules matching your search.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredTrainings as training (training.id)}
				<Card.Root class="flex flex-col h-full transition-all hover:shadow-md">
					<Card.Header>
						<div class="flex justify-between items-start gap-2">
							<Card.Title class="text-xl line-clamp-2 leading-tight">{training.title}</Card.Title>
							<!-- Placeholder for status badge until backend supports progress -->
							<Badge variant="outline" class="shrink-0">Assigned</Badge>
						</div>
						{#if training.description}
							<Card.Description class="line-clamp-2 mt-2">
								{training.description}
							</Card.Description>
						{/if}
					</Card.Header>
					
					<Card.Content class="flex-1">
						<div class="space-y-4">
							{#if training.tags && training.tags.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each training.tags as tag}
										<Badge variant="secondary" class="text-xs font-normal">{tag}</Badge>
									{/each}
								</div>
							{/if}

							<div class="space-y-2 text-sm text-muted-foreground">
								{#if training.startDate}
									<div class="flex items-center gap-2">
										<Clock class="h-4 w-4" />
										<span>Starts: {formatDate(training.startDate)}</span>
									</div>
								{/if}
								{#if training.endDate}
									<div class="flex items-center gap-2 {isOverdue(training.endDate) ? 'text-destructive font-medium' : ''}">
										<Calendar class="h-4 w-4" />
										<span>Due: {formatDate(training.endDate)}</span>
										{#if isOverdue(training.endDate)}
											<Badge variant="destructive" class="text-[10px] h-5 ml-auto">Overdue</Badge>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</Card.Content>

					<Card.Footer class="pt-4 mt-auto border-t bg-muted/5">
						<Button href={`/dashboard/training/${training.id}`} class="w-full group">
							Start Module
							<ChevronRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>