<script lang="ts">
	interface Props {
		startTime: string;
		endTime: string;
		isAllDay: boolean;
		isSubmitting: boolean;
		minDate?: string;
		onAllDayToggle: () => void;
	}

	let {
		startTime = $bindable(),
		endTime = $bindable(),
		isAllDay = $bindable(),
		isSubmitting,
		minDate,
		onAllDayToggle
	}: Props = $props();
</script>

<!-- Date and Time Row -->
<div class="grid gap-4 sm:grid-cols-2">
	<!-- Start Time -->
	<div>
		<label for="startTime" class="block text-sm font-medium text-foreground mb-2">
			Start Time <span class="text-destructive">*</span>
		</label>
		<input
			type="datetime-local"
			id="startTime"
			name="startTime"
			bind:value={startTime}
			required
			min={minDate}
			disabled={isSubmitting}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>

	<!-- End Time -->
	<div>
		<label for="endTime" class="block text-sm font-medium text-foreground mb-2">
			End Time <span class="text-destructive">*</span>
		</label>
		<input
			type="datetime-local"
			id="endTime"
			name="endTime"
			bind:value={endTime}
			required
			min={startTime}
			disabled={isSubmitting}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>
</div>

<!-- All Day Checkbox -->
<div>
	<label class="flex items-center cursor-pointer">
		<input
			type="checkbox"
			name="isAllDay"
			bind:checked={isAllDay}
			onchange={onAllDayToggle}
			disabled={isSubmitting}
			class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
		<span class="ml-2 text-sm text-foreground">All-day event</span>
	</label>
</div>
