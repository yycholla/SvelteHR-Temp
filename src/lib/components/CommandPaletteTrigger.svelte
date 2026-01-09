<script lang="ts">
	/**
	 * Command Palette Trigger Button
	 *
	 * Visual indicator that the command palette exists and how to access it.
	 * Shows keyboard shortcut and provides a clickable trigger.
	 */

	import { browser } from '$app/environment';
	import { Search } from '@lucide/svelte';

	function triggerCommandPalette() {
		if (!browser) return;

		// Dispatch Cmd+K / Ctrl+K event to trigger the command palette
		const event = new KeyboardEvent('keydown', {
			key: 'k',
			code: 'KeyK',
			metaKey: true, // Cmd on Mac
			ctrlKey: true, // Ctrl on Windows/Linux
			bubbles: true,
			cancelable: true
		});

		window.dispatchEvent(event);
	}

	// Detect OS for correct keyboard shortcut display
	const isMac = browser && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const shortcutKey = isMac ? '⌘' : 'Ctrl';
</script>

<button
	type="button"
	onclick={triggerCommandPalette}
	class="command-palette-trigger"
	title="Search commands ({shortcutKey}+K)"
	aria-label="Open command palette ({shortcutKey}+K)"
>
	<Search class="h-4 w-4" />
</button>

<style>
	.command-palette-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
		color: hsl(var(--sidebar-foreground));
	}

	.command-palette-trigger:hover {
		background: hsl(var(--sidebar-accent));
		color: hsl(var(--sidebar-accent-foreground));
	}
</style>
