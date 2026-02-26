import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
const mutateMock = vi.fn();

vi.mock('$lib/server/graphql/unified-client', () => ({
	createGraphQLClient: vi.fn(() => ({
		query: queryMock,
		mutate: mutateMock
	}))
}));

vi.mock('$lib/utils/logger', () => ({
	logger: {
		error: vi.fn()
	}
}));

describe('admin onboarding [id]/forms +page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeEvent(overrides?: any): any {
		return {
			params: { id: 'module-1' },
			locals: {
				user: { id: 'admin-1', role: 'Admin', email: 'admin@example.com' }
			},
			request: {
				headers: new Headers({ cookie: 'session=test' })
			} as Request,
			...overrides
		};
	}

	it('load returns onboarding module and forms for admin', async () => {
		queryMock
			.mockResolvedValueOnce({ onboardingModule: { id: 'module-1', title: 'M1' } })
			.mockResolvedValueOnce({ onboardingFormsByModule: [{ id: 'f-1', sequenceOrder: 0 }] });

		const { load } = await import('$routes/admin/onboarding/[id]/forms/+page.server');
		const result = (await load(makeEvent() as any)) as any;

		expect(result.module.id).toBe('module-1');
		expect(result.forms).toHaveLength(1);
	});

	it('createForm action computes sequence order from existing forms', async () => {
		queryMock.mockResolvedValueOnce({
			onboardingFormsByModule: [{ id: 'a' }, { id: 'b' }]
		});
		mutateMock.mockResolvedValueOnce({ createOnboardingForm: { id: 'new-form' } });

		const formData = new FormData();
		formData.append('title', 'New Form');
		formData.append('description', 'desc');
		formData.append('isRequired', 'true');

		const { actions } = await import('$routes/admin/onboarding/[id]/forms/+page.server');
		const result = await actions.createForm(
			makeEvent({
				request: new Request('http://localhost', { method: 'POST', body: formData })
			}) as any
		);

		expect(result).toEqual({
			success: true,
			form: { id: 'new-form' },
			formId: 'new-form'
		});
		expect(mutateMock).toHaveBeenCalledWith(expect.anything(), {
			input: expect.objectContaining({
				onboardingModuleId: 'module-1',
				sequenceOrder: 2,
				isRequired: true
			})
		});
	});

	it('reorderForms action returns failure payload on mutation error', async () => {
		mutateMock.mockRejectedValue(new Error('reorder failed'));

		const formData = new FormData();
		formData.append('formIds', JSON.stringify(['f-1', 'f-2']));

		const { actions } = await import('$routes/admin/onboarding/[id]/forms/+page.server');
		const result = await actions.reorderForms(
			makeEvent({
				request: new Request('http://localhost', { method: 'POST', body: formData })
			}) as any
		);

		expect(result).toEqual({ success: false, error: 'Failed to reorder forms' });
	});
});
