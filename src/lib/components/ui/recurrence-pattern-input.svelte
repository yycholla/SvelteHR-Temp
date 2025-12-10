<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Calendar } from '$lib/components/ui/calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { CalendarIcon, X } from '@lucide/svelte';
	import { DateFormatter, getLocalTimeZone } from '@internationalized/date';
	import { cn } from '$lib/utils';
	import { generateRRule, validate5YearLimit } from '$lib/utils/rrule';

	interface RecurrencePattern {
		frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
		interval: number;
		endDate: Date | null;
		daysOfWeek?: number[];
		rruleString?: string;
	}

	let {
		pattern = $bindable<RecurrencePattern | null>(null),
		startDate,
		disabled = false
	}: {
		pattern: RecurrencePattern | null;
		startDate: Date;
		disabled?: boolean;
	} = $props();

	let isRecurring = $state(!!pattern);
	let frequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>(pattern?.frequency || 'weekly');
	let interval = $state(pattern?.interval || 1);
	let endDate = $state<string | undefined>(
		pattern?.endDate ? pattern.endDate.toISOString() : undefined
	);
	let selectedDays = $state<number[]>(pattern?.daysOfWeek || []);
	let endDateError = $state<string | null>(null);

	const df = new DateFormatter('en-US', { dateStyle: 'long' });

	const frequencyOptions = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	const daysOfWeek = [
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' },
		{ value: 0, label: 'Sun' }
	];

	function toggleDay(day: number) {
		if (selectedDays.includes(day)) {
			selectedDays = selectedDays.filter((d) => d !== day);
		} else {
			selectedDays = [...selectedDays, day];
		}
		updatePattern();
	}

	function validateEndDate(date: Date | null): boolean {
		if (!date) return true;

		const isValid = validate5YearLimit(startDate, date);
		if (!isValid) {
			endDateError = 'Recurrence end date cannot exceed 5 years from start date';
		} else {
			endDateError = null;
		}
		return isValid;
	}

	function updatePattern() {
		if (!isRecurring) {
			pattern = null;
			return;
		}

		if (!endDate) {
			return;
		}

		const endDateObj = new Date(endDate);

		if (!validateEndDate(endDateObj)) {
			return;
		}

		const recurrencePattern: RecurrencePattern = {
			frequency,
			interval,
			endDate: endDateObj,
			daysOfWeek: frequency === 'weekly' ? selectedDays : undefined
		};

		// Generate RRULE string
		try {
			const rruleString = generateRRule(recurrencePattern, startDate);
			recurrencePattern.rruleString = rruleString;
			pattern = recurrencePattern;
		} catch (error) {
			console.error('Error generating RRULE:', error);
		}
	}

	// Update pattern when relevant values change
	$effect(() => {
		if (isRecurring && endDate) {
			updatePattern();
		}
	});

	// Clear pattern when recurring is disabled
	$effect(() => {
		if (!isRecurring) {
			pattern = null;
		}
	});
</script>

<div class="space-y-4 p-4 border rounded-lg {disabled ? 'opacity-50 pointer-events-none' : ''}">
	<div class="flex items-center justify-between">
		<div class="space-y-0.5">
			<Label class="text-base">Recurring Training</Label>
			<p class="text-xs text-muted-foreground">Schedule this training to repeat automatically</p>
		</div>
		<Switch bind:checked={isRecurring} {disabled} />
	</div>

	{#if isRecurring}
		<div class="space-y-4 pt-2">
			<!-- Frequency and Interval -->
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<Label>Repeat Every</Label>
					<Input type="number" min="1" max="365" bind:value={interval} {disabled} class="w-full" />
				</div>

				<div class="space-y-2">
					<Label>Frequency</Label>
					<Select.Root bind:value={frequency} {disabled}>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{#each frequencyOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Days of Week (for weekly recurrence) -->
			{#if frequency === 'weekly'}
				<div class="space-y-2">
					<Label>Repeat On</Label>
					<div class="flex gap-2 flex-wrap">
						{#each daysOfWeek as day}
							<Button
								type="button"
								variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
								size="sm"
								class="w-12"
								onclick={() => toggleDay(day.value)}
								{disabled}
							>
								{day.label}
							</Button>
						{/each}
					</div>
					{#if selectedDays.length === 0}
						<p class="text-xs text-destructive">Please select at least one day</p>
					{/if}
				</div>
			{/if}

			<!-- End Date -->
			<div class="space-y-2">
				<Label>Ends On <span class="text-destructive">*</span></Label>
				<Popover>
					<PopoverTrigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-left font-normal',
									!endDate && 'text-muted-foreground'
								)}
								{...props}
								{disabled}
							>
								<CalendarIcon class="mr-2 h-4 w-4" />
								{endDate ? df.format(new Date(endDate)) : 'Pick an end date'}
							</Button>
						{/snippet}
					</PopoverTrigger>
					<PopoverContent class="w-auto p-0">
						<Calendar
							type="single"
							value={endDate ? new Date(endDate) : undefined}
							onValueChange={(v) => {
								if (v) {
									const dateObj = v.toDate(getLocalTimeZone());
									dateObj.setHours(23, 59, 59, 999);
									endDate = dateObj.toISOString();
								} else {
									endDate = undefined;
								}
							}}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
				{#if endDateError}
					<p class="text-xs text-destructive">{endDateError}</p>
				{:else}
					<p class="text-xs text-muted-foreground">Maximum 5 years from start date</p>
				{/if}
			</div>

			<!-- RRULE Preview -->
			{#if pattern?.rruleString}
				<div class="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
					RRULE: {pattern.rruleString}
				</div>
			{/if}
		</div>
	{/if}
</div>
