/**
 * SvelteHR Design System - TypeScript Definitions
 * Type definitions for design tokens, component variants, and design system utilities
 */

/* =========================
   COLOR SYSTEM TYPES
   ========================= */

export type ColorScale =
	| '50'
	| '100'
	| '200'
	| '300'
	| '400'
	| '500'
	| '600'
	| '700'
	| '800'
	| '900'
	| '950';

export type PrimaryColor = `primary-${ColorScale}`;
export type SecondaryColor = `secondary-${ColorScale}`;
export type SuccessColor = `success-${ColorScale}`;
export type WarningColor = `warning-${ColorScale}`;
export type ErrorColor = `error-${ColorScale}`;
export type InfoColor = `info-${ColorScale}`;

export type SemanticColor =
	| PrimaryColor
	| SecondaryColor
	| SuccessColor
	| WarningColor
	| ErrorColor
	| InfoColor;

/* HR-Specific Color Types */
export type DepartmentColor =
	| 'dept-hr'
	| 'dept-finance'
	| 'dept-engineering'
	| 'dept-marketing'
	| 'dept-sales'
	| 'dept-operations'
	| 'dept-legal'
	| 'dept-admin';

export type StatusColor =
	| 'status-active'
	| 'status-inactive'
	| 'status-pending'
	| 'status-approved'
	| 'status-rejected'
	| 'status-draft'
	| 'status-review';

export type PriorityColor =
	| 'priority-low'
	| 'priority-medium'
	| 'priority-high'
	| 'priority-urgent';

/* =========================
   TYPOGRAPHY TYPES
   ========================= */

export type FontSize =
	| 'xs'
	| 'sm'
	| 'base'
	| 'md'
	| 'lg'
	| 'xl'
	| '2xl'
	| '3xl'
	| '4xl'
	| '5xl'
	| '6xl';

export type FontWeight =
	| 'thin'
	| 'extralight'
	| 'light'
	| 'normal'
	| 'medium'
	| 'semibold'
	| 'bold'
	| 'extrabold'
	| 'black';

export type LineHeight = 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';

export type LetterSpacing = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';

export type FontFamily = 'sans' | 'mono' | 'display';

/* =========================
   SPACING TYPES
   ========================= */

export type SpacingScale =
	| '0'
	| 'px'
	| '0.5'
	| '1'
	| '1.5'
	| '2'
	| '2.5'
	| '3'
	| '3.5'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| '10'
	| '11'
	| '12'
	| '14'
	| '16'
	| '20'
	| '24'
	| '28'
	| '32'
	| '36'
	| '40'
	| '44'
	| '48'
	| '52'
	| '56'
	| '60'
	| '64'
	| '72'
	| '80'
	| '96';

/* =========================
   BORDER RADIUS TYPES
   ========================= */

export type BorderRadius = 'none' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

/* =========================
   SHADOW TYPES
   ========================= */

export type ShadowSize = 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';

/* =========================
   MOTION TYPES
   ========================= */

export type EasingFunction = 'linear' | 'in' | 'out' | 'in-out' | 'bounce';

export type Duration = 'instant' | '75' | '100' | '150' | '200' | '300' | '500' | '700' | '1000';

/* =========================
   COMPONENT SIZE TYPES
   ========================= */

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* Button specific sizes */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

/* Input specific sizes */
export type InputSize = ComponentSize;

/* =========================
   COMPONENT VARIANT TYPES
   ========================= */

/* Button Variants */
export type ButtonVariant =
	| 'default'
	| 'destructive'
	| 'outline'
	| 'secondary'
	| 'ghost'
	| 'link'
	| 'success'
	| 'warning'
	| 'info';

export type ButtonState = 'default' | 'loading' | 'disabled' | 'pressed';

export interface ButtonIconVariant {
	position: 'left' | 'right' | 'only';
	size?: ComponentSize;
}

/* Input Variants */
export type InputVariant = 'default' | 'error' | 'success' | 'warning';

export type InputState = 'default' | 'focused' | 'error' | 'disabled' | 'readonly';

/* Card Variants */
export type CardVariant = 'default' | 'outline' | 'ghost' | 'elevated' | 'interactive';

export type CardState = 'default' | 'loading' | 'error' | 'selected' | 'disabled';

/* Alert Variants */
export type AlertVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

/* Badge Variants */
export type BadgeVariant =
	| 'default'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'error'
	| 'info'
	| 'outline'
	| 'ghost';

/* =========================
   ACCESSIBILITY TYPES
   ========================= */

export type AriaRole =
	| 'button'
	| 'link'
	| 'tab'
	| 'tabpanel'
	| 'dialog'
	| 'alert'
	| 'status'
	| 'region'
	| 'main'
	| 'navigation'
	| 'banner'
	| 'contentinfo'
	| 'complementary'
	| 'search'
	| 'form';

export type AriaLiveRegion = 'off' | 'polite' | 'assertive';

/* =========================
   RESPONSIVE BREAKPOINTS
   ========================= */

export type Breakpoint =
	| 'sm' // 640px
	| 'md' // 768px
	| 'lg' // 1024px
	| 'xl' // 1280px
	| '2xl'; // 1536px

