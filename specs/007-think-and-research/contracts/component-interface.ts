/**
 * Component Interface Contracts
 * Design System Component Definitions and Validation
 */

// Core Design System Types
export interface DesignToken {
  name: string
  category: 'spacing' | 'color' | 'typography' | 'motion'
  value: string | number
  description: string
  platforms: string[]
}

export interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: any
  description: string
  validation?: ValidationRule[]
}

export interface ComponentSlot {
  name: string
  required: boolean
  description: string
  allowedContent?: string[]
}

export interface ComponentEvent {
  name: string
  payload: string
  description: string
  when: string
}

// Accessibility Contracts
export interface AccessibilityFeatures {
  keyboardNavigation: KeyboardNavigation
  screenReader: ScreenReaderSupport
  visualAccess: VisualAccessibility
  cognitiveAccess: CognitiveAccessibility
}

export interface KeyboardNavigation {
  tabIndex: number | 'auto'
  customKeyHandlers: KeyHandler[]
  focusManagement: FocusManagement
  skipLinks?: SkipLink[]
}

export interface ScreenReaderSupport {
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  ariaRole?: string
  liveRegion?: 'polite' | 'assertive' | 'off'
  announcement?: string
}

export interface VisualAccessibility {
  contrastRatio: number
  colorIndependence: boolean
  scaleSupport: boolean
  motionReduction: boolean
}

export interface CognitiveAccessibility {
  clearLabels: boolean
  consistentNavigation: boolean
  errorPrevention: boolean
  helpAvailable: boolean
}

// Enhanced Component Contracts
export interface CarbonDataTableContract {
  // Required Props
  data: Record<string, any>[]
  columns: CarbonColumn[]

  // Optional Props
  loading?: boolean
  selectable?: boolean
  searchable?: boolean
  filterable?: boolean
  paginated?: boolean
  pageSize?: number
  pageSizes?: number[]
  batchActions?: BatchAction[]
  toolbarActions?: ToolbarAction[]
  exportable?: boolean

  // Events
  onRowClick?: (row: any) => void
  onSelectionChange?: (selectedRows: any[]) => void
  onBatchAction?: (action: string, selectedRows: any[]) => void
  onToolbarAction?: (action: string) => void
  onExport?: (data: any[]) => void

  // Accessibility
  accessibility: {
    tableLabel: string
    sortAnnouncements: boolean
    selectionAnnouncements: boolean
    paginationAnnouncements: boolean
  }
}

export interface CarbonColumn {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  type?: 'text' | 'number' | 'date' | 'boolean' | 'tag' | 'custom'
  format?: (value: any, row: any) => string
  component?: any
  tagVariant?: (value: any, row: any) => string
  accessibility?: {
    description?: string
    sortLabel?: string
  }
}

export interface CarbonNavigationShellContract {
  // Required Props
  user: UserContext
  primaryNavigation: NavigationItem[]

  // Optional Props
  breadcrumbs?: BreadcrumbItem[]
  userActions?: UserAction[]
  notifications?: NotificationItem[]
  searchEnabled?: boolean

  // Events
  onNavigate?: (item: NavigationItem) => void
  onUserAction?: (action: UserAction) => void
  onSearch?: (query: string) => void
  onNotificationDismiss?: (notification: NotificationItem) => void

  // Accessibility
  accessibility: {
    skipToContent: SkipLink
    keyboardShortcuts: KeyboardShortcut[]
    landmarks: ARIALandmark[]
  }
}

export interface CarbonFormPatternContract {
  // Required Props
  title: string
  fields: FormField[]
  onSubmit: (data: Record<string, any>) => Promise<void>

  // Optional Props
  description?: string
  actions?: FormAction[]
  validation?: ValidationSchema
  initialData?: Record<string, any>
  disabled?: boolean

  // Events
  onFieldChange?: (field: string, value: any) => void
  onValidation?: (errors: ValidationErrors) => void
  onReset?: () => void

  // Accessibility
  accessibility: {
    formLabel: string
    fieldGrouping: FieldGroup[]
    errorAnnouncements: boolean
    progressIndicator?: boolean
  }
}

