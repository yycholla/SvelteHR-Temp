<script lang="ts">
	import { flip } from 'svelte/animate';
import { dashboardLayout, isDragging, isEditing, dashboardActions, CARD_SIZE_MAP } from '$lib/stores/dashboard.js';
// Removed streaming imports - using static data only
	import { cardRegistry } from '../CardRegistry.js';
	import DashboardCard from './DashboardCard.svelte';
	import type { CardInstance, CardPosition } from '../types.js';
	
	// Grid configuration
	const GRID_GAP = 16; // Gap between cards in pixels
	const CARD_MIN_WIDTH = 280;  // Increased minimum width
	const CARD_MIN_HEIGHT = 200; // Increased minimum height
	
	let gridContainer: HTMLElement;
	let gridWidth = 1200;
	let gridHeight = 800;
	let draggedCard: CardInstance | null = null;
	let dragOffset = { x: 0, y: 0 };
	let resizingCard: CardInstance | null = null;
	let resizeDirection: string | null = null;
	let resizeStartPosition: CardPosition | null = null;
	let resizeStartMouse: { x: number; y: number } | null = null;
	
	// Reactive grid calculations
	$: colWidth = $dashboardLayout ? (gridWidth - (GRID_GAP * ($dashboardLayout.gridCols + 1))) / $dashboardLayout.gridCols : 100;
	$: rowHeight = 240; // Large grid squares for clean snapping and resizing
	
	// Visible cards for rendering
	$: visibleCards = $dashboardLayout?.cards.filter(card => card.visible) || [];

