<script lang="ts">
	import { Image as ImageIcon } from '@lucide/svelte';
	import ImageUploadWidget from '../ImageUploadWidget.svelte';

	interface Props {
		imageAspectRatio: '16:9' | '9:16';
		isSubmitting: boolean;
		onImageSelected: (file: File) => void;
		onImageRemoved: () => void;
	}

	let {
		imageAspectRatio = $bindable(),
		isSubmitting,
		onImageSelected,
		onImageRemoved
	}: Props = $props();
</script>

<div>
	<label class="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
		<ImageIcon class="h-4 w-4" />
		Event Image (Optional)
	</label>

	<div class="mb-4">
		<span class="text-sm text-muted-foreground mr-4">Aspect Ratio:</span>
		<label class="inline-flex items-center mr-4">
			<input
				type="radio"
				bind:group={imageAspectRatio}
				value="16:9"
				disabled={isSubmitting}
				class="h-4 w-4 text-primary focus:ring-ring"
			/>
			<span class="ml-2 text-sm">16:9 (Horizontal)</span>
		</label>
		<label class="inline-flex items-center">
			<input
				type="radio"
				bind:group={imageAspectRatio}
				value="9:16"
				disabled={isSubmitting}
				class="h-4 w-4 text-primary focus:ring-ring"
			/>
			<span class="ml-2 text-sm">9:16 (Vertical)</span>
		</label>
	</div>

	<ImageUploadWidget aspectRatio={imageAspectRatio} {onImageSelected} {onImageRemoved} />
</div>
