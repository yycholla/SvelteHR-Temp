import { writable } from 'svelte/store';
import type { FormTemplate, FormSchema, FormContextData, FormSubmission } from '$lib/forms/types';
import { loadFormTemplate, createFormFromTemplate } from './template-loader';

export interface FormContext {
  id: string;
  type: string;
  entityId?: string;
  metadata?: Record<string, any>;
  template?: FormTemplate;
  isDraft: boolean;
  lastSaved?: Date;
  autoSaveEnabled: boolean;
}

export interface FormContextManager {
  // Context management
  setContext: (context: FormContextData) => void;
  getContext: () => FormContext | null;
  clearContext: () => void;
  
  // Form lifecycle
  loadContextualForm: (contextType: string, entityId?: string, formType?: string) => Promise<FormTemplate>;
  saveDraft: (formData: Record<string, any>) => Promise<void>;
  loadDraft: () => Promise<Record<string, any> | null>;
  clearDraft: () => void;
  
  // Auto-save functionality
  enableAutoSave: (intervalMs?: number) => void;
  disableAutoSave: () => void;
}

// Global form context store
const formContextStore = writable<FormContext | null>(null);

// Auto-save interval reference
let autoSaveInterval: NodeJS.Timeout | null = null;

/**
 * Form Context Manager - handles form state, persistence, and context-aware loading
 */
export class FormContextManager implements FormContextManager {
  private context: FormContext | null = null;
  private currentFormData: Record<string, any> = {};
  
  constructor(private storageKey = 'hr-form-context') {
    // Subscribe to context store
    formContextStore.subscribe(value => {
      this.context = value;
    });
    
    // Load context from localStorage on initialization
    this.loadContextFromStorage();
  }
  
  /**
   * Set the current form context
   */
  setContext(contextData: FormContextData): void {
    const newContext: FormContext = {
      id: `${contextData.type}-${contextData.entityId || 'new'}-${Date.now()}`,
      type: contextData.type,
      entityId: contextData.entityId,
      metadata: contextData.metadata,
      isDraft: false,
      autoSaveEnabled: false
    };
    
    this.context = newContext;
    formContextStore.set(newContext);
    this.saveContextToStorage();
  }
  
  /**
   * Get the current form context
   */
  getContext(): FormContext | null {
    return this.context;
  }
  
  /**
   * Clear the current form context
   */
  clearContext(): void {
    this.disableAutoSave();
    this.context = null;
    formContextStore.set(null);
    this.clearContextFromStorage();
  }
  
  /**
   * Load a form template appropriate for the current context
   */
  async loadContextualForm(contextType: string, entityId?: string, formType?: string): Promise<FormTemplate> {
    try {
      // Map context types to template IDs
      const templateMap: Record<string, string> = {
        'employee_onboarding': 'employee-onboarding',
        'onboarding': 'employee-onboarding',
        'leave_request': 'leave-request',
        'performance_review': 'performance-review',
        'document_upload': 'document-upload',
        'exit_interview': 'exit-interview', // Would need to create this template
        'disciplinary_action': 'disciplinary-action', // Would need to create this template
        'training_request': 'training-request' // Would need to create this template
      };
      
      const templateId = templateMap[contextType] || formType;
      
      if (!templateId) {
        throw new Error(`No template found for context type: ${contextType}`);
      }
      
      // Load the appropriate template
      const template = await loadFormTemplate(templateId);
      
      // Update context with loaded template
      if (this.context) {
        this.context.template = template;
        formContextStore.set(this.context);
        this.saveContextToStorage();
      }
      
      return template;
    } catch (error) {
      console.error('Failed to load contextual form:', error);
      throw error;
    }
  }
  
