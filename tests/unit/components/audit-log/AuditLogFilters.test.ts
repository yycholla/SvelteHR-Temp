import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import AuditLogFilters from '../../../../src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte';
import type { FilterValues } from '../../../../src/routes/dashboard/audit-log/_components/AuditLogFilters/filters.types';

describe('AuditLogFilters', () => {
	const mockResourceTypes = ['Employee', 'Department', 'Document', 'Task'];
	const mockOnFilterChange = vi.fn();
	const mockOnClear = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Component Rendering', () => {
		it('should render all filter sections', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Action Type')).toBeInTheDocument();
			expect(screen.getByText('Resource Type')).toBeInTheDocument();
			expect(screen.getByText('Date Range')).toBeInTheDocument();
			expect(screen.getByText('Employee')).toBeInTheDocument();
			expect(screen.getByText('Clear Filters')).toBeInTheDocument();
		});

		it('should render with default values when no initialFilters provided', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByRole('combobox', { name: /action type/i })).toBeInTheDocument();
		});

		it('should render with initialFilters values', () => {
			const initialFilters: FilterValues = {
				action: 'CREATE',
				resourceType: 'Employee'
			};

			render(AuditLogFilters, {
				props: {
					initialFilters,
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Employee')).toBeInTheDocument();
		});
	});

	describe('Action Filter', () => {
		it('should display ALL by default', async () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			expect(trigger).toBeInTheDocument();
		});

		it('should call onFilterChange when action changes to CREATE', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(trigger);

			const createOption = screen.getByRole('option', { name: 'CREATE' });
			await user.click(createOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'CREATE' })
			);
		});

		it('should call onFilterChange when action changes to READ', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(trigger);

			const readOption = screen.getByRole('option', { name: 'READ' });
			await user.click(readOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ action: 'READ' }));
		});

		it('should call onFilterChange when action changes to UPDATE', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(trigger);

			const updateOption = screen.getByRole('option', { name: 'UPDATE' });
			await user.click(updateOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'UPDATE' })
			);
		});

		it('should call onFilterChange when action changes to DELETE', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(trigger);

			const deleteOption = screen.getByRole('option', { name: 'DELETE' });
			await user.click(deleteOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'DELETE' })
			);
		});

		it('should set action to null when ALL is selected', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { action: 'CREATE' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const trigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(trigger);

			const allOption = screen.getByRole('option', { name: 'ALL' });
			await user.click(allOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ action: null }));
		});
	});

	describe('Resource Type Filter', () => {
		it('should display resource type button', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Select resource type...')).toBeInTheDocument();
		});

		it('should show popover with resource types when button clicked', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const button = screen.getByText('Select resource type...');
			await user.click(button);

			expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
			mockResourceTypes.forEach((rt) => {
				expect(screen.getByText(rt)).toBeInTheDocument();
			});
		});

		it('should filter resource types based on search query', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const button = screen.getByText('Select resource type...');
			await user.click(button);

			const searchInput = screen.getByPlaceholderText('Search...');
			await user.type(searchInput, 'emp');

			expect(screen.getByText('Employee')).toBeInTheDocument();
			expect(screen.queryByText('Department')).not.toBeInTheDocument();
		});

		it('should call onFilterChange when resource type selected', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const button = screen.getByText('Select resource type...');
			await user.click(button);

			const employeeOption = screen.getByText('Employee');
			await user.click(employeeOption);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ resourceType: 'Employee' })
			);
		});

		it('should display selected resource type in button', async () => {
			render(AuditLogFilters, {
				props: {
					initialFilters: { resourceType: 'Employee' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Employee')).toBeInTheDocument();
		});

		it('should perform case-insensitive search', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const button = screen.getByText('Select resource type...');
			await user.click(button);

			const searchInput = screen.getByPlaceholderText('Search...');
			await user.type(searchInput, 'TASK');

			expect(screen.getByText('Task')).toBeInTheDocument();
		});
	});

	describe('Date Range Filter', () => {
		it('should render start and end date inputs', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const dateInputs = screen.getAllByPlaceholderText(/date/i);
			expect(dateInputs).toHaveLength(2);
		});

		it('should call onFilterChange when start date changes', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const startDateInput = screen.getByPlaceholderText('Start date');
			await user.type(startDateInput, '2026-02-01');

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ startDate: '2026-02-01' })
			);
		});

		it('should call onFilterChange when end date changes', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const endDateInput = screen.getByPlaceholderText('End date');
			await user.type(endDateInput, '2026-02-28');

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ endDate: '2026-02-28' })
			);
		});

		it('should show error when start date is after end date', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { startDate: '2026-02-28', endDate: '2026-02-01' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Start date must be before end date')).toBeInTheDocument();
		});

		it('should not show error when dates are valid', () => {
			render(AuditLogFilters, {
				props: {
					initialFilters: { startDate: '2026-02-01', endDate: '2026-02-28' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.queryByText('Start date must be before end date')).not.toBeInTheDocument();
		});

		it('should not show error when only start date is set', () => {
			render(AuditLogFilters, {
				props: {
					initialFilters: { startDate: '2026-02-01' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.queryByText('Start date must be before end date')).not.toBeInTheDocument();
		});

		it('should not show error when only end date is set', () => {
			render(AuditLogFilters, {
				props: {
					initialFilters: { endDate: '2026-02-28' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.queryByText('Start date must be before end date')).not.toBeInTheDocument();
		});

		it('should set date to null when cleared', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { startDate: '2026-02-01' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const startDateInput = screen.getByPlaceholderText('Start date');
			await user.clear(startDateInput);

			expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({ startDate: null }));
		});
	});

	describe('Employee Filter', () => {
		it('should render employee search input', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByPlaceholderText('Search by ID or name...')).toBeInTheDocument();
		});

		it('should debounce employee search for 300ms', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const searchInput = screen.getByPlaceholderText('Search by ID or name...');
			await user.type(searchInput, 'john');

			// Should not call immediately
			expect(mockOnFilterChange).not.toHaveBeenCalled();

			// Advance timers by 300ms
			vi.advanceTimersByTime(300);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ employeeId: 'john' })
			);
		});

		it('should cancel previous debounce timer on new input', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const searchInput = screen.getByPlaceholderText('Search by ID or name...');

			// First input
			await user.type(searchInput, 'john');
			vi.advanceTimersByTime(100);

			// Second input before debounce completes
			await user.type(searchInput, ' doe');
			vi.advanceTimersByTime(100);

			// Should not have called yet
			expect(mockOnFilterChange).not.toHaveBeenCalled();

			// Complete the second debounce
			vi.advanceTimersByTime(200);

			// Should only call once with final value
			expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ employeeId: 'john doe' })
			);
		});

		it('should set employeeId to null when search is cleared', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { employeeId: 'john' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const searchInput = screen.getByPlaceholderText('Search by ID or name...');
			await user.clear(searchInput);

			vi.advanceTimersByTime(300);

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({ employeeId: null })
			);
		});

		it('should display initial employee search value', () => {
			render(AuditLogFilters, {
				props: {
					initialFilters: { employeeId: 'john doe' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const searchInput = screen.getByPlaceholderText(
				'Search by ID or name...'
			) as HTMLInputElement;
			expect(searchInput.value).toBe('');
		});
	});

	describe('Clear Filters', () => {
		it('should render clear filters button', () => {
			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			expect(screen.getByText('Clear Filters')).toBeInTheDocument();
		});

		it('should call onClear when clear button clicked', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const clearButton = screen.getByText('Clear Filters');
			await user.click(clearButton);

			expect(mockOnClear).toHaveBeenCalledTimes(1);
		});

		it('should reset all filters when clear button clicked', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: {
						action: 'CREATE',
						resourceType: 'Employee',
						startDate: '2026-02-01',
						endDate: '2026-02-28',
						employeeId: 'john'
					},
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const clearButton = screen.getByText('Clear Filters');
			await user.click(clearButton);

			// Should reset to empty
			expect(mockOnClear).toHaveBeenCalled();
		});

		it('should clear employee search query when clear button clicked', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { employeeId: 'john' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const clearButton = screen.getByText('Clear Filters');
			await user.click(clearButton);

			const searchInput = screen.getByPlaceholderText(
				'Search by ID or name...'
			) as HTMLInputElement;
			expect(searchInput.value).toBe('');
		});

		it('should clear resource search query when clear button clicked', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			// Open popover and type search
			const resourceButton = screen.getByText('Select resource type...');
			await user.click(resourceButton);

			const resourceSearch = screen.getByPlaceholderText('Search...');
			await user.type(resourceSearch, 'employee');

			// Close popover
			await user.keyboard('{Escape}');

			// Clear filters
			const clearButton = screen.getByText('Clear Filters');
			await user.click(clearButton);

			// Open popover again
			await user.click(resourceButton);

			// Search should be empty
			const newResourceSearch = screen.getByPlaceholderText('Search...');
			expect((newResourceSearch as HTMLInputElement).value).toBe('');
		});
	});

	describe('Combined Filters', () => {
		it('should handle multiple filters simultaneously', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			// Set action
			const actionTrigger = screen.getByRole('combobox', { name: /action type/i });
			await user.click(actionTrigger);
			await user.click(screen.getByRole('option', { name: 'CREATE' }));

			// Set dates
			const startDateInput = screen.getByPlaceholderText('Start date');
			await user.type(startDateInput, '2026-02-01');

			const endDateInput = screen.getByPlaceholderText('End date');
			await user.type(endDateInput, '2026-02-28');

			// Set employee search
			const employeeInput = screen.getByPlaceholderText('Search by ID or name...');
			await user.type(employeeInput, 'john');

			vi.advanceTimersByTime(300);

			// Should have called onFilterChange multiple times with accumulated filters
			expect(mockOnFilterChange).toHaveBeenCalled();
		});

		it('should preserve existing filters when adding new ones', async () => {
			const user = userEvent.setup({ delay: null });

			render(AuditLogFilters, {
				props: {
					initialFilters: { action: 'CREATE' },
					resourceTypes: mockResourceTypes,
					onFilterChange: mockOnFilterChange,
					onClear: mockOnClear
				}
			});

			const startDateInput = screen.getByPlaceholderText('Start date');
			await user.type(startDateInput, '2026-02-01');

			expect(mockOnFilterChange).toHaveBeenCalledWith(
				expect.objectContaining({
					action: 'CREATE',
					startDate: '2026-02-01'
				})
			);
		});
	});
});
