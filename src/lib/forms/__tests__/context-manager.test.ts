import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	FormContextManager,
	globalFormContextManager,
	formContextStore,
	useFormContext,
	createContextualForm,
	HR_FORM_CONTEXTS
} from '../utils/context-manager';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Mock console methods
const consoleMock = {
	log: vi.fn(),
	error: vi.fn(),
	warn: vi.fn()
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('FormContextManager', () => {
	let contextManager: FormContextManager;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);

		// Create fresh instance
		contextManager = new FormContextManager('test-context');
	});

	afterEach(() => {
		contextManager.clearContext();
		vi.clearAllTimers();
	});

	describe('Context Management', () => {
		it('sets context correctly', () => {
			const contextData = {
				type: 'employee_onboarding',
				entityId: 'emp-123',
				metadata: { department: 'engineering' }
			};

			contextManager.setContext(contextData);
			const context = contextManager.getContext();

			expect(context).toBeDefined();
			expect(context?.type).toBe('employee_onboarding');
			expect(context?.entityId).toBe('emp-123');
			expect(context?.metadata?.department).toBe('engineering');
			expect(context?.isDraft).toBe(false);
			expect(context?.autoSaveEnabled).toBe(false);
		});

		it('generates unique context IDs', () => {
			const contextData1 = { type: 'test', entityId: 'entity1' };
			const contextData2 = { type: 'test', entityId: 'entity2' };

			contextManager.setContext(contextData1);
			const context1 = contextManager.getContext();

			// Create new manager to avoid conflicts
			const contextManager2 = new FormContextManager('test-context-2');
			contextManager2.setContext(contextData2);
			const context2 = contextManager2.getContext();

			expect(context1?.id).toBeDefined();
			expect(context2?.id).toBeDefined();
			expect(context1?.id).not.toBe(context2?.id);
		});

		it('clears context and disables auto-save', () => {
			contextManager.setContext({ type: 'test' });
			contextManager.enableAutoSave();

			expect(contextManager.getContext()).toBeDefined();

			contextManager.clearContext();

			expect(contextManager.getContext()).toBeNull();
			// Auto-save should be disabled (tested via console logs)
		});

		it('saves context to localStorage', () => {
			const contextData = { type: 'test', entityId: 'test-entity' };
			contextManager.setContext(contextData);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'test-context',
				expect.stringContaining('"type":"test"')
			);
		});
	});

	describe('Contextual Form Loading', () => {
		it('loads contextual forms by type', async () => {
			contextManager.setContext({ type: 'employee_onboarding' });

			const template = await contextManager.loadContextualForm('employee_onboarding');

			expect(template).toBeDefined();
			expect(template.name).toBe('Employee Onboarding');
			expect(template.category).toBe('onboarding');
		});

		it('loads leave request form', async () => {
			const template = await contextManager.loadContextualForm('leave_request');

			expect(template).toBeDefined();
			expect(template.name).toBe('Leave Request');
		});

		it('loads document upload form', async () => {
			const template = await contextManager.loadContextualForm('document_upload');

			expect(template).toBeDefined();
			expect(template.name).toBe('Document Upload');
		});

		it('updates context with loaded template', async () => {
			contextManager.setContext({ type: 'performance_review' });

			const template = await contextManager.loadContextualForm('performance_review');
			const context = contextManager.getContext();

			expect(context?.template).toBeDefined();
			expect(context?.template?.name).toBe(template.name);
		});

		it('throws error for unknown context type', async () => {
			await expect(contextManager.loadContextualForm('unknown-type')).rejects.toThrow(
				'No template found for context type: unknown-type'
			);
		});

		it('uses explicit formType when provided', async () => {
			const template = await contextManager.loadContextualForm(
				'unknown-type',
				undefined,
				'leave-request'
			);

			expect(template.name).toBe('Leave Request');
		});
	});

	describe('Draft Management', () => {
		beforeEach(() => {
			contextManager.setContext({ type: 'test', entityId: 'test-entity' });
		});

		it('saves and loads drafts', async () => {
			const formData = { field1: 'value1', field2: 'value2' };

			await contextManager.saveDraft(formData);
			const loadedData = await contextManager.loadDraft();

			expect(loadedData).toEqual(formData);

			const context = contextManager.getContext();
			expect(context?.isDraft).toBe(true);
			expect(context?.lastSaved).toBeInstanceOf(Date);
		});

		it('returns null when no draft exists', async () => {
			localStorageMock.getItem.mockReturnValue(null);

			const loadedData = await contextManager.loadDraft();
			expect(loadedData).toBeNull();
		});

		it('handles corrupted draft data', async () => {
			localStorageMock.getItem.mockReturnValue('invalid-json');

			const loadedData = await contextManager.loadDraft();
			expect(loadedData).toBeNull();
			expect(consoleMock.error).toHaveBeenCalled();
		});

		it('clears drafts', () => {
			contextManager.clearDraft();

			expect(localStorageMock.removeItem).toHaveBeenCalled();

			const context = contextManager.getContext();
			expect(context?.isDraft).toBe(false);
			expect(context?.lastSaved).toBeUndefined();
		});

		it('throws error when saving without context', async () => {
			contextManager.clearContext();

			await expect(contextManager.saveDraft({ test: 'data' })).rejects.toThrow(
				'No form context available for saving draft'
			);
		});
	});

	describe('Auto-save Functionality', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			contextManager.setContext({ type: 'test' });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('enables auto-save with default interval', () => {
			contextManager.enableAutoSave();

			const context = contextManager.getContext();
			expect(context?.autoSaveEnabled).toBe(true);
		});

		it('enables auto-save with custom interval', () => {
			contextManager.enableAutoSave(10000); // 10 seconds

			const context = contextManager.getContext();
			expect(context?.autoSaveEnabled).toBe(true);
		});

		it('disables auto-save', () => {
			contextManager.enableAutoSave();
			contextManager.disableAutoSave();

			const context = contextManager.getContext();
			expect(context?.autoSaveEnabled).toBe(false);
		});

		it('auto-saves form data at intervals', async () => {
			const saveDraftSpy = vi.spyOn(contextManager, 'saveDraft').mockResolvedValue();

			contextManager.updateFormData({ field: 'value' });
			contextManager.enableAutoSave(1000); // 1 second

			// Advance timer
			vi.advanceTimersByTime(1000);

			expect(saveDraftSpy).toHaveBeenCalledWith({ field: 'value' });
		});

		it('does not auto-save empty form data', async () => {
			const saveDraftSpy = vi.spyOn(contextManager, 'saveDraft').mockResolvedValue();

			contextManager.enableAutoSave(1000);

			// Advance timer without setting form data
			vi.advanceTimersByTime(1000);

			expect(saveDraftSpy).not.toHaveBeenCalled();
		});

		it('handles auto-save errors gracefully', async () => {
			const saveDraftSpy = vi
				.spyOn(contextManager, 'saveDraft')
				.mockRejectedValue(new Error('Save failed'));

			contextManager.updateFormData({ field: 'value' });
			contextManager.enableAutoSave(1000);

			vi.advanceTimersByTime(1000);

			expect(saveDraftSpy).toHaveBeenCalled();
			expect(consoleMock.error).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));
		});
	});

	describe('Storage Management', () => {
		it('loads context from storage on initialization', () => {
			const storedContext = JSON.stringify({
				id: 'stored-context',
				type: 'test',
				isDraft: true
			});
			localStorageMock.getItem.mockReturnValue(storedContext);

			const newManager = new FormContextManager('test-storage');
			const context = newManager.getContext();

			expect(context?.id).toBe('stored-context');
			expect(context?.type).toBe('test');
			expect(context?.isDraft).toBe(true);
		});

		it('handles corrupted storage data', () => {
			localStorageMock.getItem.mockReturnValue('invalid-json');

			// Should not throw, but log error
			const newManager = new FormContextManager('test-corrupted');
			expect(consoleMock.error).toHaveBeenCalled();
			expect(newManager.getContext()).toBeNull();
		});

		it('clears context and associated drafts from storage', () => {
			contextManager.setContext({ type: 'test' });
			contextManager.clearContext();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-context');
			// Should also remove associated draft
			expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
		});
	});
});

