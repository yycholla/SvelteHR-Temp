<script lang="ts">
	import { ArrowLeft, FileText } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		module: { id: string; title: string };
	}

	const { module }: Props = $props();
</script>

<div class="mb-8 flex items-center justify-between">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/dashboard/admin/onboarding">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">{module.title}</h1>
			<p class="text-muted-foreground text-sm">Onboarding Module Details</p>
		</div>
	</div>
	<div class="flex gap-2">
		<Button variant="outline" href={`/dashboard/admin/onboarding/${module.id}/forms`}>
			<FileText class="mr-2 h-4 w-4" /> Manage Forms
		</Button>
		<Button variant="outline" href={`/dashboard/admin/onboarding/${module.id}/content`}>
			<FileText class="mr-2 h-4 w-4" /> Edit Content (Legacy)
		</Button>
	</div>
</div>