// Supporting Types
export interface UserContext {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
  avatar?: string
}

export interface NavigationItem {
  id: string
  label: string
  href?: string
  icon?: any
  children?: NavigationItem[]
  permissions?: string[]
  active?: boolean
  badge?: string | number
}

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface FormField {
  name: string
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea' | 'number' | 'date'
  label: string
  required?: boolean
  placeholder?: string
  helpText?: string
  options?: SelectOption[]
  validation?: FieldValidation[]
  disabled?: boolean
  readonly?: boolean
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any) => boolean
}

// Performance Contracts
export interface PerformanceContract {
  bundleSize: {
    css: { max: 51200 }        // 50KB gzipped
    javascript: { max: 204800 } // 200KB gzipped
  }
  runtime: {
    firstPaint: { max: 100 }   // 100ms
    interaction: { max: 200 }  // 200ms
    frameRate: { min: 60 }     // 60fps
  }
  accessibility: {
    contrastRatio: { min: 4.5 }
    keyboardNavigation: true
    screenReaderSupport: true
  }
}

// Testing Contracts
export interface ComponentTestContract {
  unit: {
    props: PropTest[]
    events: EventTest[]
    slots: SlotTest[]
    accessibility: AccessibilityTest[]
  }
  integration: {
    componentInteraction: InteractionTest[]
    stateManagement: StateTest[]
    routing: RoutingTest[]
  }
  visual: {
    screenshots: ScreenshotTest[]
    responsive: ResponsiveTest[]
    themes: ThemeTest[]
  }
  performance: {
    rendering: RenderTest[]
    interaction: InteractionPerformanceTest[]
    memory: MemoryTest[]
  }
}

export interface AccessibilityTestContract {
  automated: {
    axeCore: boolean
    lighthouse: boolean
    waveApi: boolean
  }
  manual: {
    keyboardNavigation: KeyboardTest[]
    screenReader: ScreenReaderTest[]
    colorContrast: ContrastTest[]
  }
  compliance: {
    wcag21AA: boolean
    section508: boolean
    ada: boolean
  }
}

// Migration Contracts
export interface MigrationContract {
  from: {
    component: string
    version: string
    usage: ComponentUsage[]
  }
  to: {
    component: string
    version: string
    mapping: PropertyMapping[]
  }
  strategy: {
    type: 'replace' | 'gradual' | 'parallel'
    phases: MigrationPhase[]
    rollback: RollbackPlan
  }
  validation: {
    functionalTesting: boolean
    visualRegression: boolean
    performanceTesting: boolean
    accessibilityTesting: boolean
  }
}

// Error Handling Contracts
export interface ErrorHandlingContract {
  componentErrors: {
    gracefulDegradation: boolean
    fallbackComponent?: string
    errorBoundary: boolean
    userNotification: ErrorNotification
  }
  systemErrors: {
    errorLogging: boolean
    userFeedback: boolean
    recoveryOptions: RecoveryOption[]
  }
  validation: {
    clientSide: boolean
    serverSide: boolean
    realTime: boolean
    batchValidation: boolean
  }
}

// Type Guards and Validators
export function isValidDesignToken(token: any): token is DesignToken {
  return (
    typeof token === 'object' &&
    typeof token.name === 'string' &&
    ['spacing', 'color', 'typography', 'motion'].includes(token.category) &&
    (typeof token.value === 'string' || typeof token.value === 'number') &&
    typeof token.description === 'string' &&
    Array.isArray(token.platforms)
  )
}

export function isValidComponentContract(contract: any): boolean {
  // Implementation would validate contract structure
  return true // Placeholder
}

export function validateAccessibilityFeatures(features: AccessibilityFeatures): ValidationResult {
  // Implementation would validate accessibility requirements
  return { valid: true, errors: [] }
}

// Supporting Types (continued)
interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface PropertyMapping {
  from: string
  to: string
  transform?: (value: any) => any
}

interface MigrationPhase {
  name: string
  components: string[]
  timeline: string
  dependencies: string[]
}

interface ErrorNotification {
  type: 'toast' | 'inline' | 'modal'
  message: string
  recovery?: string
}