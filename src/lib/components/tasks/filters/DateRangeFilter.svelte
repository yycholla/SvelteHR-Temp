<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		dueDateStart: string | null;
		dueDateEnd: string | null;
		onUpdateDateRange: (start: string | null, end: string | null) => void;
	}

	let { dueDateStart, dueDateEnd, onUpdateDateRange }: Props = $props();
</script>

<div class="space-y-2">
	<Label>Due Date Range</Label>
	<div class="grid grid-cols-2 gap-2">
		<div class="space-y-1.5">
			<Label for="startDate" class="text-xs text-muted-foreground">From</Label>
			<Input
				id="startDate"
				type="date"
				value={dueDateStart || ''}
				oninput={(e) => onUpdateDateRange(e.currentTarget.value || null, dueDateEnd)}
			/>
		</div>
		<div class="space-y-1.5">
			<Label for="endDate" class="text-xs text-muted-foreground">To</Label>
			<Input
				id="endDate"
				type="date"
				value={dueDateEnd || ''}
				oninput={(e) => onUpdateDateRange(dueDateStart, e.currentTarget.value || null)}
			/>
		</div>
	</div>
</div>
