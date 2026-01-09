/**
 * Command Palette Trigger Tests
 *
 * Test suite for the command palette trigger button component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CommandPaletteTrigger from './CommandPaletteTrigger.svelte';

describe('CommandPaletteTrigger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render a button', () => {
		const { container } = render(CommandPaletteTrigger);
		const button = container.querySelector('button');
		expect(button).toBeTruthy();
	});

	it('should have appropriate title attribute', () => {
		const { container } = render(CommandPaletteTrigger);
		const button = container.querySelector('button');
		expect(button?.getAttribute('title')).toMatch(/Search commands/);
	});

	it('should have search icon', () => {
		const { container } = render(CommandPaletteTrigger);
		const svg = container.querySelector('svg');
		expect(svg).toBeTruthy();
	});

	it('should dispatch keyboard event when clicked', async () => {
		const { container } = render(CommandPaletteTrigger);
		const button = container.querySelector('button');

		// Spy on window.dispatchEvent
		const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

		// Click the button
		if (button) {
			await fireEvent.click(button);
		}

		// Verify that a keyboard event was dispatched
		expect(dispatchEventSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'keydown',
				key: 'k',
				code: 'KeyK',
				metaKey: true,
				ctrlKey: true
			})
		);

		dispatchEventSpy.mockRestore();
	});

	it('should have command-palette-trigger class', () => {
		const { container } = render(CommandPaletteTrigger);
		const button = container.querySelector('button');
		expect(button?.classList.contains('command-palette-trigger')).toBe(true);
	});

	it('should have appropriate aria-label', () => {
		const { container } = render(CommandPaletteTrigger);
		const button = container.querySelector('button');
		expect(button?.getAttribute('aria-label')).toMatch(/Open command palette/);
	});
});
