<script lang="ts">
	import { ChevronLeft, GraduationCap } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		trainingId: string;
		title: string;
	}

	const { trainingId, title }: Props = $props();
</script>

<div class="mb-8 flex items-center justify-between">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/trainings">
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Edit Training</h1>
			<p class="text-sm text-muted-foreground">Update training module details and settings.</p>
		</div>
	</div>
	<Button href={`/admin/trainings/${trainingId}/content`} variant="secondary">
		<GraduationCap class="mr-2 h-4 w-4" />
		Manage Content
	</Button>
</div>
