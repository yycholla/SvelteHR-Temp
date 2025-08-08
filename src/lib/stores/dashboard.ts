import { writable, derived, get } from 'svelte/store';
import type { 
	DashboardLayout, 
	CardInstance, 
	UserDashboardPreferences, 
	CardPosition,
	CardSize,
	UserRole 
} from '$lib/components/dashboard/types.js';
import { cardRegistry } from '$lib/components/dashboard/CardRegistry.js';

// Default grid configuration
const DEFAULT_GRID_COLS = 12;
const DEFAULT_GRID_ROWS = 30; // Increased for better layout with larger cards

// ID counter for unique card IDs
let cardIdCounter = 0;

// Generate unique card ID
function generateCardId(cardType: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substr(2, 9);
	const counter = ++cardIdCounter;
	return `card-${cardType}-${timestamp}-${counter}-${random}`;
}

// Card size mappings to grid units (optimized for 240px grid squares with compact heights)
export const CARD_SIZE_MAP: Record<CardSize, { w: number; h: number }> = {
	'1x1': { w: 2, h: 1 },   // Small compact card - 240px tall
	'2x1': { w: 4, h: 1 },   // Wide compact card - 240px tall
	'1x2': { w: 2, h: 1 },   // Medium card - 240px tall (reduced from 2)
	'2x2': { w: 4, h: 1 },   // Large card - 240px tall (reduced from 2)
	'3x1': { w: 6, h: 1 },   // Extra wide compact card - 240px tall
	'1x3': { w: 2, h: 2 },   // Tall card - 496px tall (reduced from 3)
	'3x2': { w: 6, h: 1 },   // Wide card - 240px tall (reduced from 2)
	'2x3': { w: 4, h: 2 }    // Large tall card - 496px tall (reduced from 3)
};

// Core dashboard state
export const dashboardLayout = writable<DashboardLayout | null>(null);
export const isDragging = writable<boolean>(false);
export const isEditing = writable<boolean>(false);
export const userRole = writable<UserRole>('Employee');

// User preferences
export const dashboardPreferences = writable<UserDashboardPreferences>({
	layouts: [],
	activeLayoutId: '',
	theme: 'light',
	autoRefresh: true,
	refreshInterval: 300 // 5 minutes
});

// Available cards based on user role
export const availableCards = derived(
	userRole,
	($userRole) => cardRegistry.getAvailableCards($userRole)
);

// Current layout cards
export const layoutCards = derived(
	dashboardLayout,
	($layout) => $layout?.cards ?? []
);

/**
 * Dashboard store actions
 */
