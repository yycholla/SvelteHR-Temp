import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { createDocumentSchema, updateDocumentSchema } from '$lib/schemas/document';

export type DocumentFormInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentFormInput = z.infer<typeof updateDocumentSchema>;

export function createDocumentForm(
	options: {
		onSuccess?: (document: any) => void;
		onError?: (error: string) => void;
	} = {}
) {
	const initialData: DocumentFormInput = {
		title: '',
		fileType: '',
		fileSize: 0,
		uploadedByEmployeeId: 0,
		documentCategory: '',
		securityLevel: 'Public',
		isEncrypted: false
	};

	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		validators: createDocumentSchema,
		onUpdate: async ({ form }) => {
			try {
				const data = createDocumentSchema.parse(form.data);

				const response = await fetch('/api/hr/documents', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				if (!response.ok) {
					throw new Error(`Failed to create document: ${response.statusText}`);
				}

				const document = await response.json();
				if (options.onSuccess) options.onSuccess(document);
				return { message: { type: 'success', text: 'Document uploaded successfully' } };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
				if (options.onError) options.onError(errorMessage);
				return { message: { type: 'error', text: errorMessage } };
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}

export function updateDocumentForm(
	documentId: number,
	options: {
		onSuccess?: (document: any) => void;
		onError?: (error: string) => void;
	} = {}
) {
	const sForm = superForm(
		{},
		{
			SPA: true,
			resetForm: false,
			multipleSubmits: 'prevent',
			clearOnSubmit: 'errors-and-message',
			validators: updateDocumentSchema,
			onUpdate: async ({ form }) => {
				try {
					const data = updateDocumentSchema.parse({ ...form.data, id: documentId });

					const response = await fetch(`/api/hr/documents/${documentId}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) {
						throw new Error(`Failed to update document: ${response.statusText}`);
					}

					const document = await response.json();
					if (options.onSuccess) options.onSuccess(document);
					return { message: { type: 'success', text: 'Document updated successfully' } };
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Failed to update document';
					if (options.onError) options.onError(errorMessage);
					return { message: { type: 'error', text: errorMessage } };
				}
			}
		}
	);

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}
