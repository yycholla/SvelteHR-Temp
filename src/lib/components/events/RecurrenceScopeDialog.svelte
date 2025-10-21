<script lang="ts">
	/**
	 * RecurrenceScopeDialog Component
	 * Feature: 025-events-flesh-out
	 *
	 * Dialog for selecting scope when modifying recurring events:
	 * - This event only
	 * - This and future events
	 * - All events in the series
	 */

	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		open: boolean;
		eventTitle: string;
		action: 'update' | 'delete' | 'rsvp';
		onConfirm: (scope: 'this_event' | 'this_and_future' | 'all_events') => void;
		onCancel: () => void;
	}

	let { open = $bindable(false), eventTitle, action, onConfirm, onCancel }: Props = $props();

	let selectedScope = $state<'this_event' | 'this_and_future' | 'all_events'>('this_event');

	function handleConfirm() {
		onConfirm(selectedScope);
		open = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
	}

	const actionText = $derived(() => {
		switch (action) {
			case 'update':
				return 'update';
			case 'delete':
				return 'delete';
			case 'rsvp':
				return 'change RSVP for';
			default:
				return 'modify';
		}
	});
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>
				{action === 'update' ? 'Update' : action === 'delete' ? 'Delete' : 'Change RSVP for'} Recurring Event
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<p class="text-sm text-muted-foreground">
				"{eventTitle}" is a recurring event. Which occurrences would you like to {actionText()}?
			</p>

			<RadioGroup bind:value={selectedScope} class="space-y-3">
				<div class="flex items-start space-x-2">
					<RadioGroupItem value="this_event" id="this_event" />
					<div class="flex-1">
						<Label for="this_event" class="cursor-pointer font-medium">
							This event only
						</Label>
						<p class="text-sm text-muted-foreground mt-1">
							Only {actionText()} this specific occurrence
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-2">
					<RadioGroupItem value="this_and_future" id="this_and_future" />
					<div class="flex-1">
						<Label for="this_and_future" class="cursor-pointer font-medium">
							This and future events
						</Label>
						<p class="text-sm text-muted-foreground mt-1">
							{actionText().charAt(0).toUpperCase() + actionText().slice(1)} this occurrence and all future occurrences
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-2">
					<RadioGroupItem value="all_events" id="all_events" />
					<div class="flex-1">
						<Label for="all_events" class="cursor-pointer font-medium">
							All events in the series
						</Label>
						<p class="text-sm text-muted-foreground mt-1">
							{actionText().charAt(0).toUpperCase() + actionText().slice(1)} all occurrences, including past events
						</p>
					</div>
				</div>
			</RadioGroup>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={handleCancel}>
				Cancel
			</Button>
			<Button onclick={handleConfirm}>
				Confirm
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
