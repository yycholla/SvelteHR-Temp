import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const getModuleByIdMock = vi.fn();
const queryMock = vi.fn();
const mutateMock = vi.fn();

vi.mock('$lib/server/rbac-utils', () => ({
	requireAuth: requireAuthMock
}));

vi.mock('$lib/server/services', () => ({
	createOnboardingService: vi.fn(() => ({
		getModuleById: getModuleByIdMock
	}))
}));

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

describe('dashboard onboarding [id] +page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeEvent(overrides?: any): any {
		return {
			params: { id: 'mod-1' },
			locals: {
				user: { id: 'user-1', email: 'user-1@example.com' }
			},
			request: {
				headers: new Headers({ cookie: 'session=test' })
			} as Request,
			...overrides
		};
	}

	it('loads onboarding module, forms, blocks, progress, and templates', async () => {
		getModuleByIdMock.mockResolvedValue({
			isError: false,
			value: {
				id: 'mod-1',
				title: { value: 'Welcome Module' },
				description: 'desc',
				isActive: true,
				category: { value: 'general' },
				tags: ['a'],
				authorId: 'author-1'
			}
		});

		queryMock
			.mockResolvedValueOnce({
				onboardingFormsByModule: [
					{ id: 'form-1', title: 'Form 1', sequenceOrder: 1, isRequired: true }
				]
			})
			.mockResolvedValueOnce({
				formBlocks: [{ id: 'block-1', sequenceOrder: 1 }]
			})
			.mockResolvedValueOnce({
				formProgress: { status: 'IN_PROGRESS', formData: { k: 'v' } }
			})
			.mockResolvedValueOnce({
				formTemplates: [{ id: 'tpl-1', name: 'Template 1' }]
			});

		const { load } = await import('$routes/dashboard/onboarding/[id]/+page.server');
		const result = (await load(makeEvent() as any)) as any;

		expect(requireAuthMock).toHaveBeenCalled();
		expect(result.module.title).toBe('Welcome Module');
		expect(result.forms).toHaveLength(1);
		expect(result.forms[0].blocks).toHaveLength(1);
		expect(result.forms[0].isInProgress).toBe(true);
		expect(result.totalForms).toBe(1);
		expect(result.completedForms).toBe(0);
		expect(result.formTemplates.get('tpl-1')).toEqual({ id: 'tpl-1', name: 'Template 1' });
	});

	it('throws 404 when onboarding module is not found', async () => {
		getModuleByIdMock.mockResolvedValue({
			isError: true,
			error: { code: 'ONBOARDING_MODULE_NOT_FOUND' }
		});

		const { load } = await import('$routes/dashboard/onboarding/[id]/+page.server');

		await expect(load(makeEvent() as any)).rejects.toMatchObject({ status: 404 });
	});

	it('saveProgress action posts parsed payload to mutation', async () => {
		mutateMock.mockResolvedValue({ saveFormProgress: { id: 'p-1' } });

		const formData = new FormData();
		formData.append('onboardingFormId', 'form-1');
		formData.append('status', 'IN_PROGRESS');
		formData.append('formData', JSON.stringify({ a: 1 }));

		const { actions } = await import('$routes/dashboard/onboarding/[id]/+page.server');
		const result = await actions.saveProgress(
			makeEvent({
				request: new Request('http://localhost', { method: 'POST', body: formData })
			}) as any
		);

		expect(result).toEqual({ success: true });
		expect(mutateMock).toHaveBeenCalledWith(expect.anything(), {
			input: {
				userId: 'user-1',
				onboardingFormId: 'form-1',
				status: 'IN_PROGRESS',
				formData: { a: 1 }
			}
		});
	});

	it('completeForm action returns failure payload when mutation fails', async () => {
		mutateMock.mockRejectedValue(new Error('mutation failed'));

		const formData = new FormData();
		formData.append('onboardingFormId', 'form-1');
		formData.append('formData', JSON.stringify({ accepted: true }));

		const { actions } = await import('$routes/dashboard/onboarding/[id]/+page.server');
		const result = await actions.completeForm(
			makeEvent({
				request: new Request('http://localhost', { method: 'POST', body: formData })
			}) as any
		);

		expect(result).toEqual({ success: false, error: 'Failed to complete form' });
	});
});