// Streaming functionality removed - using static data only

	// Calculate the actual content height based on card positions
	$: contentHeight = (() => {
		if (!visibleCards.length) return 800; // Minimum height when empty
		
		const maxY = Math.max(...visibleCards.map(card => card.position.y + card.position.h));
		const calculatedHeight = maxY * (rowHeight + GRID_GAP) + GRID_GAP * 2; // Add some padding
		
		// In edit mode, allow extra space for dragging cards below existing content
		const editModeBuffer = $isEditing ? rowHeight * 5 : 0;
		
		return Math.max(600, calculatedHeight + editModeBuffer);
	})();

	// Calculate how many rows we need for the grid overlay
	$: gridOverlayRows = Math.ceil(contentHeight / (rowHeight + GRID_GAP));

	// Convert pixel coordinates to grid coordinates
	function pixelToGrid(pixelX: number, pixelY: number): { x: number; y: number } {
		const x = Math.round((pixelX - GRID_GAP) / (colWidth + GRID_GAP));
		const y = Math.round((pixelY - GRID_GAP) / (rowHeight + GRID_GAP));
		return {
			x: Math.max(0, Math.min(x, ($dashboardLayout?.gridCols || 12) - 1)),
			y: Math.max(0, y)
		};
	}

	// Check if a position is occupied by another card
	function isPositionOccupied(x: number, y: number, w: number, h: number, excludeCard?: string): boolean {
		if (!$dashboardLayout) return false;
		
		return $dashboardLayout.cards.some(card => {
			if (card.id === excludeCard || !card.visible) return false;
			
			return !(
				x >= card.position.x + card.position.w ||
				x + w <= card.position.x ||
				y >= card.position.y + card.position.h ||
				y + h <= card.position.y
			);
		});
	}

	// Find the closest available position for a displaced card
	function findClosestPosition(originalCard: CardInstance, excludeCard?: string, excludePosition?: CardPosition): CardPosition {
		if (!$dashboardLayout) return originalCard.position;
		
		const { w, h } = originalCard.position;
		const maxCols = $dashboardLayout.gridCols;
		
		// Create a temporary occupation map that includes the new card position
		const occupiedPositions = new Set<string>();
		
		// Mark all existing cards (except the one being moved and the one being displaced)
		$dashboardLayout.cards.forEach(card => {
			if (card.id === excludeCard || card.id === originalCard.id || !card.visible) return;
			
			for (let x = card.position.x; x < card.position.x + card.position.w; x++) {
				for (let y = card.position.y; y < card.position.y + card.position.h; y++) {
					occupiedPositions.add(`${x},${y}`);
				}
			}
		});
		
		// Mark the new position that's being occupied
		if (excludePosition) {
			for (let x = excludePosition.x; x < excludePosition.x + excludePosition.w; x++) {
				for (let y = excludePosition.y; y < excludePosition.y + excludePosition.h; y++) {
					occupiedPositions.add(`${x},${y}`);
				}
			}
		}
		
		// Function to check if a position is free
		const isPositionFree = (x: number, y: number): boolean => {
			if (x < 0 || x + w > maxCols || y < 0) return false;
			
			for (let checkX = x; checkX < x + w; checkX++) {
				for (let checkY = y; checkY < y + h; checkY++) {
					if (occupiedPositions.has(`${checkX},${checkY}`)) {
						return false;
					}
				}
			}
			return true;
		};
		
		// Try positions in expanding rings around the original position
		for (let radius = 0; radius <= Math.max(maxCols, 50); radius++) {
			for (let dx = -radius; dx <= radius; dx++) {
				for (let dy = -radius; dy <= radius; dy++) {
					// Only check positions on the current radius ring for radius > 0
					if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
					
					const x = originalCard.position.x + dx;
					const y = originalCard.position.y + dy;
					
					if (isPositionFree(x, y)) {
						return { x, y, w, h };
					}
				}
			}
		}
		
		// If no position found, place at the bottom
		let bottomY = 0;
		$dashboardLayout.cards.forEach(card => {
			if (card.id !== excludeCard && card.visible) {
				bottomY = Math.max(bottomY, card.position.y + card.position.h);
			}
		});
		
		return { x: 0, y: bottomY, w, h };
	}

	// Handle card drag start
	function handleDragStart(event: MouseEvent, card: CardInstance) {
		if (!$isEditing) return;
		
		event.preventDefault();
		draggedCard = card;
		isDragging.set(true);
		
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const gridRect = gridContainer.getBoundingClientRect();
		
		dragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
		
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);
	}

	// Handle card drag move
	function handleDragMove(event: MouseEvent) {
		if (!draggedCard || !gridContainer) return;
		
		const gridRect = gridContainer.getBoundingClientRect();
		// Account for any scrolling in the grid container
		const mouseX = event.clientX - gridRect.left + gridContainer.scrollLeft;
		const mouseY = event.clientY - gridRect.top + gridContainer.scrollTop;
		
		// Calculate the position where the card should be (top-left corner)
		const cardX = mouseX - dragOffset.x;
		const cardY = mouseY - dragOffset.y;
		
		// Show grid snap preview
		const gridPos = pixelToGrid(cardX, cardY);
		const snapX = gridPos.x * (colWidth + GRID_GAP) + GRID_GAP;
		const snapY = gridPos.y * (rowHeight + GRID_GAP) + GRID_GAP;
		
		// Update dragged card position visually (without affecting layout yet)
		const dragElement = document.querySelector(`[data-card-id="${draggedCard.id}"]`) as HTMLElement;
		if (dragElement) {
			dragElement.style.position = 'absolute';
			dragElement.style.left = `${cardX}px`;
			dragElement.style.top = `${cardY}px`;
			dragElement.style.zIndex = '1000';
			dragElement.style.pointerEvents = 'none'; // Prevent interference during drag
			dragElement.style.opacity = '0.8';
			dragElement.style.transform = 'rotate(2deg)'; // Slight rotation to indicate dragging
		}
	}

	// Handle card drag end
	function handleDragEnd(event: MouseEvent) {
		if (!draggedCard || !gridContainer || !$dashboardLayout) return;
		
		const gridRect = gridContainer.getBoundingClientRect();
		// Account for any scrolling in the grid container
		const mouseX = event.clientX - gridRect.left + gridContainer.scrollLeft;
		const mouseY = event.clientY - gridRect.top + gridContainer.scrollTop;
		
		// Calculate the card position
		const cardX = mouseX - dragOffset.x;
		const cardY = mouseY - dragOffset.y;
		
		// Convert to grid coordinates
		const gridPos = pixelToGrid(cardX, cardY);
		const newPosition: CardPosition = {
			x: gridPos.x,
			y: gridPos.y,
			w: draggedCard.position.w,
			h: draggedCard.position.h
		};
		
		// Check bounds
		if (newPosition.x + newPosition.w > $dashboardLayout.gridCols) {
			newPosition.x = $dashboardLayout.gridCols - newPosition.w;
		}
		if (newPosition.x < 0) {
			newPosition.x = 0;
		}
		if (newPosition.y < 0) {
			newPosition.y = 0;
		}
		
		// Handle collision and displacement
		if (isPositionOccupied(newPosition.x, newPosition.y, newPosition.w, newPosition.h, draggedCard.id)) {
			// Find cards that would be displaced
			const displacedCards = $dashboardLayout.cards.filter(card => {
				if (card.id === draggedCard!.id || !card.visible) return false;
				
				return !(
					newPosition.x >= card.position.x + card.position.w ||
					newPosition.x + newPosition.w <= card.position.x ||
					newPosition.y >= card.position.y + card.position.h ||
					newPosition.y + newPosition.h <= card.position.y
				);
			});
			
			// Find new positions for displaced cards
			const displacements = displacedCards.map(card => ({
				card,
				newPosition: findClosestPosition(card, draggedCard!.id, newPosition)
			}));
			
			// Apply all position updates
			dashboardLayout.update(layout => {
				if (!layout) return layout;
				
				const updatedCards = layout.cards.map(card => {
					if (card.id === draggedCard!.id) {
						return { ...card, position: newPosition };
					}
					
					const displacement = displacements.find(d => d.card.id === card.id);
					if (displacement) {
						return { ...card, position: displacement.newPosition };
					}
					
					return card;
				});
				
				return {
					...layout,
					cards: updatedCards,
					updatedAt: new Date()
				};
			});
		} else {
			// No collision, just update position
			dashboardActions.updateCardPosition(draggedCard.id, newPosition);
		}
		
		// Reset drag element style
		const dragElement = document.querySelector(`[data-card-id="${draggedCard.id}"]`) as HTMLElement;
		if (dragElement) {
			dragElement.style.position = '';
			dragElement.style.left = '';
			dragElement.style.top = '';
			dragElement.style.zIndex = '';
			dragElement.style.pointerEvents = '';
			dragElement.style.opacity = '';
			dragElement.style.transform = '';
		}
		
		// Cleanup
		draggedCard = null;
		isDragging.set(false);
		document.removeEventListener('mousemove', handleDragMove);
		document.removeEventListener('mouseup', handleDragEnd);
		
		// Save layout
		dashboardActions.saveLayout();
	}

	// Handle resize start
	function handleResizeStart(event: MouseEvent, card: CardInstance, direction: string) {
		if (!$isEditing) return;
		
		event.preventDefault();
		event.stopPropagation(); // Prevent drag from starting
		
		resizingCard = card;
		resizeDirection = direction;
		resizeStartPosition = { ...card.position };
		
		// Capture initial mouse position
		const gridRect = gridContainer.getBoundingClientRect();
		resizeStartMouse = {
			x: event.clientX - gridRect.left + gridContainer.scrollLeft,
			y: event.clientY - gridRect.top + gridContainer.scrollTop
		};
		
		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	}

	// Handle resize move
	function handleResizeMove(event: MouseEvent) {
		if (!resizingCard || !gridContainer || !resizeStartPosition || !resizeStartMouse) return;
		
		const gridRect = gridContainer.getBoundingClientRect();
		const mouseX = event.clientX - gridRect.left + gridContainer.scrollLeft;
		const mouseY = event.clientY - gridRect.top + gridContainer.scrollTop;
		
		// Calculate mouse movement in pixels
		const deltaX = mouseX - resizeStartMouse.x;
		const deltaY = mouseY - resizeStartMouse.y;
		
		// Convert pixel movement to grid units
		const deltaGridX = Math.round(deltaX / (colWidth + GRID_GAP));
		const deltaGridY = Math.round(deltaY / (rowHeight + GRID_GAP));
		
		const startPos = resizeStartPosition;
		let newPosition: CardPosition = { ...startPos };
		
		// Calculate new dimensions based on resize direction and mouse movement
		switch (resizeDirection) {
			case 'se': // Southeast (bottom-right)
				newPosition.w = Math.max(1, startPos.w + deltaGridX);
				newPosition.h = Math.max(1, startPos.h + deltaGridY);
				break;
			case 'sw': // Southwest (bottom-left)
				newPosition.x = Math.max(0, startPos.x + deltaGridX);
				newPosition.w = Math.max(1, startPos.w - deltaGridX);
				newPosition.h = Math.max(1, startPos.h + deltaGridY);
				break;
			case 'ne': // Northeast (top-right)
				newPosition.y = Math.max(0, startPos.y + deltaGridY);
				newPosition.w = Math.max(1, startPos.w + deltaGridX);
				newPosition.h = Math.max(1, startPos.h - deltaGridY);
				break;
			case 'nw': // Northwest (top-left)
				newPosition.x = Math.max(0, startPos.x + deltaGridX);
				newPosition.y = Math.max(0, startPos.y + deltaGridY);
				newPosition.w = Math.max(1, startPos.w - deltaGridX);
				newPosition.h = Math.max(1, startPos.h - deltaGridY);
				break;
			case 'e': // East (right)
				newPosition.w = Math.max(1, startPos.w + deltaGridX);
				break;
			case 'w': // West (left)
				newPosition.x = Math.max(0, startPos.x + deltaGridX);
				newPosition.w = Math.max(1, startPos.w - deltaGridX);
				break;
			case 's': // South (bottom)
				newPosition.h = Math.max(1, startPos.h + deltaGridY);
				break;
			case 'n': // North (top)
				newPosition.y = Math.max(0, startPos.y + deltaGridY);
				newPosition.h = Math.max(1, startPos.h - deltaGridY);
				break;
		}
		
		// Additional bounds checking
		if ($dashboardLayout) {
			// Ensure card doesn't go beyond right edge
			if (newPosition.x + newPosition.w > $dashboardLayout.gridCols) {
				if (resizeDirection.includes('e')) {
					// If resizing east, limit width
					newPosition.w = $dashboardLayout.gridCols - newPosition.x;
				} else if (resizeDirection.includes('w')) {
					// If resizing west, adjust position
					newPosition.x = $dashboardLayout.gridCols - newPosition.w;
				}
			}
		}
		
		// Update position immediately for visual feedback
		dashboardActions.updateCardPosition(resizingCard.id, newPosition);
	}

	// Handle resize end
	function handleResizeEnd() {
		resizingCard = null;
		resizeDirection = null;
		resizeStartPosition = null;
		resizeStartMouse = null;
		
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		
		// Save layout
		dashboardActions.saveLayout();
	}
	
	// Calculate card style based on grid position
	function getCardStyle(card: CardInstance): string {
		const x = card.position.x * (colWidth + GRID_GAP) + GRID_GAP;
		const y = card.position.y * (rowHeight + GRID_GAP) + GRID_GAP;
		const width = card.position.w * colWidth + (card.position.w - 1) * GRID_GAP;
		const height = card.position.h * rowHeight + (card.position.h - 1) * GRID_GAP;
		
		return `
			position: absolute;
			left: ${x}px;
			top: ${y}px;
			width: ${Math.max(width, CARD_MIN_WIDTH)}px;
			height: ${Math.max(height, CARD_MIN_HEIGHT)}px;
			z-index: ${$isDragging ? 1000 : 1};
		`;
	}
	
	// Handle grid container resize
	function updateGridSize() {
		if (gridContainer) {
			gridWidth = gridContainer.clientWidth;
			gridHeight = Math.max(gridContainer.clientHeight, 600);
		}
	}
	
	// Update grid size on window resize
	function handleResize() {
		updateGridSize();
	}
	
	// Initialize grid size
	$: if (gridContainer) {
		updateGridSize();
	}
	
	// Handle card removal
	function handleRemoveCard(cardId: string) {
		dashboardActions.removeCard(cardId);
	}
	
	// Handle card configuration
	function handleConfigureCard(cardId: string, config: Record<string, any>) {
		dashboardActions.updateCardConfig(cardId, config);
	}
