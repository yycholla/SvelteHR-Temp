<script lang="ts">
	/**
	 * EventHistoryView Component
	 * Feature: 025-events-flesh-out
	 *
	 * Displays audit trail of event changes in chronological order.
	 * Shows who made changes, what changed, and when.
	 */

	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, History, MapPin, User, Users } from '@lucide/svelte';
	import { format, formatDistanceToNow } from 'date-fns';

	type ChangeType =
		| 'created'
		| 'updated'
		| 'deleted'
		| 'ownership_transfer'
		| 'attendee_added'
		| 'attendee_removed';

	interface HistoryEntry {
		id: string;
		changedBy: {
			id: string;
			name: string;
		};
		changeType: ChangeType;
		fieldName?: string;
		oldValue?: any;
		newValue?: any;
		changedAt: string;
	}

	interface Props {
		history: HistoryEntry[];
		variant?: 'default' | 'compact';
	}

	const { history = [], variant = 'default' }: Props = $props();

	function getChangeIcon(changeType: ChangeType) {
		switch (changeType) {
			case 'created':
				return Calendar;
			case 'ownership_transfer':
				return User;
			case 'attendee_added':
			case 'attendee_removed':
				return Users;
			default:
				return History;
		}
	}

	function getChangeColor(changeType: ChangeType): string {
		switch (changeType) {
			case 'created':
				return 'default';
			case 'deleted':
				return 'destructive';
			case 'ownership_transfer':
				return 'outline';
			case 'attendee_added':
				return 'default';
			case 'attendee_removed':
				return 'secondary';
			default:
				return 'default';
		}
	}

	function formatChangeType(changeType: ChangeType): string {
		const mapping = {
			created: 'Created',
			updated: 'Updated',
			deleted: 'Deleted',
			ownership_transfer: 'Ownership Transferred',
			attendee_added: 'Attendee Added',
			attendee_removed: 'Attendee Removed'
		};

		return mapping[changeType] || changeType;
	}

	function formatFieldName(fieldName: string): string {
		// Convert snake_case to Title Case
		return fieldName
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) {
			return 'None';
		}

		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}

		if (typeof value === 'boolean') {
			return value ? 'Yes' : 'No';
		}

		// Try to parse as date
		const dateValue = new Date(value);
		if (!isNaN(dateValue.getTime()) && typeof value === 'string' && value.includes('T')) {
			return format(dateValue, 'PPP p');
		}

		return String(value);
	}

	function getChangeDescription(entry: HistoryEntry): string {
		const { changeType, fieldName, oldValue, newValue, changedBy } = entry;

		if (changeType === 'created') {
			return `${changedBy.name} created this event`;
		}

		if (changeType === 'deleted') {
			return `${changedBy.name} deleted this event`;
		}

		if (changeType === 'ownership_transfer') {
			return `${changedBy.name} transferred ownership`;
		}

		if (changeType === 'attendee_added') {
			return `${changedBy.name} added an attendee`;
		}

		if (changeType === 'attendee_removed') {
			return `${changedBy.name} removed an attendee`;
		}

		if (fieldName) {
			return `${changedBy.name} changed ${formatFieldName(fieldName)}`;
		}

		return `${changedBy.name} made a change`;
	}

	const sortedHistory = $derived(
		[...history].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
	);
</script>

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<History class="h-5 w-5" />
		<h3 class="font-semibold">
			Change History {#if history.length > 0}({history.length}){/if}
		</h3>
	</div>

	{#if sortedHistory.length === 0}
		<p class="text-center text-muted-foreground py-8">No change history available</p>
	{:else if variant === 'compact'}
		<div class="space-y-2">
			{#each sortedHistory as entry (entry.id)}
				<div class="border-l-2 pl-4 pb-2 border-muted">
					<div class="flex items-center gap-2">
						<Badge variant={getChangeColor(entry.changeType)}>
							{formatChangeType(entry.changeType)}
						</Badge>
						<span class="text-sm">{getChangeDescription(entry)}</span>
					</div>
					<p class="text-xs text-muted-foreground mt-1">
						{formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
					</p>
				</div>
			{/each}
		</div>
	{:else}
		<Accordion type="multiple" class="w-full">
			{#each sortedHistory as entry (entry.id)}
				{@const ChangeIcon = getChangeIcon(entry.changeType)}
				<AccordionItem value={entry.id}>
					<AccordionTrigger class="hover:no-underline">
						<div class="flex items-center gap-3 flex-1">
							<ChangeIcon class="h-4 w-4" />
							<div class="flex-1 text-left">
								<div class="font-medium">{getChangeDescription(entry)}</div>
								<div class="text-sm text-muted-foreground">
									{formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
								</div>
							</div>
							<Badge variant={getChangeColor(entry.changeType)}>
								{formatChangeType(entry.changeType)}
							</Badge>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div class="space-y-2 pt-2">
							<div class="grid grid-cols-2 gap-2 text-sm">
								<div>
									<span class="font-medium">Changed by:</span>
									<span class="ml-2">{entry.changedBy.name}</span>
								</div>
								<div>
									<span class="font-medium">Time:</span>
									<span class="ml-2">{format(new Date(entry.changedAt), 'PPP p')}</span>
								</div>
							</div>

							{#if entry.fieldName}
								<div class="mt-4">
									<div class="font-medium mb-2">{formatFieldName(entry.fieldName)}</div>
									<div class="grid grid-cols-2 gap-4">
										<div class="border rounded p-3">
											<div class="text-xs text-muted-foreground mb-1">Old Value</div>
											<div class="text-sm font-mono break-words">
												{formatValue(entry.oldValue)}
											</div>
										</div>
										<div class="border rounded p-3">
											<div class="text-xs text-muted-foreground mb-1">New Value</div>
											<div class="text-sm font-mono break-words">
												{formatValue(entry.newValue)}
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	{/if}
</div>