describe('Global Form Context', () => {
	it('provides global form context manager', () => {
		expect(globalFormContextManager).toBeInstanceOf(FormContextManager);
	});

	it('exports form context store', () => {
		expect(formContextStore).toBeDefined();

		// Should be a Svelte store
		expect(typeof formContextStore.subscribe).toBe('function');
	});

	it('provides useFormContext hook', () => {
		const { context, manager } = useFormContext();

		expect(context).toBe(formContextStore);
		expect(manager).toBe(globalFormContextManager);
	});
});

describe('createContextualForm utility', () => {
	it('creates contextual form with initialization', async () => {
		const contextualForm = createContextualForm('employee_onboarding', 'emp-123');

		const template = await contextualForm.initialize();

		expect(template).toBeDefined();
		expect(template.name).toBe('Employee Onboarding');
	});

	it('provides draft management methods', async () => {
		const contextualForm = createContextualForm('test_context');

		// Initialize first
		await contextualForm.initialize();

		// Test draft methods
		await contextualForm.saveDraft({ test: 'data' });
		const loadedData = await contextualForm.loadDraft();

		expect(loadedData).toEqual({ test: 'data' });
	});

	it('provides auto-save control', async () => {
		const contextualForm = createContextualForm('test_context');
		await contextualForm.initialize();

		// Should not throw
		contextualForm.enableAutoSave(5000);
		contextualForm.cleanup();
	});
});

describe('HR Form Contexts', () => {
	it('defines correct HR context constants', () => {
		expect(HR_FORM_CONTEXTS.EMPLOYEE_ONBOARDING).toBe('employee_onboarding');
		expect(HR_FORM_CONTEXTS.PERFORMANCE_REVIEW).toBe('performance_review');
		expect(HR_FORM_CONTEXTS.EXIT_INTERVIEW).toBe('exit_interview');
		expect(HR_FORM_CONTEXTS.LEAVE_REQUEST).toBe('leave_request');
		expect(HR_FORM_CONTEXTS.DISCIPLINARY_ACTION).toBe('disciplinary_action');
		expect(HR_FORM_CONTEXTS.TRAINING_REQUEST).toBe('training_request');
		expect(HR_FORM_CONTEXTS.DOCUMENT_UPLOAD).toBe('document_upload');
		expect(HR_FORM_CONTEXTS.COMPLIANCE_CHECK).toBe('compliance_check');
	});

	it('maps context types to templates correctly', async () => {
		const contextManager = new FormContextManager();

		// Test various context mappings
		const onboarding = await contextManager.loadContextualForm(
			HR_FORM_CONTEXTS.EMPLOYEE_ONBOARDING
		);
		const leave = await contextManager.loadContextualForm(HR_FORM_CONTEXTS.LEAVE_REQUEST);
		const performance = await contextManager.loadContextualForm(
			HR_FORM_CONTEXTS.PERFORMANCE_REVIEW
		);
		const document = await contextManager.loadContextualForm(HR_FORM_CONTEXTS.DOCUMENT_UPLOAD);

		expect(onboarding.name).toBe('Employee Onboarding');
		expect(leave.name).toBe('Leave Request');
		expect(performance.name).toBe('Performance Review');
		expect(document.name).toBe('Document Upload');
	});
});
