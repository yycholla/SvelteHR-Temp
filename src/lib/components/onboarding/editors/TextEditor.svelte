<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		textContent: string;
		onChange: (value: string) => void;
	}

	let { textContent, onChange }: Props = $props();
</script>

<div class="space-y-4 max-w-3xl mx-auto py-8">
	<div class="space-y-2">
		<Label>Content</Label>
		<Textarea
			value={textContent}
			oninput={(e) => onChange(e.currentTarget.value)}
			placeholder="Enter the instructional text or content here..."
			class="min-h-[400px] font-mono text-sm resize-none p-6 shadow-sm"
		/>
		<p class="text-xs text-muted-foreground">Markdown is supported for formatting.</p>
	</div>
</div>
