<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Eye } from '@lucide/svelte';

	interface Props {
		previewMode: boolean;
		onTogglePreview: () => void;
	}

	let { previewMode, onTogglePreview }: Props = $props();
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
			{previewMode ? 'Form Preview' : 'Form Builder'}
		</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			{previewMode ? 'Preview how employees will see this form' : 'Build and manage form blocks'}
		</p>
	</div>
	<div class="flex gap-2">
		<Button variant="outline" onclick={onTogglePreview}>
			<Eye class="w-4 h-4 mr-2" />
			{previewMode ? 'Exit Preview' : 'Preview'}
		</Button>
	</div>
</div>
