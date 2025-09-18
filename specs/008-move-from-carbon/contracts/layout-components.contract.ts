/**
 * UI Component Contracts: Layout Components
 *
 * Contract specifications for shadcn-svelte layout components
 * These contracts define the expected API and behavior for layout components
 * replacing Carbon Design System Header, SideNav, and Content components.
 */

import type { Snippet } from 'svelte';
import type { ComponentType } from 'svelte';

// ============================================================================
// LAYOUT STRUCTURE CONTRACTS
// ============================================================================

/**
 * Main Application Layout Contract
 * Replaces Carbon UI Shell with sidebar + header layout
 */
export interface AppLayoutContract {
  /** Child content to render in main area */
  children: Snippet;

  /** Initial sidebar open state */
  sidebarOpen?: boolean;

  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';

  /** Layout variant for different page types */
  variant?: 'default' | 'fullwidth' | 'centered';

  /** Custom CSS classes */
  className?: string;
}

/**
 * Sidebar Navigation Contract
 * Replaces Carbon SideNav component
 */
export interface SidebarContract {
  /** Navigation menu items */
  navigationItems: NavigationItem[];

  /** Current user context for role-based filtering */
  user: UserContext;

  /** Sidebar open/closed state */
  open: boolean;

  /** Sidebar width variant */
  width?: 'sm' | 'md' | 'lg';

  /** Keyboard shortcut enabled */
  keyboardShortcut?: boolean;

  /** Custom header content */
  header?: Snippet;

  /** Custom footer content */
  footer?: Snippet;

  /** Callback when sidebar state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Header/Topbar Contract
 * Replaces Carbon Header component
 */
export interface HeaderContract {
  /** Application title/branding */
  title?: string;

  /** Current user information */
  user: UserContext;

  /** Breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[];

  /** Header actions (search, notifications, user menu) */
  actions?: HeaderAction[];

  /** Sidebar toggle button */
  sidebarTrigger?: boolean;

  /** Custom content */
  children?: Snippet;

  /** Header height variant */
  height?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// SUPPORTING TYPE CONTRACTS
// ============================================================================

/**
 * Navigation Item Contract
 * Defines structure for sidebar menu items
 */
export interface NavigationItem {
  /** Unique identifier */
  id: string;

  /** Display label */
  label: string;

  /** Route path */
  href: string;

  /** Icon component (Lucide icon) */
  icon?: ComponentType;

  /** Badge or count indicator */
  badge?: string | number;

  /** Nested menu items */
  children?: NavigationItem[];

  /** Required permission to view */
  permission?: string;

  /** External link indicator */
  external?: boolean;

  /** Disabled state */
  disabled?: boolean;
}

/**
 * User Context Contract
 * Current user information for layout personalization
 */
export interface UserContext {
  /** User's display name */
  name: string;

  /** User's email address */
  email: string;

  /** User's role (affects navigation visibility) */
  role: 'admin' | 'hr_admin' | 'manager' | 'employee';

  /** User's permissions array */
  permissions: string[];

  /** Avatar image URL */
  avatar?: string;

  /** Initials for avatar fallback */
  initials?: string;
}

/**
 * Breadcrumb Item Contract
 * Navigation breadcrumbs for context
 */
export interface BreadcrumbItem {
  /** Display text */
  label: string;

  /** Link destination */
  href?: string;

  /** Current page indicator */
  current?: boolean;

  /** Icon for breadcrumb item */
  icon?: ComponentType;
}

/**
 * Header Action Contract
 * Actions in header (search, notifications, user menu)
 */
export interface HeaderAction {
  /** Action identifier */
  id: string;

  /** Action type */
  type: 'button' | 'menu' | 'search' | 'notifications';

  /** Display label/tooltip */
  label: string;

  /** Icon component */
  icon: ComponentType;

  /** Notification count badge */
  badge?: number;

  /** Click handler */
  onClick?: () => void;

  /** Menu items (for menu type actions) */
  menuItems?: HeaderMenuItem[];
}

/**
 * Header Menu Item Contract
 * Individual items in header dropdown menus
 */
export interface HeaderMenuItem {
  /** Item identifier */
  id: string;

  /** Display label */
  label: string;

  /** Link destination */
  href?: string;

  /** Icon component */
  icon?: ComponentType;

