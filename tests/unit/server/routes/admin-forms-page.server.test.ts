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

describe('admin forms [id] +page.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeEvent(overrides?: any): any {
		return {
			params: { id: 'form-1' },
			locals: {
				user: { id: 'admin-1', role: 'Admin', email: 'admin@example.com' }
			},
			request: {
				headers: new Headers({ cookie: 'session=test' })
			} as Request,
			...overrides
		};
	}

	it('load returns onboarding form for admin user', async () => {
		queryMock.mockResolvedValue({
			onboardingForm: { id: 'form-1', title: 'Form 1', blocks: [] }
		});

		const { load } = await import('$routes/admin/forms/[id]/+page.server');
		const result = (await load(makeEvent() as any)) as any;

		expect(result.form.id).toBe('form-1');
		expect(result.user.id).toBe('admin-1');
	});

	it('load redirects when user is missing', async () => {
		const { load } = await import('$routes/admin/forms/[id]/+page.server');

		await expect(
			load(
				makeEvent({
					locals: { user: null as any }
				}) as any
			)
		).rejects.toMatchObject({ status: 303 });
	});

	it('load rejects non-admin access', async () => {
		const { load } = await import('$routes/admin/forms/[id]/+page.server');

		await expect(
			load(
				makeEvent({
					locals: { user: { id: 'u-1', role: 'Employee' } as any }
				}) as any
			)
		).rejects.toMatchObject({ status: 403 });
	});

	it('createBlock action calls mutation with parsed JSON fields', async () => {
		mutateMock.mockResolvedValue({ createFormBlock: { id: 'b-1' } });

		const formData = new FormData();
		formData.append('onboardingFormId', 'form-1');
		formData.append('type', 'TEXT');
		formData.append('title', 'Block title');
		formData.append('sequenceOrder', '2');
		formData.append('fileUploadRequirements', JSON.stringify({ max: 1 }));
		formData.append('signatureRequirements', JSON.stringify({ required: true }));
		formData.append('checkboxItems', JSON.stringify(['a']));

		const { actions } = await import('$routes/admin/forms/[id]/+page.server');
		const result = await actions.createBlock(
			makeEvent({
				request: new Request('http://localhost', { method: 'POST', body: formData })
			}) as any
		);

		expect(result).toEqual({ success: true, block: { id: 'b-1' } });
		expect(mutateMock).toHaveBeenCalledWith(expect.anything(), {
			input: expect.objectContaining({
				onboardingFormId: 'form-1',
				sequenceOrder: 2,
				fileUploadRequirements: { max: 1 },
				signatureRequirements: { required: true },
				checkboxItems: ['a']
			})
		});
	});

	it('updateForm action throws 500 when mutation fails', async () => {
		mutateMock.mockRejectedValue(new Error('failed'));

		const formData = new FormData();
		formData.append('id', 'form-1');
		formData.append('title', 'Updated');

		const { actions } = await import('$routes/admin/forms/[id]/+page.server');

		await expect(
			actions.updateForm(
				makeEvent({
					request: new Request('http://localhost', { method: 'POST', body: formData })
				}) as any
			)
		).rejects.toMatchObject({ status: 500 });
	});
});
