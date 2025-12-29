# Feature 16: Data Validation Rules

## Overview
Comprehensive data validation system that checks data quality before syncing, preventing invalid, incomplete, or malformed data from entering either system.

## Current System Integration
- Basic email/name validation exists
- Enforced via database constraints
- No configurable rules engine
- Validation happens at sync time (too late)

## Key Components
- Pre-sync validation checks
- Configurable validation rules
- Custom business rules
- Data quality scoring
- Validation failure handling
- Auto-correction capabilities
- Validation rule templates

## Technical Requirements
### Validation Rules Engine
```rust
pub struct ValidationRule {
    pub id: Uuid,
    pub name: String,
    pub entity_type: EntityType,
    pub field_name: String,
    pub rule_type: RuleType,
    pub condition: String,  // e.g., "length > 0", "matches regex"
    pub severity: Severity,  // ERROR, WARNING, INFO
    pub auto_fix: Option<AutoFixStrategy>,
}

pub enum RuleType {
    Required,
    Format,       // Regex, email, phone
    Range,        // Min/max values
    Length,       // String length
    Reference,    // Foreign key validity
    Custom,       // JavaScript/WASM custom logic
    Business,     // Complex business rules
}

pub enum Severity {
    Error,    // Block sync
    Warning,  // Log but allow
    Info,     // Informational only
}

pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
    pub score: u8,  // 0-100 data quality score
}
```

### Database Schema
```sql
CREATE TABLE hr_public.validation_rules (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),
    field_name VARCHAR(100),
    rule_type VARCHAR(50),
    condition TEXT,
    severity VARCHAR(20),
    auto_fix_strategy VARCHAR(50),
    enabled BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_public.validation_failures (
    id UUID PRIMARY KEY,
    rule_id UUID REFERENCES hr_public.validation_rules(id),
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    field_name VARCHAR(100),
    invalid_value TEXT,
    error_message TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution VARCHAR(50)  -- AUTO_FIXED, MANUALLY_FIXED, IGNORED
);
```

### Built-in Validation Rules
1. **Email Format**: Valid email address
2. **Phone Format**: Valid phone number
3. **Required Fields**: Non-empty, non-null
4. **Department Exists**: Valid department reference
5. **Unique Employee Number**: No duplicates
6. **Pay Rate Range**: Reasonable hourly rate ($7.25 - $500/hr)
7. **Hire Date Logic**: Not in future, not before company founding
8. **Name Format**: No special characters, proper casing
9. **SSN Format**: Valid Social Security Number (if stored)
10. **Address Completeness**: Street, city, state, zip

## Dependencies
- Regex validation library
- Phone number validation (libphonenumber)
- Email validation
- Custom rule execution engine (WASM?)
- Auto-fix algorithms

## Implementation Phases
### Phase 1: Core Validation
- Built-in rules for critical fields
- Validation on sync
- Block invalid data

### Phase 2: Configurable Rules
- UI for rule management
- Custom rule builder
- Severity levels

### Phase 3: Auto-Fix
- Safe auto-corrections
- Suggestions for manual fix
- Validation dashboard

### Phase 4: Advanced
- ML-powered data quality scoring
- Predictive validation
- Data enrichment

## Research Notes
- [ ] Common data quality issues in HR systems
- [ ] Industry-standard validation rules
- [ ] Balance between strict and flexible
- [ ] Performance impact of complex validations
- [ ] Auto-fix safety boundaries

## Auto-Fix Strategies
- Trim whitespace
- Proper case names (John Smith)
- Format phone numbers (555-123-4567)
- Standardize addresses (USPS API)
- Fill missing fields from QB
- Merge duplicates

## Success Metrics
- Data quality score > 95%
- Sync failures due to validation < 1%
- Auto-fix success rate > 90%
- User satisfaction with validation

## Notes
_Research findings and implementation decisions_
