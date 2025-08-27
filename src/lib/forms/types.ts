// Form system types following the frontend-forms-guide.md patterns

export interface FormTemplate {
  id: string;
  name: string;
  category: string;
  template_schema: FormSchema;
  description?: string;
  is_active: boolean;
  version: number;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  form_schema: FormSchema;
  is_active: boolean;
  template?: FormTemplate;
  created_by: string;
  created_at: string;
}

export interface FormSchema {
  fields: FormField[];
  validation_rules?: ValidationRule[];
  ui_config?: UiConfig;
}

export interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  ui_config?: FieldUiConfig;
  description?: string;
}

export type FieldType = 
  | 'text' | 'textarea' | 'email' | 'phone' | 'number' 
  | 'date' | 'select' | 'multi_select' | 'radio' | 'checkbox'
  | 'file' | 'section' | 'divider';

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: CustomValidation[];
}

export interface CustomValidation {
  rule: string;
  message: string;
  params?: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  params?: Record<string, any>;
}

export interface FieldUiConfig {
  section?: string;
  column_span?: number;
  placeholder?: string;
  help_text?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: string;
  conditional_display?: ConditionalDisplay;
}

export interface ConditionalDisplay {
  depends_on: string;
  condition: 'equals' | 'not_equals' | 'contains';
  value: any;
}

export interface UiConfig {
  layout?: 'single_column' | 'two_column' | 'three_column';
  theme?: string;
  show_progress?: boolean;
  sections?: UiSection[];
}

export interface UiSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  fields: string[];
}

export interface FormContextData {
  type: string;          // 'performance_review', 'exit_interview', etc.
  entityId: string;      // Related entity ID
  metadata?: any;        // Additional context-specific data
}

export interface FormSubmission {
  id: string;
  form_id: string;
  submission_data: Record<string, any>;
  context_type?: string;
  context_entity_id?: string;
  context_metadata?: any;
  submitted_by: string;
  submitted_at: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Form context types for HR domain
export type HRFormContext = 
  | 'employee_onboarding'
  | 'performance_review' 
  | 'exit_interview'
  | 'leave_request'
  | 'disciplinary_action'
  | 'training_request'
  | 'document_upload'
  | 'compliance_check'
  | 'task_creation';

// Form status for tracking
export type FormStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

// Form builder interface
export interface FormBuilder {
  addField: (field: Omit<FormField, 'id'>) => string;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  addSection: (section: UiSection) => void;
  removeSection: (sectionId: string) => void;
  updateValidation: (rules: ValidationRule[]) => void;
  build: () => FormSchema;
}

// Form loading options
export interface FormLoadOptions {
  context?: FormContextData;
  includeInactive?: boolean;
  version?: number;
  populate?: string[];
}

// Form save options
export interface FormSaveOptions {
  isDraft?: boolean;
  validate?: boolean;
  context?: FormContextData;
  metadata?: Record<string, any>;
}