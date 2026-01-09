<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Calendar as CalendarIcon,
		Check,
		Copy,
		Download,
		Plus,
		RefreshCw
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		canCreateEvents: boolean;
		statistics: { upcoming: number; accepted: number };
		iCalLink: string;
		selectedVisibility: string;
		selectedType: string;
		selectedStatus: string;
		onCreateEvent: () => void;
		onApplyFilters: () => void;
	}

	let {
		canCreateEvents,
		statistics,
		iCalLink,
		selectedVisibility = $bindable(),
		selectedType = $bindable(),
		selectedStatus = $bindable(),
		onCreateEvent,
		onApplyFilters
	}: Props = $props();

	let showICalDialog = $state(false);
	let iCalLinkCopied = $state(false);

	async function copyICalLink() {
		await navigator.clipboard.writeText(iCalLink);
		iCalLinkCopied = true;
		setTimeout(() => (iCalLinkCopied = false), 2000);
	}
</script>

<div class="w-full xl:w-80 flex flex-col gap-6">
	<!-- Main Actions Card -->
	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title>Calendar</Card.Title>
			<Card.Description>Manage your schedule</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if canCreateEvents}
				<Button class="w-full justify-start" onclick={onCreateEvent}>
					<Plus class="mr-2 h-4 w-4" />
					New Event
				</Button>
			{/if}
			<Button
				variant="outline"
				class="w-full justify-start"
				onclick={() => (showICalDialog = !showICalDialog)}
			>
				<Download class="mr-2 h-4 w-4" />
				Export Calendar
			</Button>
		</Card.Content>
	</Card.Root>

	<!-- iCal Export Dialog (Inline) -->
	{#if showICalDialog}
		<Card.Root class="border-primary/20 bg-muted/50">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm">Calendar Feed</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="flex gap-2">
					<div
						class="flex-1 bg-background border rounded px-2 py-1 text-xs truncate font-mono text-muted-foreground"
					>
						{iCalLink}
					</div>
					<Button size="icon" variant="ghost" class="h-7 w-7" onclick={copyICalLink}>
						{#if iCalLinkCopied}<Check class="h-3 w-3" />{:else}<Copy class="h-3 w-3" />{/if}
					</Button>
				</div>
				<a
					href={iCalLink}
					download
					class="text-xs text-primary hover:underline flex items-center"
				>
					Download .ics file <CalendarIcon class="ml-1 h-3 w-3" />
				</a>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 gap-3">
		<Card.Root class="bg-card">
			<Card.Content class="p-4 text-center">
				<div class="text-2xl font-bold text-foreground">{statistics?.upcoming ?? 0}</div>
				<div class="text-xs text-muted-foreground">Upcoming</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="bg-card">
			<Card.Content class="p-4 text-center">
				<div class="text-2xl font-bold text-emerald-600">{statistics?.accepted ?? 0}</div>
				<div class="text-xs text-muted-foreground">Accepted</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between">
				<Card.Title class="text-base">Filters</Card.Title>
				<Button
					variant="ghost"
					size="icon"
					class="h-6 w-6"
					onclick={() => goto('/dashboard/events')}
				>
					<RefreshCw class="h-3 w-3" />
				</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label class="text-xs font-medium text-muted-foreground">Visibility</Label>
				<select
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
					bind:value={selectedVisibility}
					onchange={onApplyFilters}
				>
					<option value="all">All</option>
					<option value="company">Company</option>
					<option value="department">Department</option>
					<option value="specific">Personal</option>
				</select>
			</div>
			<div class="space-y-2">
				<Label class="text-xs font-medium text-muted-foreground">Type</Label>
				<select
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
					bind:value={selectedType}
					onchange={onApplyFilters}
				>
					<option value="all">All Types</option>
					<option value="meeting">Meeting</option>
					<option value="training">Training</option>
					<option value="social">Social</option>
					<option value="conference">Conference</option>
					<option value="review">Review</option>
				</select>
			</div>
			<div class="space-y-2">
				<Label class="text-xs font-medium text-muted-foreground">Status</Label>
				<select
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
					bind:value={selectedStatus}
					onchange={onApplyFilters}
				>
					<option value="all">All Statuses</option>
					<option value="scheduled">Scheduled</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>
		</Card.Content>
	</Card.Root>
</div>
