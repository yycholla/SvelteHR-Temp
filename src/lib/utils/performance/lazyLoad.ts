/**
 * Lazy loading utilities for components, images, and data
 * Implements intersection observer-based loading for optimal performance
 */

// Lazy component loader with chunking
export function lazyComponent(importFn: () => Promise<any>, placeholder?: any) {
	return async () => {
		try {
			const module = await importFn();
			return module.default || module;
		} catch (error) {
			console.error('Failed to lazy load component:', error);
			return placeholder || (() => 'Failed to load component');
		}
	};
}

// Image lazy loading with intersection observer
export class LazyImageLoader {
	private observer: IntersectionObserver | null = null;
	private imageQueue = new Set<HTMLImageElement>();

	constructor() {
		this.initializeObserver();
	}

	// Add image to lazy loading queue
	observe(img: HTMLImageElement): void {
		if (!this.observer || !img.dataset.src) return;

		this.imageQueue.add(img);
		this.observer.observe(img);
	}

	// Remove image from observation
	unobserve(img: HTMLImageElement): void {
		if (!this.observer) return;

		this.observer.unobserve(img);
		this.imageQueue.delete(img);
	}

	// Initialize intersection observer
	private initializeObserver(): void {
		if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
			return;
		}

		this.observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.loadImage(entry.target as HTMLImageElement);
					}
				});
			},
			{
				// Load images when they're 100px away from viewport
				rootMargin: '100px 0px',
				threshold: 0.1
			}
		);
	}

	// Load image and handle states
	private loadImage(img: HTMLImageElement): void {
		const src = img.dataset.src;
		const placeholder = img.dataset.placeholder;

		if (!src) return;

		// Create a new image to preload
		const imageLoader = new Image();

		imageLoader.onload = () => {
			// Fade transition for better UX
			img.style.opacity = '0';
			img.style.transition = 'opacity 0.3s ease';

			img.src = src;
			img.removeAttribute('data-src');
			img.classList.add('loaded');

			// Fade in
			requestAnimationFrame(() => {
				img.style.opacity = '1';
			});

			// Stop observing this image
			this.unobserve(img);
		};

		imageLoader.onerror = () => {
			// Show placeholder on error
			if (placeholder) {
				img.src = placeholder;
			}
			img.classList.add('error');
			this.unobserve(img);
		};

		// Start loading
		img.classList.add('loading');
		imageLoader.src = src;
	}

	// Cleanup
	destroy(): void {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.imageQueue.clear();
	}
}

// Global lazy image loader instance
export const lazyImageLoader = new LazyImageLoader();

// Lazy data loading with intersection observer
export class LazyDataLoader {
	private observer: IntersectionObserver | null = null;
	private callbacks = new Map<Element, () => Promise<void>>();

	constructor() {
		this.initializeObserver();
	}

	// Register element for lazy data loading
	observe(element: Element, loadFn: () => Promise<void>): void {
		if (!this.observer) return;

		this.callbacks.set(element, loadFn);
		this.observer.observe(element);
	}

	// Stop observing element
	unobserve(element: Element): void {
		if (!this.observer) return;

		this.observer.unobserve(element);
		this.callbacks.delete(element);
	}

	// Initialize intersection observer
	private initializeObserver(): void {
		if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
			return;
		}

		this.observer = new IntersectionObserver(
			(entries) => {
				entries.forEach(async (entry) => {
					if (entry.isIntersecting) {
						const loadFn = this.callbacks.get(entry.target);

						if (loadFn) {
							try {
								await loadFn();
								this.unobserve(entry.target);
							} catch (error) {
								console.error('Lazy data loading failed:', error);
							}
						}
					}
				});
			},
			{
				// Load data when element is 200px away from viewport
				rootMargin: '200px 0px',
				threshold: 0
			}
		);
	}

	// Cleanup
	destroy(): void {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.callbacks.clear();
	}
}

// Global lazy data loader instance
export const lazyDataLoader = new LazyDataLoader();

// Virtual list implementation for large datasets
export class VirtualList {
	private container: HTMLElement;
	private items: any[];
	private itemHeight: number;
	private visibleCount: number;
	private scrollTop = 0;
	private renderRange = { start: 0, end: 0 };

	constructor(
		container: HTMLElement,
		items: any[],
		itemHeight: number,
		renderFn: (item: any, index: number) => HTMLElement
	) {
		this.container = container;
		this.items = items;
		this.itemHeight = itemHeight;
		this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2; // Buffer

		this.setupScrollListener();
		this.render();
	}

	// Update items and re-render
	updateItems(items: any[]): void {
		this.items = items;
		this.render();
	}

	// Setup scroll event listener
	private setupScrollListener(): void {
		this.container.addEventListener(
			'scroll',
			() => {
				this.scrollTop = this.container.scrollTop;
				this.updateRenderRange();
				this.render();
			},
			{ passive: true }
		);
	}

