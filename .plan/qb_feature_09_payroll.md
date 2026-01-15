# Feature 09: Payroll Integration

## Overview

Sync employee compensation data bidirectionally with QuickBooks for seamless payroll management, including salaries, hourly rates, commissions, bonuses, and pay schedules.

## Current System Integration

- Employee records exist with compensation data
- No current payroll sync capability
- QB integration limited to basic employee data

## Key Components

- Compensation sync (salaries, hourly rates)
- Pay schedule management
- Tax withholding information
- Benefits deductions
- Commission and bonus tracking
- PTO/sick leave balance sync

## Technical Requirements

### Backend

- Extend employee sync to include compensation fields
- Handle QB payroll item mappings
- Implement pay schedule sync
- Support multiple compensation types

### Database Extensions

```sql
ALTER TABLE hr_public.users ADD COLUMN IF NOT EXISTS
    compensation_type VARCHAR(20), -- SALARY, HOURLY, COMMISSION
    annual_salary DECIMAL(12,2),
    hourly_rate DECIMAL(8,2),
    pay_schedule VARCHAR(20), -- WEEKLY, BIWEEKLY, MONTHLY
    quickbooks_payroll_item_id VARCHAR(255);
```

## Dependencies

- QuickBooks Payroll API access
- Compliance with wage/hour laws
- Tax calculation libraries
- Benefits administration integration

## Research Notes

- [ ] QuickBooks Payroll API capabilities
- [ ] Supported compensation types
- [ ] Tax withholding sync requirements
- [ ] Multi-state payroll considerations
- [ ] Union/prevailing wage support

## Compliance Considerations

- FLSA compliance
- State wage laws
- Tax reporting (W-2, 1099)
- Audit trail for compensation changes

## Notes

_Research findings and implementation decisions_