</script>

<svelte:window on:resize={handleResize} />

<div 
	class="dashboard-grid relative w-full h-full overflow-auto bg-muted/30"
	bind:this={gridContainer}
>
	{#if $dashboardLayout && visibleCards.length > 0}
		<div
			class="relative w-full h-full p-4"
			style="min-height: {contentHeight}px;"
		>
			{#each visibleCards as card (card.id)}
				<div 
					data-card-id={card.id}
					style={getCardStyle(card)}
					class="dashboard-card-container relative transition-all duration-200 {$isDragging && draggedCard?.id !== card.id ? 'pointer-events-none' : ''} {$isEditing ? 'cursor-move' : ''}"
					role="button"
					tabindex="0"
					on:mousedown={(e) => handleDragStart(e, card)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							// Could implement keyboard navigation here
						}
					}}
				>
                    <DashboardCard
						instance={card}
						metadata={cardRegistry.getCard(card.cardId)}
						editable={$isEditing}
                        stream={null}
						on:remove={() => handleRemoveCard(card.id)}
						on:configure={(e) => handleConfigureCard(card.id, e.detail)}
					/>
					
					{#if $isEditing}
						<!-- Resize handles -->
						<div class="absolute inset-0 pointer-events-none">
							<!-- Corner handles -->
							<div 
								class="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm cursor-nw-resize pointer-events-auto"
								style="top: -6px; left: -6px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'nw')}
							></div>
							<div 
								class="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm cursor-ne-resize pointer-events-auto"
								style="top: -6px; right: -6px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'ne')}
							></div>
							<div 
								class="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm cursor-sw-resize pointer-events-auto"
								style="bottom: -6px; left: -6px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'sw')}
							></div>
							<div 
								class="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm cursor-se-resize pointer-events-auto"
								style="bottom: -6px; right: -6px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'se')}
							></div>
							
							<!-- Edge handles -->
							<div 
								class="absolute w-full h-2 cursor-n-resize pointer-events-auto"
								style="top: -4px; left: 0;"
								on:mousedown={(e) => handleResizeStart(e, card, 'n')}
							></div>
							<div 
								class="absolute w-full h-2 cursor-s-resize pointer-events-auto"
								style="bottom: -4px; left: 0;"
								on:mousedown={(e) => handleResizeStart(e, card, 's')}
							></div>
							<div 
								class="absolute h-full w-2 cursor-w-resize pointer-events-auto"
								style="top: 0; left: -4px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'w')}
							></div>
							<div 
								class="absolute h-full w-2 cursor-e-resize pointer-events-auto"
								style="top: 0; right: -4px;"
								on:mousedown={(e) => handleResizeStart(e, card, 'e')}
							></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty state -->
		<div class="flex items-center justify-center h-full text-center">
			<div class="space-y-4">
				<div class="text-6xl opacity-20">📊</div>
				<h3 class="text-lg font-semibold text-muted-foreground">Your Dashboard is Empty</h3>
				<p class="text-sm text-muted-foreground max-w-md">
					{#if $isEditing}
						Add some cards to get started. Use the card library to find widgets that suit your needs.
					{:else}
						Enable edit mode to customize your dashboard and add cards.
					{/if}
				</p>
			</div>
		</div>
	{/if}
	
	<!-- Grid overlay for editing mode -->
	{#if $isEditing && $dashboardLayout}
		<div class="absolute inset-0 pointer-events-none opacity-20">
			{#each Array(gridOverlayRows) as _, row}
				{#each Array($dashboardLayout.gridCols) as _, col}
					<div
						class="absolute border border-dashed border-primary/30"
						style="
							left: {col * (colWidth + GRID_GAP) + GRID_GAP}px;
							top: {row * (rowHeight + GRID_GAP) + GRID_GAP}px;
							width: {colWidth}px;
							height: {rowHeight}px;
						"
					></div>
				{/each}
			{/each}
		</div>
	{/if}
</div>

<style>
	.dashboard-grid {
		/* Custom scrollbar */
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
	}
	
	.dashboard-grid::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	
	.dashboard-grid::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.dashboard-grid::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 3px;
	}
	
	.dashboard-grid::-webkit-scrollbar-thumb:hover {
		background-color: rgba(0, 0, 0, 0.3);
	}
	
	.dashboard-card-container {
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		user-select: none;
	}
	
	.dashboard-card-container:hover {
		transform: translateZ(0);
	}
	
	.dashboard-card-container.cursor-move:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
</style>