  /**
   * Save form data as draft
   */
  async saveDraft(formData: Record<string, any>): Promise<void> {
    if (!this.context) {
      throw new Error('No form context available for saving draft');
    }
    
    if (typeof localStorage === 'undefined') {
      // In test/server environment, just update the context without persistence
      this.context.isDraft = true;
      this.context.lastSaved = new Date();
      this.currentFormData = { ...formData };
      formContextStore.set(this.context);
      return;
    }
    
    try {
      const draftKey = `${this.storageKey}-draft-${this.context.id}`;
      const draftData = {
        contextId: this.context.id,
        formData,
        savedAt: new Date().toISOString(),
        version: 1
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      // Update context
      this.context.isDraft = true;
      this.context.lastSaved = new Date();
      this.currentFormData = { ...formData };
      
      formContextStore.set(this.context);
      this.saveContextToStorage();
      
      console.log('📝 Draft saved successfully');
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  }
  
  /**
   * Load saved form draft
   */
  async loadDraft(): Promise<Record<string, any> | null> {
    if (!this.context) {
      return null;
    }
    
    if (typeof localStorage === 'undefined') {
      // In test/server environment, return current form data
      return this.currentFormData;
    }
    
    try {
      const draftKey = `${this.storageKey}-draft-${this.context.id}`;
      const draftJson = localStorage.getItem(draftKey);
      
      if (!draftJson) {
        return null;
      }
      
      const draftData = JSON.parse(draftJson);
      this.currentFormData = draftData.formData || {};
      
      console.log('📝 Draft loaded successfully');
      return this.currentFormData;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }
  
  /**
   * Clear saved draft
   */
  clearDraft(): void {
    if (!this.context) {
      return;
    }
    
    try {
      const draftKey = `${this.storageKey}-draft-${this.context.id}`;
      localStorage.removeItem(draftKey);
      
      if (this.context) {
        this.context.isDraft = false;
        this.context.lastSaved = undefined;
        formContextStore.set(this.context);
        this.saveContextToStorage();
      }
      
      this.currentFormData = {};
      console.log('🗑️ Draft cleared successfully');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }
  
  /**
   * Enable auto-save functionality
   */
  enableAutoSave(intervalMs = 30000): void {
    if (!this.context) {
      console.warn('No form context available for auto-save');
      return;
    }
    
    this.disableAutoSave(); // Clear any existing interval
    
    autoSaveInterval = setInterval(async () => {
      if (this.currentFormData && Object.keys(this.currentFormData).length > 0) {
        try {
          await this.saveDraft(this.currentFormData);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, intervalMs);
    
    if (this.context) {
      this.context.autoSaveEnabled = true;
      formContextStore.set(this.context);
      this.saveContextToStorage();
    }
    
    console.log(`🔄 Auto-save enabled (${intervalMs}ms interval)`);
  }
  
  /**
   * Disable auto-save functionality
   */
  disableAutoSave(): void {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
    
    if (this.context) {
      this.context.autoSaveEnabled = false;
      formContextStore.set(this.context);
      this.saveContextToStorage();
    }
    
    console.log('⏹️ Auto-save disabled');
  }
  
  /**
   * Update current form data (for auto-save tracking)
   */
  updateFormData(formData: Record<string, any>): void {
    this.currentFormData = { ...formData };
  }
  
  // Private methods for storage management
  private saveContextToStorage(): void {
    if (this.context && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.context));
      } catch (error) {
        console.error('Failed to save context to storage:', error);
      }
    }
  }
  
  private loadContextFromStorage(): void {
    // Check if localStorage is available (browser environment)
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const contextJson = localStorage.getItem(this.storageKey);
      if (contextJson) {
        const context = JSON.parse(contextJson);
        this.context = context;
        formContextStore.set(context);
      }
    } catch (error) {
      console.error('Failed to load context from storage:', error);
    }
  }
  
  private clearContextFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(this.storageKey);
      
      // Also clear any associated drafts
      if (this.context) {
        const draftKey = `${this.storageKey}-draft-${this.context.id}`;
        localStorage.removeItem(draftKey);
      }
    } catch (error) {
      console.error('Failed to clear context from storage:', error);
    }
  }
}

// Global instance
export const globalFormContextManager = new FormContextManager();

// Store exports for reactive components
export { formContextStore };

// Utility functions
export function useFormContext() {
  return {
    context: formContextStore,
    manager: globalFormContextManager
  };
}

/**
 * Context-aware form loader hook
 */
export function createContextualForm(contextType: string, entityId?: string) {
  const manager = new FormContextManager();
  
  return {
    async initialize() {
      manager.setContext({ type: contextType, entityId });
      return await manager.loadContextualForm(contextType, entityId);
    },
    
    async saveDraft(formData: Record<string, any>) {
      return await manager.saveDraft(formData);
    },
    
    async loadDraft() {
      return await manager.loadDraft();
    },
    
    enableAutoSave(intervalMs?: number) {
      manager.enableAutoSave(intervalMs);
    },
    
    cleanup() {
      manager.clearContext();
    }
  };
}

// Form context types for HR domain
export const HR_FORM_CONTEXTS = {
  EMPLOYEE_ONBOARDING: 'employee_onboarding',
  PERFORMANCE_REVIEW: 'performance_review',
  EXIT_INTERVIEW: 'exit_interview', 
  LEAVE_REQUEST: 'leave_request',
  DISCIPLINARY_ACTION: 'disciplinary_action',
  TRAINING_REQUEST: 'training_request',
  DOCUMENT_UPLOAD: 'document_upload',
  COMPLIANCE_CHECK: 'compliance_check'
} as const;