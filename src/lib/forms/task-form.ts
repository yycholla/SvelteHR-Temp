import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { trpc } from '$lib/trpc/client';

// Shared schema aligned with API and existing task schema
export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['Pending', 'InProgress', 'Completed', 'Blocked']).default('Pending'),
  dueDate: z.string().optional(),
  assignedToId: z.number().optional(),
  relatedEntityType: z.enum(['Onboarding', 'Offboarding', 'Compliance', 'General']).optional(),
  relatedEntityId: z.number().optional()
});

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export function createTaskForm(options: { onSuccess?: (id: number) => void } = {}) {
  const initialData: TaskFormInput = {
    title: '',
    description: '',
    status: 'Pending'
  };

  const sForm = superForm(initialData, {
    SPA: true,
    resetForm: false,
    multipleSubmits: 'prevent',
    clearOnSubmit: 'errors-and-message',
    onUpdate: async ({ form }) => {
      const data = taskFormSchema.parse(form.data);
      const created = await trpc.task.create.mutate(data);
      if (options.onSuccess) options.onSuccess(created.id);
      return { message: { type: 'success', text: 'Task created' } };
    }
  });

  return {
    ...sForm,
    isSubmitting: sForm.submitting
  };
}