/* =========================
   THEME TYPES
   ========================= */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
	mode: ThemeMode;
	primaryColor: string;
	radius: BorderRadius;
	density: 'compact' | 'normal' | 'comfortable';
}

/* =========================
   COMPONENT PROP INTERFACES
   ========================= */

/* Base Component Props */
export interface BaseComponentProps {
	size?: ComponentSize;
	variant?: string;
	disabled?: boolean;
	loading?: boolean;
	className?: string;
	id?: string;
	testId?: string;
}

/* Enhanced Button Props */
export interface EnhancedButtonProps extends Omit<BaseComponentProps, 'size'> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: ButtonIconVariant;
	loadingText?: string;
	fullWidth?: boolean;
	href?: string;
	external?: boolean;
}

/* Enhanced Input Props */
export interface EnhancedInputProps extends BaseComponentProps {
	variant?: InputVariant;
	size?: InputSize;
	label?: string;
	description?: string;
	error?: string;
	success?: string;
	warning?: string;
	placeholder?: string;
	required?: boolean;
	readonly?: boolean;
	maxLength?: number;
	showCount?: boolean;
	clearable?: boolean;
	prefix?: string;
	suffix?: string;
	prefixIcon?: any;
	suffixIcon?: any;
	characterLimit?: number;
	showCharacterCount?: boolean;
	loading?: boolean;
}

/* Enhanced Card Props */
export interface EnhancedCardProps extends BaseComponentProps {
	variant?: CardVariant;
	clickable?: boolean;
	elevated?: boolean;
	padding?: SpacingScale;
	gap?: SpacingScale;
	selected?: boolean;
	selectionMode?: 'checkbox' | 'radio' | 'button';
	href?: string;
	external?: boolean;
}

/* Button Group Props */
export interface EnhancedButtonGroupProps extends BaseComponentProps {
	orientation?: 'horizontal' | 'vertical';
	attached?: boolean;
	exclusive?: boolean;
	value?: any;
	fullWidth?: boolean;
	ariaLabel?: string;
	ariaLabelledBy?: string;
}

/* Select Option Interface */
export interface SelectOption {
	value: any;
	label: string;
	disabled?: boolean;
	description?: string;
	icon?: any;
	group?: string;
}

/* Enhanced Select Props */
export interface EnhancedSelectProps extends BaseComponentProps {
	options?: SelectOption[];
	multiple?: boolean;
	searchable?: boolean;
	clearable?: boolean;
	placeholder?: string;
	searchPlaceholder?: string;
	loadingText?: string;
	emptyText?: string;
	maxSelected?: number;
	customRender?: (option: SelectOption) => string;
	onSearch?: (query: string) => Promise<SelectOption[]> | SelectOption[];
}

/* =========================
   FORM VALIDATION TYPES
   ========================= */

export type ValidationState = 'valid' | 'invalid' | 'pending';

export interface ValidationResult {
	state: ValidationState;
	message?: string;
	type?: 'error' | 'warning' | 'success';
}

/* =========================
   DATA TABLE TYPES
   ========================= */

export type TableDensity = 'compact' | 'normal' | 'comfortable';
export type SortDirection = 'asc' | 'desc' | null;
export type FilterOperator =
	| 'equals'
	| 'contains'
	| 'startsWith'
	| 'endsWith'
	| 'gt'
	| 'lt'
	| 'gte'
	| 'lte';

export interface TableColumn<T = any> {
	id: string;
	header: string;
	accessor?: keyof T | ((row: T) => any);
	sortable?: boolean;
	filterable?: boolean;
	width?: number | string;
	minWidth?: number;
	maxWidth?: number;
	align?: 'left' | 'center' | 'right';
	sticky?: 'left' | 'right';
}

export interface TableFilter {
	column: string;
	operator: FilterOperator;
	value: any;
}

export interface TableSort {
	column: string;
	direction: SortDirection;
}

/* =========================
   UTILITY TYPES
   ========================= */

/* CSS-in-JS style object type */
export type StyleObject = {
	[key: string]: string | number | StyleObject;
};

/* Component ref type */
export type ComponentRef<T = HTMLElement> = T | null;

/* Event handler types */
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/* Animation state */
export type AnimationState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

/* Focus management */
export type FocusDirection = 'first' | 'last' | 'next' | 'previous';

/* =========================
   HR-SPECIFIC TYPES
   ========================= */

/* Employee Status */
export type EmployeeStatus = 'active' | 'inactive' | 'pending' | 'terminated' | 'on-leave';

/* Job Levels */
export type JobLevel =
	| 'entry'
	| 'junior'
	| 'mid'
	| 'senior'
	| 'lead'
	| 'manager'
	| 'director'
	| 'vp'
	| 'c-level';

/* Performance Rating */
export type PerformanceRating = 'exceeds' | 'meets' | 'below' | 'needs-improvement' | 'unrated';

/* Leave Types */
export type LeaveType =
	| 'vacation'
	| 'sick'
	| 'personal'
	| 'bereavement'
	| 'jury-duty'
	| 'maternity'
	| 'paternity';

/* Document Types */
export type DocumentType =
	| 'contract'
	| 'handbook'
	| 'policy'
	| 'form'
	| 'certificate'
	| 'review'
	| 'offer';

/* Export all types for external use - removed duplicate exports */
