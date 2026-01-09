<script lang="ts">
	import { Calendar, Clock } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	interface Props {
		dueDate: string;
		reminderTime: string;
		selectedReminderTime: any;
		reminderTimeOptions: any[];
		fieldErrors: Record<string, string>;
	}

	let {
		dueDate = $bindable(),
		reminderTime = $bindable(),
		selectedReminderTime,
		reminderTimeOptions,
		fieldErrors
	}: Props = $props();
</script>

<div class="space-y-4 rounded-lg border bg-card p-6">
	<h3 class="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
		<Clock class="h-4 w-4" />
		Due Date & Reminders
	</h3>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Due Date -->
		<div class="space-y-2">
			<Label for="dueDate">Due Date</Label>
			<div class="relative">
				<Input
					id="dueDate"
					type="date"
					bind:value={dueDate}
					class={fieldErrors.dueDate ? 'border-destructive' : ''}
				/>
				<Calendar
					class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
			</div>
			{#if fieldErrors.dueDate}
				<p class="text-sm text-destructive">{fieldErrors.dueDate}</p>
			{/if}
		</div>

		<!-- Reminder Time -->
		{#if dueDate}
			<div class="space-y-2">
				<Label for="reminderTime">Reminder Before Due Date</Label>
				<Select.Root type="single" bind:value={reminderTime}>
					<Select.Trigger id="reminderTime">
						{selectedReminderTime?.label ?? 'Select reminder time'}
					</Select.Trigger>
					<Select.Content>
						{#each reminderTimeOptions as reminder}
							<Select.Item value={reminder.value} label={reminder.label}
								>{reminder.label}</Select.Item
							>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">You'll be notified before the task is due</p>
			</div>
		{/if}
	</div>
</div>
