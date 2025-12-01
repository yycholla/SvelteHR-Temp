import { browser } from '$app/environment';

class SidebarState {
    isCollapsed = $state(false);

    constructor() {
        if (browser) {
            const saved = localStorage.getItem('sidebar-collapsed');
            this.isCollapsed = saved === 'true';
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
