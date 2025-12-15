<script lang="ts">
	interface Props {
		hasCapacityLimit: boolean;
		capacityLimit: number;
		hasWaitlist: boolean;
		isSubmitting: boolean;
	}

	let {
		hasCapacityLimit = $bindable(),
		capacityLimit = $bindable(),
		hasWaitlist = $bindable(),
		isSubmitting
	}: Props = $props();
</script>

<div class="rounded-lg border bg-muted/50 p-4 space-y-4">
	<label class="flex items-center cursor-pointer">
		<input
			type="checkbox"
			bind:checked={hasCapacityLimit}
			disabled={isSubmitting}
			class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
		<span class="ml-2 text-sm font-medium text-foreground"> Set capacity limit </span>
	</label>

	{#if hasCapacityLimit}
		<div class="space-y-4">
			<div>
				<label for="capacityLimit" class="block text-sm font-medium text-foreground mb-2">
					Maximum Attendees
				</label>
				<input
					type="number"
					id="capacityLimit"
					name="capacityLimit"
					bind:value={capacityLimit}
					min="1"
					max="1000"
					required={hasCapacityLimit}
					disabled={isSubmitting}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>

			<label class="flex items-center cursor-pointer">
				<input
					type="checkbox"
					bind:checked={hasWaitlist}
					disabled={isSubmitting}
					class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<span class="ml-2 text-sm font-medium text-foreground"> Enable waitlist when full </span>
			</label>
		</div>
	{/if}
</div>