	// Calculate which items should be rendered
	private updateRenderRange(): void {
		const start = Math.floor(this.scrollTop / this.itemHeight);
		const end = Math.min(start + this.visibleCount, this.items.length);

		this.renderRange = { start, end };
	}

	// Render visible items
	private render(): void {
		// Clear container
		this.container.innerHTML = '';

		// Create spacer for items above viewport
		const topSpacer = document.createElement('div');
		topSpacer.style.height = `${this.renderRange.start * this.itemHeight}px`;
		this.container.appendChild(topSpacer);

		// Render visible items
		for (let i = this.renderRange.start; i < this.renderRange.end; i++) {
			const itemElement = this.createItemElement(this.items[i], i);
			this.container.appendChild(itemElement);
		}

		// Create spacer for items below viewport
		const bottomSpacer = document.createElement('div');
		const remainingItems = this.items.length - this.renderRange.end;
		bottomSpacer.style.height = `${remainingItems * this.itemHeight}px`;
		this.container.appendChild(bottomSpacer);
	}

	// Create item element (override this method)
	private createItemElement(item: any, index: number): HTMLElement {
		const element = document.createElement('div');
		element.style.height = `${this.itemHeight}px`;
		element.style.display = 'flex';
		element.style.alignItems = 'center';
		element.style.padding = '0 1rem';
		element.style.borderBottom = '1px solid #e5e7eb';
		element.textContent = `Item ${index}: ${JSON.stringify(item)}`;
		return element;
	}
}

// Debounced lazy loader for search and filters
export function createDebouncedLoader<T>(loadFn: (query: string) => Promise<T>, delay = 300) {
	let timeoutId: NodeJS.Timeout;
	let lastQuery = '';

	return {
		load: (query: string): Promise<T> => {
			return new Promise((resolve, reject) => {
				// Clear existing timeout
				if (timeoutId) {
					clearTimeout(timeoutId);
				}

				// Set new timeout
				timeoutId = setTimeout(async () => {
					try {
						// Avoid duplicate requests
						if (query === lastQuery) return;
						lastQuery = query;

						const result = await loadFn(query);
						resolve(result);
					} catch (error) {
						reject(error);
					}
				}, delay);
			});
		},

		cancel: () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	};
}

// Progressive enhancement loader
export class ProgressiveLoader {
	private loadStages: Array<{
		name: string;
		loadFn: () => Promise<void>;
		priority: number;
	}> = [];

	// Add loading stage
	addStage(name: string, loadFn: () => Promise<void>, priority = 1): void {
		this.loadStages.push({ name, loadFn, priority });

		// Sort by priority (higher priority loads first)
		this.loadStages.sort((a, b) => b.priority - a.priority);
	}

	// Load all stages progressively
	async loadProgressive(): Promise<void> {
		console.log('🚀 Starting progressive loading...');

		for (const stage of this.loadStages) {
			try {
				console.log(`📦 Loading stage: ${stage.name}`);
				await stage.loadFn();
				console.log(`✅ Completed stage: ${stage.name}`);
			} catch (error) {
				console.error(`❌ Failed to load stage ${stage.name}:`, error);
				// Continue with other stages even if one fails
			}
		}

		console.log('🎉 Progressive loading complete');
	}

	// Load stages in parallel with priority grouping
	async loadParallel(): Promise<void> {
		console.log('🚀 Starting parallel loading...');

		// Group by priority
		const priorityGroups = new Map<number, typeof this.loadStages>();

		for (const stage of this.loadStages) {
			const group = priorityGroups.get(stage.priority) || [];
			group.push(stage);
			priorityGroups.set(stage.priority, group);
		}

		// Load each priority group in sequence, stages within group in parallel
		for (const [priority, stages] of priorityGroups) {
			console.log(`📦 Loading priority group ${priority}...`);

			const promises = stages.map(async (stage) => {
				try {
					await stage.loadFn();
					console.log(`✅ Completed: ${stage.name}`);
				} catch (error) {
					console.error(`❌ Failed: ${stage.name}`, error);
				}
			});

			await Promise.allSettled(promises);
		}

		console.log('🎉 Parallel loading complete');
	}
}

// Utility functions
export const lazyUtils = {
	// Create lazy image with data attributes
	createLazyImage(src: string, alt: string, placeholder?: string): HTMLImageElement {
		const img = document.createElement('img');
		img.dataset.src = src;
		img.alt = alt;
		img.style.opacity = '0';

		if (placeholder) {
			img.src = placeholder;
			img.dataset.placeholder = placeholder;
		}

		// Add to lazy loading queue
		lazyImageLoader.observe(img);

		return img;
	},

	// Prefetch critical resources
	prefetchResources(resources: string[]): void {
		if (typeof window === 'undefined') return;

		resources.forEach((resource) => {
			const link = document.createElement('link');
			link.rel = 'prefetch';
			link.href = resource;
			document.head.appendChild(link);
		});
	},

	// Cleanup all lazy loaders
	cleanup(): void {
		lazyImageLoader.destroy();
		lazyDataLoader.destroy();
	}
};
