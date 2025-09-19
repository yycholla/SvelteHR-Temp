<script lang="ts">
  import { currentUser } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
  import { Calendar, ArrowLeft, AlertCircle, Plane, Clock, CheckCircle2 } from 'lucide-svelte';
  import { validateForm } from '$lib/utils/validation';
  import type { LeaveType, SubmitLeaveRequestInput } from '$lib/types';
  // Leave service temporarily disabled during PostGraphile migration
  // import { leaveService, myLeaveBalance } from '$lib/services/leaveService';

  // Form data using Svelte 5 runes
  let formData = $state({
    type: '' as LeaveType | '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'MORNING' as 'MORNING' | 'AFTERNOON',
    emergencyContact: '',
    attachments: [] as string[]
  });

  let loading = $state(false);
  let error = $state<string | null>(null);
  let validationErrors = $state<Record<string, string>>({});
  let calculatedDays = $state(0);

  // Leave type options
  const leaveTypeOptions = [
    { value: 'VACATION', label: 'Vacation' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'BEREAVEMENT', label: 'Bereavement' },
    { value: 'OTHER', label: 'Other' }
  ];

  const halfDayOptions = [
    { value: 'MORNING', label: 'Morning (First Half)' },
    { value: 'AFTERNOON', label: 'Afternoon (Second Half)' }
  ];

  // Validation rules
  const validationRules = {
    type: { required: true },
    startDate: { required: true },
    endDate: { required: true },
    reason: { required: true, minLength: 10 }
  };

  // Computed values using Svelte 5 derived
  const validationResult = $derived(() => {
    const result = validateForm(formData, validationRules);
    validationErrors = result.errors;
    return result;
  });

  const isValid = $derived(
    Object.keys(validationErrors).length === 0 &&
    formData.type &&
    formData.startDate &&
    formData.endDate
  );

  // Calculate days when dates change
  $effect(() => {
    if (formData.startDate && formData.endDate) {
      calculateLeaveDays();
    }
  });

  function calculateLeaveDays() {
    if (!formData.startDate || !formData.endDate) {
      calculatedDays = 0;
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) {
      calculatedDays = 0;
      return;
    }

    // Basic calculation - would need to account for weekends and holidays
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    if (formData.isHalfDay) {
      calculatedDays = 0.5;
    } else {
      calculatedDays = daysDiff;
    }
  }

  function getAvailableBalance(leaveType: LeaveType): number {
    // Temporarily disabled during PostGraphile migration
    // if (!$myLeaveBalance) return 0;
    // const balance = $myLeaveBalance.find(b => b.type === leaveType);
    // return balance?.remaining || 0;
    return 30; // Placeholder value
  }

  function getLeaveTypeDescription(leaveType: LeaveType): string {
    const descriptions = {
      VACATION: 'Planned time off for rest and recreation',
      SICK: 'Medical leave for illness or injury',
      PERSONAL: 'Personal time off for individual needs',
      MATERNITY: 'Maternity leave for new mothers',
      PATERNITY: 'Paternity leave for new fathers',
      BEREAVEMENT: 'Time off due to loss of family member',
      OTHER: 'Other types of leave not covered above'
    };
    return descriptions[leaveType] || '';
  }

  async function handleSubmit() {
    if (!isValid) return;

    try {
      loading = true;
      error = null;

      const submitData: SubmitLeaveRequestInput = {
        type: formData.type as LeaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? formData.halfDayPeriod : undefined,
        emergencyContact: formData.emergencyContact || undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined
      };

      // TODO: Re-enable with PostGraphile leave service
      // const leaveRequest = await leaveService.submitLeaveRequest(submitData);
      // goto(`/leave/requests/${leaveRequest.id}`);

      // Temporary: simulate success
      console.log('Leave request submitted:', submitData);
      goto('/leave/requests');
    } catch (err: any) {
      error = err.message || 'Failed to submit leave request';
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto('/leave/requests');
  }

  function handleReset() {
    formData = {
      type: '',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      halfDayPeriod: 'MORNING',
      emergencyContact: '',
      attachments: []
    };
    calculatedDays = 0;
    error = null;
  }

  function goBack() {
    goto('/leave/requests');
  }

  onMount(() => {
    // TODO: Re-enable with PostGraphile leave service
    // leaveService.loadMyLeaveBalance();

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.querySelector('input[name="startDate"]') as HTMLInputElement;
    const endDateInput = document.querySelector('input[name="endDate"]') as HTMLInputElement;

    if (startDateInput) startDateInput.min = today;
    if (endDateInput) endDateInput.min = today;
  });
</script>

<svelte:head>
  <title>Request Leave - SvelteHR</title>
  <meta name="description" content="Submit a new leave request" />
</svelte:head>

<div class="space-y-6">
    <!-- Header with back button -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onclick={goBack}>
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Plane class="h-8 w-8" />
            Request Leave
          </h1>
          <p class="text-muted-foreground">
            Submit a new leave request for approval
          </p>
        </div>
      </div>
    </div>

  <!-- Leave Balance Summary - Temporarily disabled during PostGraphile migration -->
  <!-- TODO: Re-implement with PostGraphile leave balance queries -->
  <!--
  {#if $myLeaveBalance && $myLeaveBalance.length > 0}
    <Card padding="md" class="balance-card">
      <div class="balance-header">
        <h3 class="balance-title">Your Leave Balance</h3>
      </div>
      <div class="balance-grid">
        {#each $myLeaveBalance as balance}
          <div class="balance-item">
            <div class="balance-type">{balance.type}</div>
            <div class="balance-remaining">{balance.remaining} days</div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}
  -->

    {#if error}
      <Card.Root>
        <Card.Content class="py-6">
          <div class="flex items-start space-x-4">
            <AlertCircle class="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="text-lg font-semibold">Error Submitting Request</h3>
              <p class="text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Leave Request Form -->
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Leave Details
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <Label for="leave-type">Leave Type *</Label>
              <Select.Root
                selected={formData.type ? { value: formData.type, label: leaveTypeOptions.find(opt => opt.value === formData.type)?.label || formData.type } : undefined}
                onSelectedChange={(v) => formData.type = v?.value || ''}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select leave type" />
                </Select.Trigger>
                <Select.Content>
                  {#each leaveTypeOptions as option}
                    <Select.Item value={option.value}>{option.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if validationErrors.type}
                <p class="text-sm text-destructive mt-1">{validationErrors.type}</p>
              {/if}

              {#if formData.type}
                <div class="mt-3 p-3 bg-muted rounded-md">
                  <p class="text-sm text-muted-foreground">
                    {getLeaveTypeDescription(formData.type)}
                  </p>
                  <p class="text-sm font-medium mt-1">
                    Available: {getAvailableBalance(formData.type)} days
                  </p>
                </div>
              {/if}
            </div>

            <div>
              <Label for="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                name="startDate"
                bind:value={formData.startDate}
                required
              />
              {#if validationErrors.startDate}
                <p class="text-sm text-destructive mt-1">{validationErrors.startDate}</p>
              {/if}
            </div>

            <div>
              <Label for="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                name="endDate"
                bind:value={formData.endDate}
                required
              />
              {#if validationErrors.endDate}
                <p class="text-sm text-destructive mt-1">{validationErrors.endDate}</p>
              {/if}
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center space-x-2">
                <Checkbox
                  id="half-day"
                  checked={formData.isHalfDay}
                  onCheckedChange={(checked) => formData.isHalfDay = checked || false}
                />
                <Label for="half-day" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Half Day Leave
                </Label>
              </div>
            </div>

            {#if formData.isHalfDay}
              <div class="md:col-span-2">
                <Label for="half-day-period">Half Day Period</Label>
                <Select.Root
                  selected={{ value: formData.halfDayPeriod, label: halfDayOptions.find(opt => opt.value === formData.halfDayPeriod)?.label || formData.halfDayPeriod }}
                  onSelectedChange={(v) => formData.halfDayPeriod = v?.value as 'MORNING' | 'AFTERNOON' || 'MORNING'}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select period" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each halfDayOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            {/if}

            <div class="md:col-span-2">
              <Label for="reason">Reason *</Label>
              <Textarea
                id="reason"
                bind:value={formData.reason}
                placeholder="Please provide a detailed reason for your leave request..."
                rows={4}
                required
              />
              {#if validationErrors.reason}
                <p class="text-sm text-destructive mt-1">{validationErrors.reason}</p>
              {:else}
                <p class="text-sm text-muted-foreground mt-1">Minimum 10 characters required</p>
              {/if}
            </div>

            <div class="md:col-span-2">
              <Label for="emergency-contact">Emergency Contact (Optional)</Label>
              <Input
                id="emergency-contact"
                bind:value={formData.emergencyContact}
                placeholder="Contact person during your absence"
              />
              <p class="text-sm text-muted-foreground mt-1">
                Phone number or email of someone who can be reached in case of emergency
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Leave Summary -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <CheckCircle2 class="h-5 w-5" />
            Leave Summary
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Leave Type
              </Label>
              <p class="text-sm">
                {formData.type ? leaveTypeOptions.find(opt => opt.value === formData.type)?.label || formData.type : 'Not selected'}
              </p>
            </div>

            <div class="space-y-2">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Duration
              </Label>
              <p class="text-sm">
                {formData.startDate && formData.endDate
                  ? `${formData.startDate} to ${formData.endDate}`
                  : 'Dates not selected'}
              </p>
            </div>

            <div class="space-y-2">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Days
              </Label>
              <p class="text-sm font-semibold text-primary">
                {calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
              </p>
            </div>

            {#if formData.type}
              <div class="space-y-2">
                <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Available Balance
                </Label>
                <p class="text-sm">
                  {getAvailableBalance(formData.type)} days
                </p>
              </div>
            {/if}
          </div>

          {#if formData.type && getAvailableBalance(formData.type) < calculatedDays}
            <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div class="flex items-start space-x-2">
                <AlertCircle class="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-sm font-medium text-destructive">Balance Warning</p>
                  <p class="text-sm text-destructive/80">
                    Insufficient balance ({getAvailableBalance(formData.type)} days available)
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Form Actions -->
      <div class="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          variant="ghost"
          onclick={handleReset}
          disabled={loading}
        >
          Reset
        </Button>

        <div class="flex items-center space-x-3">
          <Button
            type="button"
            variant="outline"
            onclick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={!isValid || loading}
          >
            {#if loading}
              <Clock class="h-4 w-4 mr-2 animate-spin" />
            {/if}
            Submit Request
          </Button>
        </div>
      </div>
    </form>
</div>

