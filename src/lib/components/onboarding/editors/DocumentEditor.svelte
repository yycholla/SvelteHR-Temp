<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Link } from '@lucide/svelte';

	interface Props {
		documentUrl: string;
		onChange: (value: string) => void;
	}

	let { documentUrl, onChange }: Props = $props();
</script>

<div class="space-y-6 max-w-3xl mx-auto py-8">
	<div
		class="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors"
	>
		<div class="bg-background p-4 rounded-full mb-4 shadow-sm">
			<FileText class="h-8 w-8 text-muted-foreground" />
		</div>
		<h3 class="text-lg font-medium mb-2">Document Configuration</h3>
		<p class="text-sm text-muted-foreground text-center max-w-md mb-6">
			Provide a URL to a document (PDF, Google Doc, etc.) that the employee must read.
		</p>

		<div class="w-full max-w-md flex gap-2">
			<div class="relative flex-1">
				<Link class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<Input
					value={documentUrl}
					oninput={(e) => onChange(e.currentTarget.value)}
					placeholder="https://example.com/document.pdf"
					class="pl-9"
				/>
			</div>
			<Button variant="outline">Browse</Button>
		</div>
	</div>

	{#if documentUrl}
		<div class="space-y-2">
			<Label>Preview</Label>
			<div class="aspect-video bg-muted rounded-lg border flex items-center justify-center">
				<p class="text-muted-foreground text-sm">Preview not available for external links</p>
			</div>
		</div>
	{/if}
</div>
