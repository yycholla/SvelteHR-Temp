<script lang="ts">
	interface Props {
		isSubmitting: boolean;
	}

	const { isSubmitting }: Props = $props();
</script>

<!-- Title -->
<div>
	<label for="title" class="block text-sm font-medium text-foreground mb-2">
		Event Title <span class="text-destructive">*</span>
	</label>
	<input
		type="text"
		id="title"
		name="title"
		required
		maxlength="200"
		disabled={isSubmitting}
		class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		placeholder="Enter event title"
	/>
</div>

<!-- Description -->
<div>
	<label for="description" class="block text-sm font-medium text-foreground mb-2">
		Description
	</label>
	<textarea
		id="description"
		name="description"
		rows="4"
		maxlength="5000"
		disabled={isSubmitting}
		class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		placeholder="Enter event description"
	></textarea>
</div>

<!-- Location -->
<div>
	<label for="location" class="block text-sm font-medium text-foreground mb-2"> Location </label>
	<input
		type="text"
		id="location"
		name="location"
		disabled={isSubmitting}
		class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		placeholder="Enter event location"
	/>
</div>
