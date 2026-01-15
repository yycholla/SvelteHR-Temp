import { browser } from '$app/environment';

class SidebarState {
	isCollapsed = $state(false);

	constructor() {
		// Do not read localStorage immediately to avoid hydration mismatch
		// We will sync in a component onMount or effects, or accept the flash
		// But to prevent HierarchyRequestError, we must match server (expanded) initially.
		// However, this means FOUC (Flash of Unstyled/Uncollapsed Content).
	}

	init() {
		if (browser) {
			const saved = localStorage.getItem('sidebar-collapsed');
			if (saved !== null) {
				this.isCollapsed = saved === 'true';
			}
		}
	}

	toggle() {
		this.isCollapsed = !this.isCollapsed;
		if (browser) {
			localStorage.setItem('sidebar-collapsed', String(this.isCollapsed));
		}
	}

	set(value: boolean) {
		this.isCollapsed = value;
		if (browser) {
			localStorage.setItem('sidebar-collapsed', String(value));
		}
	}
}

export const sidebarState = new SidebarState();
