<script lang="ts">
	import * as Command from "./index.js";
	import { Calendar, Mail, Smile, Settings, User, Rocket } from "lucide-svelte";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		placeholder = "Type a command or search...",
		value = $bindable(''),
		onValueChange,
		...restProps
	} = $props();
</script>

<div class="relative">
	<Command.Root class={cn("bg-transparent border-0 shadow-none", className)} bind:value {onValueChange} {...restProps}>
		<!-- Search Input Bubble - Fixed Position -->
		<div class="glass-input-bubble-fixed">
			<Command.Input {placeholder} class="glass-input-separated" />
		</div>
		
		<!-- Results Bubble - Positioned Below -->
		<div class="glass-results-bubble-positioned animate-slide-in">
			<Command.List class="glass-list-separated">
				<Command.Empty class="glass-empty">No results found.</Command.Empty>
				<Command.Group heading="Suggestions" class="glass-group">
					<Command.Item value="calendar" class="glass-item">
						<Calendar class="mr-3 h-4 w-4" />
						<span>Calendar</span>
					</Command.Item>
					<Command.Item value="search-emoji" class="glass-item">
						<Smile class="mr-3 h-4 w-4" />
						<span>Search Emoji</span>
					</Command.Item>
					<Command.Item value="launch" class="glass-item">
						<Rocket class="mr-3 h-4 w-4" />
						<span>Launch</span>
					</Command.Item>
				</Command.Group>
				<Command.Separator class="glass-separator" />
				<Command.Group heading="Settings" class="glass-group">
					<Command.Item value="profile" class="glass-item">
						<User class="mr-3 h-4 w-4" />
						<span>Profile</span>
						<Command.Shortcut class="glass-shortcut">⌘P</Command.Shortcut>
					</Command.Item>
					<Command.Item value="mail" class="glass-item">
						<Mail class="mr-3 h-4 w-4" />
						<span>Mail</span>
						<Command.Shortcut class="glass-shortcut">⌘B</Command.Shortcut>
					</Command.Item>
					<Command.Item value="settings" class="glass-item">
						<Settings class="mr-3 h-4 w-4" />
						<span>Settings</span>
						<Command.Shortcut class="glass-shortcut">⌘S</Command.Shortcut>
					</Command.Item>
				</Command.Group>
			</Command.List>
		</div>
	</Command.Root>
</div>

<style>
	/* Fixed Position Glass Input Bubble */
	.glass-input-bubble-fixed {
		background: rgba(255, 255, 255, 0.15) !important;
		backdrop-filter: blur(12px) !important;
		border: 1px solid rgba(255, 255, 255, 0.2) !important;
		border-radius: 1.5rem !important;
		padding: 0.75rem 1.5rem !important;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
		position: relative !important;
		z-index: 10 !important;
	}

	/* Remove default border from command input wrapper */
	:global(.glass-input-bubble-fixed [data-slot="command-input-wrapper"]) {
		border: none !important;
		border-bottom: none !important;
		padding: 0 !important;
		height: auto !important;
		background: transparent !important;
		gap: 0 !important;
	}

	/* Hide the default search icon */
	:global(.glass-input-bubble-fixed [data-slot="command-input-wrapper"] svg) {
		display: none !important;
	}

	:global(.glass-input-separated) {
		background: transparent !important;
		border: none !important;
		border-bottom: none !important;
		border-radius: 0 !important;
		padding: 0 !important;
		margin: 0 !important;
		font-size: 1rem !important;
		color: white !important;
		outline: none !important;
		box-shadow: none !important;
		width: 100% !important;
		text-decoration: none !important;
	}

	:global(.glass-input-separated:focus) {
		border: none !important;
		border-bottom: none !important;
		box-shadow: none !important;
		outline: none !important;
		color: white !important;
	}

	:global(.glass-input-separated::placeholder) {
		color: rgba(255, 255, 255, 0.8) !important;
	}

	/* Positioned Glass Results Bubble */
	.glass-results-bubble-positioned {
		background: rgba(255, 255, 255, 0.15) !important;
		backdrop-filter: blur(12px) !important;
		border: 1px solid rgba(255, 255, 255, 0.2) !important;
		border-radius: 1.5rem !important;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
		overflow: hidden !important;
		position: absolute !important;
		top: calc(100% + 1rem) !important;
		left: 0 !important;
		right: 0 !important;
		max-height: 400px !important;
	}

	/* Glass List */
	:global(.glass-list-separated) {
		background: transparent !important;
		border: none !important;
		padding: 0.5rem !important;
		max-height: 350px !important;
		overflow-y: auto !important;
	}

	/* Glass Groups */
	:global(.glass-group) {
		margin-bottom: 0.5rem !important;
	}

	:global(.glass-group [data-slot="command-group-heading"]) {
		color: white !important;
		font-size: 0.75rem !important;
		font-weight: 600 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.05em !important;
		padding: 0.5rem 1rem 0.25rem 1rem !important;
		margin: 0 !important;
	}

	/* Glass Items */
	:global(.glass-item) {
		display: flex !important;
		align-items: center !important;
		padding: 0.75rem 1rem !important;
		margin: 0.125rem 0.5rem !important;
		border-radius: 1rem !important;
		transition: all 0.2s ease-out !important;
		cursor: pointer !important;
		color: white !important;
		background: transparent !important;
		border: none !important;
	}

	:global(.glass-item:hover),
	:global(.glass-item[data-highlighted="true"]) {
		background: rgba(255, 255, 255, 0.15) !important;
		backdrop-filter: blur(8px) !important;
		color: white !important;
		transform: translateY(-1px) !important;
		box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1) !important;
	}

	/* Ensure icons are white */
	:global(.glass-item svg) {
		color: white !important;
	}

	/* Glass Shortcuts */
	:global(.glass-shortcut) {
		margin-left: auto !important;
		background: rgba(255, 255, 255, 0.1) !important;
		color: white !important;
		border: 1px solid rgba(255, 255, 255, 0.2) !important;
		border-radius: 0.375rem !important;
		padding: 0.125rem 0.375rem !important;
		font-size: 0.75rem !important;
		font-weight: 500 !important;
	}

	/* Glass Separator */
	:global(.glass-separator) {
		background: rgba(255, 255, 255, 0.15) !important;
		height: 1px !important;
		margin: 0.5rem 1rem !important;
		border: none !important;
	}

	/* Glass Empty State */
	:global(.glass-empty) {
		padding: 2rem 1rem !important;
		text-align: center !important;
		color: white !important;
		font-size: 0.875rem !important;
	}

	/* Override any default bits-ui styling */
	:global([data-bits-command-root]) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		margin: 0 !important;
		padding: 0 !important;
	}

	/* Slide animation */
	.animate-slide-in {
		animation: slideIn 0.3s ease-out forwards;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Custom scrollbar for glass effect */
	:global(.glass-list-separated::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.glass-list-separated::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		margin: 0.5rem;
	}

	:global(.glass-list-separated::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
	}

	:global(.glass-list-separated::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.4);
	}
</style>