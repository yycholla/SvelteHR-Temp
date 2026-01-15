# Feature 10: Time Tracking Integration

## Overview

Sync employee time entries between the HR system and QuickBooks for accurate payroll processing, billing, and project cost tracking.

## Current System Integration

- No current time tracking system
- Need to decide: build native or integrate existing?

## Key Components

- Time entry creation/editing
- Approval workflows
- Project/job allocation
- Billable vs non-billable hours
- Overtime calculation
- PTO/sick leave tracking
- Sync to QB Time Activities

## Technical Requirements

### New Tables

```sql
CREATE TABLE hr_public.time_entries (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES hr_public.users(id),
    entry_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    project_id UUID,
    billable BOOLEAN DEFAULT false,
    description TEXT,
    status VARCHAR(20), -- DRAFT, SUBMITTED, APPROVED, REJECTED
    approved_by UUID,
    quickbooks_time_activity_id VARCHAR(255),
    synced_at TIMESTAMPTZ
);
```

### QuickBooks Integration

- Map time entries to QB Time Activities
- Link to QB Customers (projects)
- Handle QB Service Items
- Support timesheet approval workflows

## Dependencies

- QuickBooks Time Activities API
- Project/job management system
- Approval workflow engine
- Mobile time entry app (optional)

## Research Notes

- [ ] QB Time Activities data model
- [ ] Timesheet approval requirements
- [ ] Integration with existing time tracking tools (Toggl, Harvest)
- [ ] Mobile app for time entry
- [ ] GPS/geofencing for field workers

## Use Cases

1. Service professionals billing clients
2. Project cost tracking
3. Payroll time submission
4. Compliance reporting (DCAA, etc.)

## Notes

_Research findings and implementation decisions_
