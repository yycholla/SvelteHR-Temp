/**
 * Component Interface Contracts
 * Defines TypeScript interfaces for all Carbon-enhanced components
 */

// Login Form Contract
export interface CarbonLoginFormProps {
  // Component configuration
  title?: string;
  subtitle?: string;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showSignUp?: boolean;
  signUpUrl?: string;
  forgotPasswordUrl?: string;

  // Form behavior
  disabled?: boolean;
  loading?: boolean;

  // Validation configuration
  emailValidation?: {
    required?: boolean;
    customValidator?: (email: string) => string;
  };
  passwordValidation?: {
    required?: boolean;
    minLength?: number;
    customValidator?: (password: string) => string;
  };

  // Accessibility configuration
  accessibility?: {
    formLabel?: string;
    announceValidation?: boolean;
    announceSubmission?: boolean;
  };

  // Event handlers
  onSubmit?: (credentials: LoginCredentials) => Promise<boolean>;
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Page Layout Contract
export interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
  showSidebar?: boolean;
  sidebarExpanded?: boolean;
  headerActions?: HeaderAction[];
  user?: UserInfo | null;
  notifications?: NotificationItem[];
  maxWidth?: string;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  headerTheme?: 'white' | 'g10' | 'g90' | 'g100';
  sidebarTheme?: 'white' | 'g10' | 'g90' | 'g100';
}

export interface BreadcrumbItem {
  text: string;
  href?: string;
}

export interface HeaderAction {
  text: string;
  icon: any;
  isOpen?: boolean;
  onClick?: () => void;
  panel?: HeaderPanelItem[];
}

export interface HeaderPanelItem {
  text?: string;
  href?: string;
  onClick?: () => void;
  divider?: boolean;
}

export interface UserInfo {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
  href?: string;
  read?: boolean;
}

export interface CarbonLoginFormEvents {
  submit: { credentials: LoginCredentials };
  success: { user: any };
  error: { message: string };
  validationChange: { isValid: boolean; errors: Record<string, string> };
}

// Dashboard Tile Contract
export interface CarbonDashboardTileProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage?: number;
    description?: string;
  };
  icon?: any; // Carbon icon component
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'teal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  loading?: boolean;
  href?: string;

  // Content slots
  content?: string;
  footer?: string;

  // Accessibility
  accessibility?: {
    tileLabel?: string;
    announceChanges?: boolean;
  };

  // Event handlers
  onClick?: () => void;
  onHover?: () => void;
}

export interface CarbonDashboardTileEvents {
  click: {};
  hover: {};
  focus: {};
}

// Data Table Contract (extend existing)
export interface CarbonColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'boolean' | 'tag' | 'component';
  format?: (value: any, row: any) => string;
  component?: any; // Svelte component
  tagVariant?: (value: any, row: any) => string;
  carbonProps?: Record<string, any>;
}

export interface BatchAction {
  key: string;
  label: string;
  icon?: any;
  destructive?: boolean;
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: any;
  primary?: boolean;
}

// Navigation Shell Contract (extend existing)
export interface CarbonNavigationShellProps {
  // Header configuration
  companyName?: string;
  productName?: string;
  headerActions?: HeaderAction[];

  // Navigation configuration
  navigationItems?: NavigationItem[];
  showSkipLink?: boolean;

  // User context
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };

  // Search configuration
  searchConfig?: {
    enabled: boolean;
    placeholder?: string;
    onSearch?: (query: string) => void;
  };

  // Notifications
  notifications?: Notification[];

  // Accessibility
  accessibility?: {
    skipLinkText?: string;
    mainContentLabel?: string;
    navigationLabel?: string;
    announceNavigation?: boolean;
  };

  // Theme and appearance
  theme?: 'white' | 'g10' | 'g90' | 'g100';
  sideNavExpanded?: boolean;

  // Event handlers
  onNavigation?: (item: NavigationItem) => void;
  onUserAction?: (action: string) => void;
  onNotificationAction?: (notification: Notification, action: string) => void;
}

export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: any;
  children?: NavigationItem[];
  active?: boolean;
  disabled?: boolean;
}

export interface HeaderAction {
  id: string;
  label: string;
  icon?: any;
  href?: string;
  onClick?: () => void;
}

export interface Notification {
  id: string;
  title: string;
  subtitle?: string;
  kind: 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';
  timestamp?: Date;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

// Form Pattern Contract
export interface CarbonFormPatternProps {
  title?: string;
  subtitle?: string;
  fields: FormField[];
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;

  // Layout configuration
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: 1 | 2 | 3;

  // Validation
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  showValidationSummary?: boolean;

  // Accessibility
  accessibility?: {
    formLabel?: string;
    announceValidation?: boolean;
    announceSubmission?: boolean;
  };

  // Event handlers
  onSubmit?: (data: Record<string, any>) => Promise<boolean>;
  onCancel?: () => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  onFieldChange?: (fieldId: string, value: any) => void;
}

// Page Layout Component
export interface NavItem {
  type?: 'link' | 'menu' | 'divider';
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface NotificationItem {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  showToast?: boolean;
  timeout?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UserInfo {
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

export interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  navigationItems?: NavItem[];
  breadcrumbs?: BreadcrumbItem[];
  showHeader?: boolean;
  showSideNav?: boolean;
  sideNavRail?: boolean;
  fixedSideNav?: boolean;
  headerActions?: HeaderAction[];
  theme?: 'white' | 'g10' | 'g80' | 'g90' | 'g100';
  contentPadding?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xlg' | 'max' | 'full';
  notifications?: NotificationItem[];
  userInfo?: UserInfo | null;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  customHeaderSlot?: boolean;
  customSideNavSlot?: boolean;
  loading?: boolean;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;

  // Field-specific configuration
  options?: SelectOption[]; // for select, radio
  multiple?: boolean; // for select, file
  min?: number | string; // for number, date
  max?: number | string; // for number, date
  rows?: number; // for textarea
  accept?: string; // for file

  // Validation
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    customValidator?: (value: any) => string;
  };

  // Value and default
  value?: any;
  defaultValue?: any;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CarbonFormPatternEvents {
  submit: { data: Record<string, any> };
  cancel: {};
  validationChange: { isValid: boolean; errors: Record<string, string> };
  fieldChange: { fieldId: string; value: any };
}

// Global theme configuration
export interface CarbonThemeConfig {
  theme: 'white' | 'g10' | 'g90' | 'g100';
  motion: boolean;
  grid: boolean;
}

// Common accessibility interface
export interface AccessibilityConfig {
  announcements?: boolean;
  skipLinks?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
  focusManagement?: boolean;
}

// Event dispatcher type helper
export type ComponentEventDispatcher<T> = (event: string, detail?: T) => void;