  /** Click handler */
  onClick?: () => void;

  /** Item type for styling */
  type?: 'default' | 'destructive' | 'separator';

  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// COMPONENT BEHAVIOR CONTRACTS
// ============================================================================

/**
 * Layout State Management Contract
 * Defines how layout state is managed and persisted
 */
export interface LayoutStateContract {
  /** Get current sidebar state */
  getSidebarOpen(): boolean;

  /** Set sidebar state */
  setSidebarOpen(open: boolean): void;

  /** Toggle sidebar state */
  toggleSidebar(): void;

  /** Get current theme */
  getTheme(): 'light' | 'dark' | 'system';

  /** Set theme preference */
  setTheme(theme: 'light' | 'dark' | 'system'): void;

  /** Subscribe to layout state changes */
  subscribe(callback: (state: LayoutState) => void): () => void;
}

/**
 * Layout State Type
 * Current state of layout components
 */
export interface LayoutState {
  /** Sidebar open/closed */
  sidebarOpen: boolean;

  /** Current theme */
  theme: 'light' | 'dark' | 'system';

  /** Active route for navigation highlighting */
  activeRoute: string;

  /** Current breadcrumbs */
  breadcrumbs: BreadcrumbItem[];
}

// ============================================================================
// RESPONSIVE BEHAVIOR CONTRACTS
// ============================================================================

/**
 * Responsive Layout Contract
 * Defines how layout adapts to different screen sizes
 */
export interface ResponsiveLayoutContract {
  /** Breakpoint definitions */
  breakpoints: {
    sm: number;    // Mobile: < 640px
    md: number;    // Tablet: 640px - 1024px
    lg: number;    // Desktop: 1024px - 1440px
    xl: number;    // Large: > 1440px
  };

  /** Mobile behavior */
  mobile: {
    /** Sidebar overlays content */
    sidebarOverlay: boolean;

    /** Header is sticky */
    stickyHeader: boolean;

    /** Auto-close sidebar on navigation */
    autoCloseSidebar: boolean;
  };

  /** Tablet behavior */
  tablet: {
    /** Sidebar can be collapsed */
    collapsibleSidebar: boolean;

    /** Show sidebar toggle in header */
    showSidebarToggle: boolean;
  };

  /** Desktop behavior */
  desktop: {
    /** Sidebar always visible */
    persistentSidebar: boolean;

    /** Sidebar resizable */
    resizableSidebar: boolean;
  };
}

// ============================================================================
// ACCESSIBILITY CONTRACTS
// ============================================================================

/**
 * Accessibility Requirements Contract
 * WCAG compliance requirements for layout components
 */
export interface AccessibilityContract {
  /** ARIA labels and descriptions */
  aria: {
    /** Sidebar navigation label */
    sidebarLabel: string;

    /** Main content label */
    mainLabel: string;

    /** Header navigation label */
    headerLabel: string;

    /** Skip navigation link */
    skipNavigation: string;
  };

  /** Keyboard navigation */
  keyboard: {
    /** Sidebar toggle shortcut */
    sidebarToggle: string[];

    /** Navigation focus management */
    focusManagement: boolean;

    /** Escape key handling */
    escapeHandling: boolean;
  };

  /** Screen reader support */
  screenReader: {
    /** Announce navigation changes */
    announceNavigation: boolean;

    /** Announce theme changes */
    announceTheme: boolean;

    /** Live region for status updates */
    liveRegion: boolean;
  };
}

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance Requirements Contract
 * Performance expectations for layout components
 */
export interface PerformanceContract {
  /** Bundle size limits */
  bundleSize: {
    /** Maximum gzipped size in KB */
    maxGzippedKB: number;

    /** Tree-shaking effectiveness */
    treeShaking: boolean;
  };

  /** Runtime performance */
  runtime: {
    /** Layout shift prevention */
    preventLayoutShift: boolean;

    /** Smooth animations */
    smoothAnimations: boolean;

    /** Efficient re-renders */
    optimizedRendering: boolean;
  };

  /** Loading performance */
  loading: {
    /** Critical CSS inlined */
    criticalCSS: boolean;

    /** Progressive enhancement */
    progressiveEnhancement: boolean;

    /** Lazy loading for non-critical elements */
    lazyLoading: boolean;
  };
}