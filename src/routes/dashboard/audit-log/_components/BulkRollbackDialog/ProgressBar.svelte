<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';

	interface ProgressBarProps {
		percentage: number;
		completed: number;
		total: number;
		failed: number;
	}

	let { percentage, completed, total, failed }: ProgressBarProps = $props();
</script>

<div class="progress-bar-container">
	<div class="flex justify-between text-sm mb-2">
		<span>Progress: {percentage}%</span>
		<span>{completed} of {total} completed{failed > 0 ? `, ${failed} failed` : ''}</span>
	</div>
	<Progress value={percentage} class="h-2" />
</div>
