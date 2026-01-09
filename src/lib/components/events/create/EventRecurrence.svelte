<script lang="ts">
	import { Repeat } from '@lucide/svelte';
	import type { DayOfWeek } from '$lib/types/events';

	interface Props {
		isRecurring: boolean;
		recurrenceFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
		recurrenceInterval: number;
		recurrenceDaysOfWeek: DayOfWeek[];
		recurrenceEndDate: string;
		isSubmitting: boolean;
		startTime: string;
	}

	let {
		isRecurring = $bindable(),
		recurrenceFrequency = $bindable(),
		recurrenceInterval = $bindable(),
		recurrenceDaysOfWeek = $bindable(),
		recurrenceEndDate = $bindable(),
		isSubmitting,
		startTime
	}: Props = $props();

	const WEEKDAYS: Array<{ value: DayOfWeek; label: string }> = [
		{ value: 0 as DayOfWeek, label: 'Sun' },
		{ value: 1 as DayOfWeek, label: 'Mon' },
		{ value: 2 as DayOfWeek, label: 'Tue' },
		{ value: 3 as DayOfWeek, label: 'Wed' },
		{ value: 4 as DayOfWeek, label: 'Thu' },
		{ value: 5 as DayOfWeek, label: 'Fri' },
		{ value: 6 as DayOfWeek, label: 'Sat' }
	];

	function toggleWeekday(day: DayOfWeek) {
		if (recurrenceDaysOfWeek.includes(day)) {
			recurrenceDaysOfWeek = recurrenceDaysOfWeek.filter((d) => d !== day);
		} else {
			recurrenceDaysOfWeek = [...recurrenceDaysOfWeek, day].sort() as DayOfWeek[];
		}
	}
</script>

<div class="rounded-lg border bg-muted/50 p-4">
	<label class="flex items-center cursor-pointer mb-3">
		<input
			type="checkbox"
			bind:checked={isRecurring}
			disabled={isSubmitting}
			class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
		<span class="ml-2 text-sm font-medium text-foreground flex items-center gap-2">
			<Repeat class="h-4 w-4" />
			Make this a recurring event
		</span>
	</label>

	{#if isRecurring}
		<div class="space-y-4 mt-4">
			<!-- Recurrence Pattern -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="recurrenceFrequency" class="block text-sm font-medium text-foreground mb-2">
						Frequency <span class="text-destructive">*</span>
					</label>
					<select
						id="recurrenceFrequency"
						name="recurrenceFrequency"
						bind:value={recurrenceFrequency}
						required={isRecurring}
						disabled={isSubmitting}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
						<option value="yearly">Yearly</option>
					</select>
				</div>

				<div>
					<label for="recurrenceInterval" class="block text-sm font-medium text-foreground mb-2">
						Every
					</label>
					<input
						type="number"
						id="recurrenceInterval"
						name="recurrenceInterval"
						bind:value={recurrenceInterval}
						min="1"
						max="52"
						required={isRecurring}
						disabled={isSubmitting}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>
			</div>

			<!-- Weekly: Day Selection -->
			{#if recurrenceFrequency === 'weekly'}
				<div>
					<div class="block text-sm font-medium text-foreground mb-2">
						Repeat on <span class="text-destructive">*</span>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each WEEKDAYS as day (day.value)}
							<button
								type="button"
								onclick={() => toggleWeekday(day.value)}
								disabled={isSubmitting}
								class="px-3 py-1 rounded-md text-sm font-medium transition-colors {recurrenceDaysOfWeek.includes(
									day.value
								)
									? 'bg-primary text-primary-foreground'
									: 'bg-background border border-input text-foreground hover:bg-accent'} disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{day.label}
							</button>
						{/each}
					</div>
					<input
						type="hidden"
						name="recurrenceDaysOfWeek"
						value={JSON.stringify(recurrenceDaysOfWeek)}
					/>
				</div>
			{/if}

			<!-- End Date -->
			<div>
				<label for="recurrenceEndDate" class="block text-sm font-medium text-foreground mb-2">
					End Date <span class="text-destructive">*</span>
				</label>
				<input
					type="date"
					id="recurrenceEndDate"
					name="recurrenceEndDate"
					bind:value={recurrenceEndDate}
					min={startTime?.slice(0, 10)}
					required={isRecurring}
					disabled={isSubmitting}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<p class="mt-1 text-xs text-muted-foreground">Maximum 5 years from start date</p>
			</div>
		</div>
	{/if}
</div>
