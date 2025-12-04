<!--
  ConflictWarningDialog Component
  Feature: 027-we-need-to - Task T055

  Dialog to display scheduling conflicts when RSVP'ing or creating events

  Features:
  - Lists all conflicting events
  - Shows overlap duration and percentage
  - Severity classification (minor < 30%, major >= 30%)
  - Color-coded severity indicators
  - Confirm/cancel actions

  Props:
  - open: boolean - Dialog open state
  - conflicts: Array of conflict objects with overlap details
  - targetEvent: The event being RSVP'd to or created
  - onConfirm: () => void - Callback when user confirms despite conflicts
  - onCancel: () => void - Callback when user cancels
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertTriangle, Calendar, Clock } from '@lucide/svelte';
	import { formatDate, formatTime } from '$lib/utils/date-formatting';

	// Props with Svelte 5 runes
	let {
		open = $bindable(),
		conflicts,
		targetEvent,
		onConfirm,
		onCancel
	}: {
		open: boolean;
		conflicts: Array<{
			id: string;
			event: {
				id: string;
				title: string;
				startDate: Date;
				endDate: Date;
				location?: string;
			};
			overlapDuration: number; // minutes
			overlapPercentage: number;
			severity: 'minor' | 'major';
		}>;
		targetEvent: {
			title: string;
			startDate: Date;
			endDate: Date;
		};
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	// Derived
	let hasConflicts = $derived(conflicts.length > 0);
	let hasMajorConflicts = $derived(conflicts.some((c) => c.severity === 'major'));
	let minorConflicts = $derived(conflicts.filter((c) => c.severity === 'minor'));
	let majorConflicts = $derived(conflicts.filter((c) => c.severity === 'major'));

	// Format overlap duration
	function formatOverlap(minutes: number): string {
		if (minutes < 60) {
			return `${minutes} min`;
		}
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	// Get severity badge variant
	function getSeverityVariant(severity: 'minor' | 'major'): 'default' | 'destructive' {
		return severity === 'major' ? 'destructive' : 'default';
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangle class="h-5 w-5 text-warning" />
				Scheduling Conflicts Detected
			</Dialog.Title>
			<Dialog.Description>
				The following events conflict with "{targetEvent.title}"
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Target Event Info -->
			<Alert.Root>
				<Calendar class="h-4 w-4" />
				<Alert.Title>Target Event</Alert.Title>
				<Alert.Description>
					<p class="font-medium">{targetEvent.title}</p>
					<p class="text-sm text-muted-foreground">
						{formatDate(targetEvent.startDate)} •
						{formatTime(targetEvent.startDate)} - {formatTime(targetEvent.endDate)}
					</p>
				</Alert.Description>
			</Alert.Root>

			<!-- Major Conflicts -->
			{#if majorConflicts.length > 0}
				<div>
					<h3 class="mb-2 text-sm font-semibold text-destructive">
						Major Conflicts (≥30% overlap)
					</h3>
					<div class="space-y-2">
						{#each majorConflicts as conflict}
							<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<p class="font-medium">{conflict.event.title}</p>
										<div class="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
											<span class="flex items-center gap-1">
												<Calendar class="h-3 w-3" />
												{formatDate(conflict.event.startDate)}
											</span>
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatTime(conflict.event.startDate)} - {formatTime(
													conflict.event.endDate
												)}
											</span>
										</div>
										{#if conflict.event.location}
											<p class="mt-1 text-sm text-muted-foreground">
												📍 {conflict.event.location}
											</p>
										{/if}
									</div>
									<div class="flex flex-col items-end gap-1">
										<Badge variant={getSeverityVariant(conflict.severity)}>
											{conflict.severity}
										</Badge>
										<span class="text-xs text-muted-foreground">
											{conflict.overlapPercentage}% overlap
										</span>
										<span class="text-xs text-muted-foreground">
											{formatOverlap(conflict.overlapDuration)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Minor Conflicts -->
			{#if minorConflicts.length > 0}
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">
						Minor Conflicts (&lt;30% overlap)
					</h3>
					<div class="space-y-2">
						{#each minorConflicts as conflict}
							<div class="rounded-lg border bg-muted/50 p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<p class="font-medium">{conflict.event.title}</p>
										<div class="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
											<span class="flex items-center gap-1">
												<Calendar class="h-3 w-3" />
												{formatDate(conflict.event.startDate)}
											</span>
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatTime(conflict.event.startDate)} - {formatTime(
													conflict.event.endDate
												)}
											</span>
										</div>
										{#if conflict.event.location}
											<p class="mt-1 text-sm text-muted-foreground">
												📍 {conflict.event.location}
											</p>
										{/if}
									</div>
									<div class="flex flex-col items-end gap-1">
										<Badge variant={getSeverityVariant(conflict.severity)}>
											{conflict.severity}
										</Badge>
										<span class="text-xs text-muted-foreground">
											{conflict.overlapPercentage}% overlap
										</span>
										<span class="text-xs text-muted-foreground">
											{formatOverlap(conflict.overlapDuration)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Warning Message -->
			{#if hasMajorConflicts}
				<Alert.Root variant="destructive">
					<AlertTriangle class="h-4 w-4" />
					<Alert.Title>Warning</Alert.Title>
					<Alert.Description>
						You have major scheduling conflicts. Accepting this event may cause significant overlaps
						with your existing commitments.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button
				variant={hasMajorConflicts ? 'destructive' : 'default'}
				onclick={() => {
					onConfirm();
					open = false;
				}}
			>
				{hasMajorConflicts ? 'Accept Anyway' : 'Continue'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
