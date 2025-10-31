<!--
  ImageUploadWidget Component
  Feature: 027-we-need-to - Task T054

  Image upload with cropperjs integration for event images

  Features:
  - Drag-and-drop or click to upload
  - Aspect ratio validation (16:9 or 9:16 only)
  - 10MB file size limit
  - Client-side cropping with cropperjs
  - Image preview before upload
  - Format validation (JPEG, PNG, WebP)

  Props:
  - aspectRatio: '16:9' | '9:16' - Required aspect ratio
  - currentImageUrl?: string - Existing image URL
  - onImageSelected: (file: File) => void - Callback when valid image is selected
  - onImageRemoved?: () => void - Callback when image is removed
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { validateImageFile } from '$lib/utils/image-validation';
	import { Upload, X, Image as ImageIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	// Props with Svelte 5 runes
	let {
		aspectRatio,
		currentImageUrl = $bindable(),
		onImageSelected,
		onImageRemoved
	}: {
		aspectRatio: '16:9' | '9:16';
		currentImageUrl?: string;
		onImageSelected: (file: File) => void;
		onImageRemoved?: () => void;
	} = $props();

	// State
	let fileInput = $state<HTMLInputElement>();
	let dropZone = $state<HTMLDivElement>();
	let isDragging = $state(false);
	let isProcessing = $state(false);
	let previewUrl = $state<string | null>(null);
	let errors = $state<string[]>([]);
	let cropper: any = null;
	let cropperContainer = $state<HTMLDivElement>();
	let showCropper = $state(false);

	// Derived
	let hasImage = $derived(!!currentImageUrl || !!previewUrl);
	let displayUrl = $derived(previewUrl || currentImageUrl);

	// Handle file selection
	async function handleFileSelect(file: File) {
		isProcessing = true;
		errors = [];

		// Validate file
		const validation = await validateImageFile(file, aspectRatio);

		if (!validation.valid) {
			errors = validation.errors;
			isProcessing = false;
			return;
		}

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			previewUrl = e.target?.result as string;
			showCropper = true;
			initCropper();
		};
		reader.readAsDataURL(file);

		isProcessing = false;
	}

	// Initialize cropper
	async function initCropper() {
		if (!browser || !previewUrl) return;

		try {
			const Cropper = (await import('cropperjs')).default;

			// Wait for image to load
			await new Promise(resolve => setTimeout(resolve, 100));

			const img = cropperContainer?.querySelector('img');
			if (!img) return;

			const ratio = aspectRatio === '16:9' ? 16 / 9 : 9 / 16;

			cropper = new Cropper(img, {
				aspectRatio: ratio,
				viewMode: 1,
				dragMode: 'move',
				autoCropArea: 1,
				restore: false,
				guides: true,
				center: true,
				highlight: false,
				cropBoxMovable: true,
				cropBoxResizable: true,
				toggleDragModeOnDblclick: false
			});
		} catch (error) {
			console.error('Failed to initialize cropper:', error);
			errors = ['Failed to initialize image cropper'];
		}
	}

	// Handle crop and confirm
	async function handleCropConfirm() {
		if (!cropper) return;

		try {
			const canvas = cropper.getCroppedCanvas({
				maxWidth: 4096,
				maxHeight: 4096,
				imageSmoothingEnabled: true,
				imageSmoothingQuality: 'high'
			});

			// Convert canvas to blob
			canvas.toBlob((blob: Blob | null) => {
				if (!blob) {
					errors = ['Failed to process image'];
					return;
				}

				// Create File from blob
				const file = new File([blob], 'cropped-image.jpg', {
					type: 'image/jpeg',
					lastModified: Date.now()
				});

				// Update preview URL
				previewUrl = canvas.toDataURL('image/jpeg', 0.9);
				showCropper = false;

				// Destroy cropper
				cropper.destroy();
				cropper = null;

				// Notify parent
				onImageSelected(file);
			}, 'image/jpeg', 0.9);
		} catch (error) {
			console.error('Failed to crop image:', error);
			errors = ['Failed to crop image'];
		}
	}

	// Handle crop cancel
	function handleCropCancel() {
		if (cropper) {
			cropper.destroy();
			cropper = null;
		}
		showCropper = false;
		previewUrl = null;
	}

	// Handle input change
	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	// Handle drag events
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const file = e.dataTransfer?.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	// Handle remove
	function handleRemove() {
		previewUrl = null;
		currentImageUrl = undefined;

		if (fileInput) {
			fileInput.value = '';
		}

		onImageRemoved?.();
	}

	// Cleanup
	onDestroy(() => {
		if (cropper) {
			cropper.destroy();
		}
	});
</script>

<div class="image-upload-widget">
	{#if showCropper}
		<!-- Cropper Modal -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
			<Card.Root class="w-full max-w-4xl">
				<Card.Header>
					<Card.Title>Crop Image ({aspectRatio})</Card.Title>
					<Card.Description>
						Adjust the cropping area to match the {aspectRatio} aspect ratio
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div bind:this={cropperContainer} class="max-h-[60vh]">
						{#if previewUrl}
							<img src={previewUrl} alt="Crop preview" />
						{/if}
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2">
					<Button variant="outline" onclick={handleCropCancel}>
						Cancel
					</Button>
					<Button onclick={handleCropConfirm}>
						Confirm Crop
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	{:else if hasImage}
		<!-- Image Preview -->
		<Card.Root>
			<Card.Content class="p-4">
				<div class="relative">
					<img
						src={displayUrl}
						alt="Event preview"
						class="w-full rounded-lg object-cover"
						style="aspect-ratio: {aspectRatio.replace(':', '/')}"
					/>
					<Button
						size="icon"
						variant="destructive"
						class="absolute right-2 top-2"
						onclick={handleRemove}
					>
						<X class="h-4 w-4" />
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Upload Zone -->
		<div
			bind:this={dropZone}
			class="upload-zone"
			class:dragging={isDragging}
			ondragenter={handleDragEnter}
			ondragleave={handleDragLeave}
			ondragover={handleDragOver}
			ondrop={handleDrop}
			onclick={() => fileInput.click()}
			role="button"
			tabindex={0}
			onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
		>
			<div class="flex flex-col items-center justify-center gap-4 py-12">
				{#if isProcessing}
					<div class="animate-spin">
						<ImageIcon class="h-12 w-12 text-muted-foreground" />
					</div>
					<p class="text-sm text-muted-foreground">Processing image...</p>
				{:else}
					<Upload class="h-12 w-12 text-muted-foreground" />
					<div class="text-center">
						<p class="text-sm font-medium">
							Drag and drop an image, or click to browse
						</p>
						<p class="text-xs text-muted-foreground mt-1">
							JPEG, PNG, or WebP • Max 10MB • {aspectRatio} aspect ratio
						</p>
					</div>
				{/if}
			</div>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="hidden"
			onchange={handleInputChange}
		/>
	{/if}

	{#if errors.length > 0}
		<div class="mt-2 space-y-1">
			{#each errors as error}
				<p class="text-sm text-destructive">{error}</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	.upload-zone {
		border: 2px dashed hsl(var(--border));
		border-radius: var(--radius);
		cursor: pointer;
		transition: all 0.2s;
	}

	.upload-zone:hover {
		border-color: hsl(var(--primary));
		background-color: hsl(var(--accent));
	}

	.upload-zone.dragging {
		border-color: hsl(var(--primary));
		background-color: hsl(var(--accent));
		border-style: solid;
	}
</style>