export const dashboardActions = {
	/**
	 * Initialize dashboard with user role and preferences
	 */
	async initialize(role: UserRole, userId?: string) {
		console.log('🔧 Dashboard initialization started for role:', role);
		userRole.set(role);
		
		try {
			// Load user preferences from localStorage first
			console.log('📋 Loading preferences from storage...');
			const savedPrefs = this.loadPreferencesFromStorage();
			if (savedPrefs) {
				console.log('✅ Found saved preferences:', savedPrefs);
				dashboardPreferences.set(savedPrefs);
				
				// Load active layout
				const activeLayout = savedPrefs.layouts.find(l => l.id === savedPrefs.activeLayoutId);
				if (activeLayout) {
					console.log('✅ Loading existing layout:', activeLayout.name);
					dashboardLayout.set(activeLayout);
					return;
				}
			}
			
			// Create default layout if no saved preferences
			console.log('🆕 Creating default layout for role:', role);
			const defaultLayout = this.createDefaultLayout(role);
			console.log('✅ Default layout created:', defaultLayout);
			dashboardLayout.set(defaultLayout);
			
			// Save to preferences
			dashboardPreferences.update(prefs => ({
				...prefs,
				layouts: [defaultLayout],
				activeLayoutId: defaultLayout.id
			}));
			
			console.log('💾 Saving preferences to storage...');
			this.savePreferencesToStorage();
			console.log('✅ Dashboard initialization completed');
		} catch (error) {
			console.error('❌ Error during dashboard initialization:', error);
			throw error;
		}
	},

	/**
	 * Create a default layout for the user role
	 */
	createDefaultLayout(role: UserRole): DashboardLayout {
		console.log('🔧 Creating default layout for role:', role);
		
		try {
			const defaultCards = cardRegistry.getDefaultLayout(role);
			console.log('📋 Default cards for role:', defaultCards.map(c => c.id));
			const cards: CardInstance[] = [];
			
			// Create temporary layout for collision detection
			const tempLayout: DashboardLayout = {
				id: 'temp',
				name: 'temp',
				cards: [],
				gridCols: DEFAULT_GRID_COLS,
				gridRows: DEFAULT_GRID_ROWS,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			
			defaultCards.forEach((cardMeta, index) => {
				console.log(`🃏 Processing card ${index}:`, cardMeta.id, cardMeta.defaultSize);
				const size = CARD_SIZE_MAP[cardMeta.defaultSize];
				
				// Use proper collision detection to find position
				const position = this.findAvailablePosition(cardMeta.defaultSize, tempLayout);
				
				const cardInstance = {
					id: generateCardId(cardMeta.id),
					cardId: cardMeta.id,
					position,
					size: cardMeta.defaultSize,
					visible: true,
					config: {}
				};
				
				console.log(`✅ Created card instance:`, cardInstance);
				cards.push(cardInstance);
				
				// Add to temp layout for next iteration's collision detection
				tempLayout.cards.push(cardInstance);
			});
			
			// Calculate required grid height based on card positions
			const maxY = cards.length > 0 ? Math.max(...cards.map(c => c.position.y + c.position.h)) : 0;
			
			const layout = {
				id: `layout-${role.toLowerCase()}-${Date.now()}`,
				name: `Default ${role} Dashboard`,
				cards,
				gridCols: DEFAULT_GRID_COLS,
				gridRows: Math.max(DEFAULT_GRID_ROWS, maxY + 2),
				createdAt: new Date(),
				updatedAt: new Date()
			};
			
			console.log('✅ Default layout created:', layout);
			return layout;
		} catch (error) {
			console.error('❌ Error creating default layout:', error);
			throw error;
		}
	},

	/**
	 * Add a card to the current layout
	 */
	addCard(cardId: string, position?: CardPosition) {
		console.log('🔧 Adding card:', cardId);
		const cardMeta = cardRegistry.getCard(cardId);
		if (!cardMeta) {
			console.error('❌ Card metadata not found for:', cardId);
			return;
		}
		
		const currentLayout = get(dashboardLayout);
		if (!currentLayout) {
			console.error('❌ No current layout found');
			return;
		}
		
		console.log('📋 Current layout has', currentLayout.cards.length, 'cards');
		
		// Find available position if not specified
		const cardPosition = position || this.findAvailablePosition(cardMeta.defaultSize, currentLayout);
		const size = CARD_SIZE_MAP[cardMeta.defaultSize];
		
		console.log('📍 Card position:', cardPosition);
		
		const newCard: CardInstance = {
			id: generateCardId(cardId),
			cardId,
			position: cardPosition,
			size: cardMeta.defaultSize,
			visible: true,
			config: {}
		};
		
		console.log('✨ Created new card instance:', newCard);
		
		dashboardLayout.update(layout => {
			if (!layout) return layout;
			const updated = {
				...layout,
				cards: [...layout.cards, newCard],
				updatedAt: new Date()
			};
			console.log('✅ Updated layout with', updated.cards.length, 'cards');
			return updated;
		});
		
		this.saveLayout();
	},

	/**
	 * Remove a card from the layout
	 */
	removeCard(cardInstanceId: string) {
		dashboardLayout.update(layout => {
			if (!layout) return layout;
			return {
				...layout,
				cards: layout.cards.filter(c => c.id !== cardInstanceId),
				updatedAt: new Date()
			};
		});
		
		this.saveLayout();
	},

	/**
	 * Update card position
	 */
	updateCardPosition(cardInstanceId: string, position: CardPosition) {
		dashboardLayout.update(layout => {
			if (!layout) return layout;
			return {
				...layout,
				cards: layout.cards.map(c => 
					c.id === cardInstanceId 
						? { ...c, position, size: this.positionToSize(position) }
						: c
				),
				updatedAt: new Date()
			};
		});
		
		this.saveLayout();
	},

	/**
	 * Update card configuration
	 */
	updateCardConfig(cardInstanceId: string, config: Record<string, any>) {
		dashboardLayout.update(layout => {
			if (!layout) return layout;
			return {
				...layout,
				cards: layout.cards.map(c => 
					c.id === cardInstanceId 
						? { ...c, config: { ...c.config, ...config } }
						: c
				),
				updatedAt: new Date()
			};
		});
		
		this.saveLayout();
	},

	/**
	 * Toggle card visibility
	 */
	toggleCardVisibility(cardInstanceId: string) {
		dashboardLayout.update(layout => {
			if (!layout) return layout;
			return {
				...layout,
				cards: layout.cards.map(c => 
					c.id === cardInstanceId 
						? { ...c, visible: !c.visible }
						: c
				),
				updatedAt: new Date()
			};
		});
		
		this.saveLayout();
	},

	/**
	 * Save current layout to user preferences
	 */
	saveLayout() {
		const layout = get(dashboardLayout);
		if (!layout) return;
		
		dashboardPreferences.update(prefs => ({
			...prefs,
			layouts: prefs.layouts.map(l => l.id === layout.id ? layout : l)
		}));
		
		this.savePreferencesToStorage();
	},

	/**
	 * Create a new layout
	 */
	createLayout(name: string, copyFromCurrent = false): string {
		const role = get(userRole);
		const currentLayout = get(dashboardLayout);
		const newId = `layout-${Date.now()}`;
		
		const newLayout: DashboardLayout = {
			id: newId,
			name,
			cards: copyFromCurrent && currentLayout ? [...currentLayout.cards] : [],
			gridCols: DEFAULT_GRID_COLS,
			gridRows: DEFAULT_GRID_ROWS,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		
		dashboardPreferences.update(prefs => ({
			...prefs,
			layouts: [...prefs.layouts, newLayout],
			activeLayoutId: newId
		}));
		
		dashboardLayout.set(newLayout);
		this.savePreferencesToStorage();
		
		return newId;
	},

	/**
	 * Switch to a different layout
	 */
	switchLayout(layoutId: string) {
		const prefs = get(dashboardPreferences);
		const layout = prefs.layouts.find(l => l.id === layoutId);
		
		if (layout) {
			dashboardLayout.set(layout);
			dashboardPreferences.update(p => ({ ...p, activeLayoutId: layoutId }));
			this.savePreferencesToStorage();
		}
	},

	/**
	 * Delete a layout
	 */
	deleteLayout(layoutId: string) {
		const prefs = get(dashboardPreferences);
		if (prefs.layouts.length <= 1) return; // Keep at least one layout
		
		dashboardPreferences.update(p => ({
			...p,
			layouts: p.layouts.filter(l => l.id !== layoutId),
			activeLayoutId: p.activeLayoutId === layoutId ? p.layouts[0].id : p.activeLayoutId
		}));
		
		// Switch to first layout if current was deleted
		if (prefs.activeLayoutId === layoutId) {
			const newActiveLayout = get(dashboardPreferences).layouts[0];
			dashboardLayout.set(newActiveLayout);
		}
		
		this.savePreferencesToStorage();
	},

	/**
	 * Reset to default layout
	 */
	resetToDefault() {
		const role = get(userRole);
		const defaultLayout = this.createDefaultLayout(role);
		
		dashboardLayout.set(defaultLayout);
		dashboardPreferences.update(prefs => ({
			...prefs,
			layouts: [defaultLayout],
			activeLayoutId: defaultLayout.id
		}));
		
		this.savePreferencesToStorage();
	},

	/**
	 * Find available position for a new card
	 */
	findAvailablePosition(size: CardSize, layout: DashboardLayout): CardPosition {
		const { w, h } = CARD_SIZE_MAP[size];
		const occupiedPositions = new Set<string>();
		
		// Mark occupied positions
		layout.cards.forEach(card => {
			for (let x = card.position.x; x < card.position.x + card.position.w; x++) {
				for (let y = card.position.y; y < card.position.y + card.position.h; y++) {
					occupiedPositions.add(`${x},${y}`);
				}
			}
		});
		
		// Find first available position
		for (let y = 0; y <= layout.gridRows - h; y++) {
			for (let x = 0; x <= layout.gridCols - w; x++) {
				let canPlace = true;
				
				for (let checkX = x; checkX < x + w && canPlace; checkX++) {
					for (let checkY = y; checkY < y + h && canPlace; checkY++) {
						if (occupiedPositions.has(`${checkX},${checkY}`)) {
							canPlace = false;
						}
					}
				}
				
				if (canPlace) {
					return { x, y, w, h };
				}
			}
		}
		
		// If no space found, place at bottom
		const maxY = Math.max(...layout.cards.map(c => c.position.y + c.position.h), 0);
		return { x: 0, y: maxY, w, h };
	},

	/**
	 * Convert position to card size
	 */
	positionToSize(position: CardPosition): CardSize {
		const sizeEntries = Object.entries(CARD_SIZE_MAP);
		const match = sizeEntries.find(([_, size]) => 
			size.w === position.w && size.h === position.h
		);
		return match ? match[0] as CardSize : '2x1';
	},

	/**
	 * Save preferences to localStorage
	 */
	savePreferencesToStorage() {
		if (typeof localStorage === 'undefined') return;
		
		const prefs = get(dashboardPreferences);
		localStorage.setItem('dashboard-preferences', JSON.stringify(prefs));
	},

	/**
	 * Load preferences from localStorage
	 */
	loadPreferencesFromStorage(): UserDashboardPreferences | null {
		if (typeof localStorage === 'undefined') {
			console.log('📋 localStorage not available (SSR)');
			return null;
		}
		
		try {
			const saved = localStorage.getItem('dashboard-preferences');
			if (!saved) {
				console.log('📋 No saved preferences found');
				return null;
			}
			
			console.log('📋 Raw saved preferences:', saved);
			const parsed = JSON.parse(saved);
			
			// Convert date strings back to Date objects
			if (parsed.layouts) {
				parsed.layouts = parsed.layouts.map((layout: any) => ({
					...layout,
					createdAt: new Date(layout.createdAt),
					updatedAt: new Date(layout.updatedAt)
				}));
			}
			
			console.log('📋 Parsed preferences:', parsed);
			return parsed;
		} catch (error) {
			console.warn('❌ Failed to load dashboard preferences:', error);
			// Clear corrupted data
			localStorage.removeItem('dashboard-preferences');
			return null;
		}
	},

	/**
	 * Export dashboard configuration
	 */
	exportConfig(): string {
		const prefs = get(dashboardPreferences);
		return JSON.stringify(prefs, null, 2);
	},

	/**
	 * Import dashboard configuration
	 */
	importConfig(config: string) {
		try {
			const imported = JSON.parse(config);
			
			// Validate structure
			if (!imported.layouts || !Array.isArray(imported.layouts)) {
				throw new Error('Invalid configuration format');
			}
			
			// Convert dates and set
			imported.layouts = imported.layouts.map((layout: any) => ({
				...layout,
				createdAt: new Date(layout.createdAt),
				updatedAt: new Date(layout.updatedAt)
			}));
			
			dashboardPreferences.set(imported);
			
			// Load active layout
			const activeLayout = imported.layouts.find((l: any) => l.id === imported.activeLayoutId);
			if (activeLayout) {
				dashboardLayout.set(activeLayout);
			}
			
			this.savePreferencesToStorage();
		} catch (error) {
			console.error('Failed to import configuration:', error);
			throw new Error('Invalid configuration format');
		}
	}
};