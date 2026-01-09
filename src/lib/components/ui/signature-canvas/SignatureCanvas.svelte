<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	/**
	 * SignatureCanvas Component - HTML5 Canvas-based signature capture
	 *
	 * Features:
	 * - Mouse and touch support
	 * - Clear/reset functionality
	 * - Base64 PNG export
	 * - Responsive scaling
	 * - Configurable pen color and width
	 */

	// Props
	const {
		width = 400,
		height = 150,
		penColor = '#000000',
		penWidth = 2,
		backgroundColor = '#ffffff',
		placeholder = 'Sign here',
		required = false,
		disabled = false,
		class: className,
		onSignatureChange
	}: {
		width?: number;
		height?: number;
		penColor?: string;
		penWidth?: number;
		backgroundColor?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		onSignatureChange?: (signature: string | null) => void;
	} = $props();

	// State
	let canvas = $state<HTMLCanvasElement | null>(null);
	let ctx = $state<CanvasRenderingContext2D | null>(null);
	let isDrawing = $state(false);
	let hasSignature = $state(false);
	let lastX = $state(0);
	let lastY = $state(0);

	// Derived
	const isEmpty = $derived(!hasSignature);

	// Initialize canvas on mount
	onMount(() => {
		if (!canvas) return;

		const context = canvas.getContext('2d', { willReadFrequently: false });
		if (!context) return;

		ctx = context;

		// Set canvas dimensions
		canvas.width = width;
		canvas.height = height;

		// Set background
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, width, height);

		// Set pen style
		ctx.strokeStyle = penColor;
		ctx.lineWidth = penWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	});

	// Get coordinates relative to canvas
	function getCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
		if (!canvas) return null;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		let clientX: number;
		let clientY: number;

		if (event instanceof MouseEvent) {
			clientX = event.clientX;
			clientY = event.clientY;
		} else if (event instanceof TouchEvent) {
			if (event.touches.length === 0) return null;
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			return null;
		}

		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY
		};
	}

	// Start drawing
	function startDrawing(event: MouseEvent | TouchEvent) {
		if (disabled) return;

		event.preventDefault();

		const coords = getCoordinates(event);
		if (!coords) return;

		isDrawing = true;
		lastX = coords.x;
		lastY = coords.y;

		// Start a new path
		if (ctx) {
			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
		}
	}

	// Draw line
	function draw(event: MouseEvent | TouchEvent) {
		if (!isDrawing || disabled || !ctx) return;

		event.preventDefault();

		const coords = getCoordinates(event);
		if (!coords) return;

		// Draw line from last position to current position
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(coords.x, coords.y);
		ctx.stroke();

		lastX = coords.x;
		lastY = coords.y;

		hasSignature = true;
	}

	// Stop drawing
	function stopDrawing() {
		if (!isDrawing) return;

		isDrawing = false;

		// Export signature
		if (hasSignature && canvas) {
			const signatureData = canvas.toDataURL('image/png');
			onSignatureChange?.(signatureData);
		}
	}

	// Clear signature
	export function clear() {
		if (!canvas || !ctx) return;

		// Clear canvas
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, width, height);

		// Reset state
		hasSignature = false;
		isDrawing = false;

		// Notify parent
		onSignatureChange?.(null);
	}

	// Get signature as base64 PNG
	export function getSignature(): string | null {
		if (!canvas || !hasSignature) return null;
		return canvas.toDataURL('image/png');
	}

	// Check if signature is empty
	export function isSignatureEmpty(): boolean {
		return isEmpty;
	}

	// Cleanup
	onDestroy(() => {
		// Remove event listeners
		if (canvas) {
			canvas.removeEventListener('mousedown', startDrawing);
			canvas.removeEventListener('mousemove', draw);
			canvas.removeEventListener('mouseup', stopDrawing);
			canvas.removeEventListener('mouseleave', stopDrawing);
			canvas.removeEventListener('touchstart', startDrawing);
			canvas.removeEventListener('touchmove', draw);
			canvas.removeEventListener('touchend', stopDrawing);
			canvas.removeEventListener('touchcancel', stopDrawing);
		}
	});
</script>

<Card class={cn('relative p-4', className)}>
	<div class="space-y-4">
		<!-- Canvas container -->
		<div class="relative">
			<canvas
				bind:this={canvas}
				class={cn(
					'border-2 border-gray-300 rounded-lg cursor-crosshair',
					'touch-none select-none',
					disabled && 'opacity-50 cursor-not-allowed',
					required && isEmpty && 'border-red-500'
				)}
				style="max-width: 100%; height: auto;"
				onmousedown={startDrawing}
				onmousemove={draw}
				onmouseup={stopDrawing}
				onmouseleave={stopDrawing}
				ontouchstart={startDrawing}
				ontouchmove={draw}
				ontouchend={stopDrawing}
				ontouchcancel={stopDrawing}
			></canvas>

			<!-- Placeholder text (only shown when empty) -->
			{#if isEmpty && !isDrawing}
				<div
					class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
				>
					<p class="text-gray-400 text-sm italic">{placeholder}</p>
				</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-between">
			<div class="text-xs text-gray-500">
				{#if isEmpty}
					{required ? 'Signature required *' : 'No signature'}
				{:else}
					Signature captured
				{/if}
			</div>

			<Button
				variant="outline"
				size="sm"
				onclick={clear}
				disabled={disabled || isEmpty}
				class="text-xs"
			>
				Clear
			</Button>
		</div>
	</div>
</Card>

<style>
	canvas {
		display: block;
	}
</style>
