# W-4 Form Template Implementation Guide

## Overview

This document describes the implementation of the IRS Form W-4 (Employee's Withholding Certificate) in the SvelteHR onboarding system.

## Form Structure

The W-4 form template is stored in the `onboarding_form_templates` table and contains a comprehensive JSON schema that defines all form fields, validation rules, and calculation logic.

### Template Details

- **Name**: Federal W-4 Form (2024)
- **IRS Form Number**: W-4
- **Revision Date**: December 2020
- **Category**: Tax Forms
- **Version**: 2024
- **Estimated Completion Time**: 15 minutes

## Form Sections

### 1. Personal Information

Required fields for employee identification:

- **First Name** (TEXT, required, pattern: `^[A-Za-z\s'-]+$`)
- **Middle Initial** (TEXT, optional, pattern: `^[A-Za-z]$`)
- **Last Name** (TEXT, required, pattern: `^[A-Za-z\s'-]+$`)
- **Social Security Number** (SSN, required, **encrypted**)
  - Pattern: `XXX-XX-XXXX`
  - **Must be encrypted at application level before storage**
- **Home Address** (ADDRESS, required)
  - Street Address
  - Apt/Unit Number (optional)
  - City
  - State (dropdown with all 50 US states)
  - ZIP Code (pattern: `^\d{5}(-\d{4})?$`)

### 2. Step 1: Enter Personal Information

- **Filing Status** (RADIO, required)
  - Single or Married filing separately
  - Married filing jointly or Qualifying surviving spouse
  - Head of household

### 3. Step 2: Multiple Jobs or Spouse Works

Optional section for employees with multiple jobs or married employees whose spouse works.

**Options** (RADIO, optional):

- Not applicable
- Use IRS Tax Withholding Estimator (recommended)
- Use Multiple Jobs Worksheet
- Check box in Step 2(c) (for 2 jobs with similar pay)

**Step 2(c) Checkbox** (CHECKBOX, conditional):

- Only shown if user selects "Check box in Step 2(c)" option
- Must also be checked on other job's W-4

### 4. Step 3: Claim Dependents

Optional section for employees with income ≤ $200,000 (single) or ≤ $400,000 (married filing jointly).

**Eligibility Check** (RADIO, optional):

- No - Income exceeds threshold or no dependents
- Yes - Eligible to claim dependents

**If eligible**:

- **Qualifying Children Under 17** (NUMBER, 0-20)
  - Multiply by $2,000
- **Other Dependents** (NUMBER, 0-20)
  - Multiply by $500
- **Total Credit Amount** (NUMBER, **auto-calculated**)
  - Formula: `(qualifying_children * 2000) + (other_dependents * 500)`

### 5. Step 4: Other Adjustments (Optional)

- **Step 4(a): Other Income** (NUMBER, optional)
  - Interest, dividends, retirement income, etc.
  - Range: $0 - $9,999,999
- **Step 4(b): Deductions** (NUMBER, optional)
  - Deductions beyond standard deduction
  - Range: $0 - $9,999,999
- **Step 4(c): Extra Withholding** (NUMBER, optional)
  - Additional tax per pay period
  - Range: $0 - $9,999,999

### 6. Step 5: Signature

- **Employee Signature** (SIGNATURE, **required**)
  - Canvas-based signature capture
  - Canvas dimensions: 400x150px
  - Type: drawn (hand-drawn signature)
  - Requires date
- **Signature Date** (DATE, **required**)
  - Defaults to current date

### 7. Employer Information (Read-Only)

Auto-populated by employer:

- Employer Name
- Employer Address
- Employer EIN (Employer Identification Number)
- First Date of Employment

## Field Types

### Standard Types

- **TEXT**: Single-line text input
- **NUMBER**: Numeric input with min/max validation
- **DATE**: Date picker
- **RADIO**: Radio button group (single selection)
- **CHECKBOX**: Single checkbox
- **DROPDOWN**: Select dropdown

### Complex Types

- **SSN**: Social Security Number input
  - **CRITICAL**: Must be encrypted before database storage
  - Use application-level encryption (e.g., AES-256-GCM)
  - Pattern validation: `XXX-XX-XXXX`

- **ADDRESS**: Structured address input
  - Multiple sub-fields (street, city, state, zip)
  - State dropdown with all 50 US states

- **SIGNATURE**: Canvas-based signature capture
  - Hand-drawn signatures using HTML5 Canvas
  - Stores base64-encoded image data
  - Configuration:
    - `type`: "drawn" (hand-drawn)
    - `require_date`: true
    - `canvas_width`: 400
    - `canvas_height`: 150

- **SECTION_HEADER**: Visual section divider
  - No input, displays label and help text

## Validation Rules

### Field-Level Validation

Each field includes validation rules:

```json
{
	"validation": {
		"min_length": 1,
		"max_length": 50,
		"min": 0,
		"max": 20,
		"pattern": "^[A-Za-z\\s'-]+$"
	}
}
```

### Conditional Requirements

- Step 3 dependents fields are required only if `step3_eligible = "yes"`
- Step 2(c) checkbox is only valid if `step2_option = "checkbox_c"`

### Auto-Calculations

- **Step 3 Total**: Automatically calculated from dependents
  - Formula: `(qualifying_children * 2000) + (other_dependents * 500)`
  - Updates in real-time as user enters data

## Data Security

### PII (Personally Identifiable Information) Fields

The following fields contain sensitive PII and require special handling:

- `first_name`
- `middle_initial`
- `last_name`
- `ssn` (**MUST be encrypted**)
- `address` (all sub-fields)

### Encryption Requirements

- **SSN**: MUST be encrypted at application level before database storage
  - Recommended: AES-256-GCM encryption
  - Store encryption key securely (e.g., environment variable, secrets manager)
  - Decrypt only when absolutely necessary (e.g., for payroll processing)

### Audit Trail

All W-4 submissions are stored in `onboarding_form_submissions` with:

- `submitted_at`: Timestamp of submission
- `ip_address`: IP address of submission (for audit)
- `user_agent`: Browser user agent (for audit)

### Retention Period

- **4 years** from submission date (IRS requirement)
- Implement automatic purge of submissions older than 4 years

## Usage in Onboarding Flow

### Creating a W-4 Content Block

```graphql
mutation CreateW4Block {
	onboarding {
		createContentBlock(
			input: {
				onboarding_module_id: "uuid-of-module"
				title: "Federal W-4 Tax Withholding Form"
				type: FORM
				sequence_order: 1
				is_required: true
				form_template_id: "uuid-of-w4-template"
			}
		) {
			id
			title
			type
		}
	}
}
```

### Submitting a W-4 Form

```graphql
mutation SubmitW4 {
	onboarding {
		submitForm(
			input: {
				content_block_id: "uuid-of-w4-block"
				form_template_id: "uuid-of-w4-template"
				form_data: {
					first_name: "John"
					middle_initial: "A"
					last_name: "Doe"
					ssn: "encrypted-ssn-value" # MUST be encrypted!
					address: { street: "123 Main St", city: "Springfield", state: "IL", zip: "62701" }
					filing_status: "single"
					step3_eligible: "no"
					employee_signature: {
						data: "base64-signature-image"
						signed_at: "2024-12-02T10:30:00Z"
						ip_address: "192.168.1.1"
					}
					signature_date: "2024-12-02"
				}
				ip_address: "192.168.1.1"
				user_agent: "Mozilla/5.0..."
			}
		) {
			id
			submitted_at
		}
	}
}
```

### Retrieving a W-4 Submission

```graphql
query GetMyW4Submission {
	myFormSubmission(content_block_id: "uuid-of-w4-block") {
		id
		form_data
		submitted_at
		ip_address
	}
}
```

## Frontend Implementation Notes

### Form Renderer Requirements

The Svelte frontend form renderer must:

1. **Dynamic Field Rendering**: Render fields based on JSON schema
2. **Conditional Logic**: Show/hide fields based on conditional rules
3. **Auto-Calculations**: Calculate Step 3 total automatically
4. **Validation**: Client-side validation before submission
5. **Signature Capture**: HTML5 Canvas for signature drawing
6. **SSN Encryption**: Encrypt SSN before sending to server
7. **Progress Saving**: Allow saving partial progress
8. **Print Preview**: Generate printable W-4 PDF

### Canvas Signature Component

See task #7 for implementation details:

- HTML5 Canvas element (400x150px)
- Touch and mouse support
- Clear/reset functionality
- Base64 PNG export
- Responsive scaling

### SSN Encryption Flow

```
User Input (XXX-XX-XXXX)
  ↓
Client-side validation
  ↓
Encrypt with public key
  ↓
Send encrypted value to server
  ↓
Server decrypts with private key
  ↓
Re-encrypt with server key
  ↓
Store in database
```

## Testing Checklist

- [ ] All required fields validated
- [ ] Optional fields can be skipped
- [ ] Conditional fields show/hide correctly
- [ ] Step 3 total calculates correctly
- [ ] Signature canvas works (mouse + touch)
- [ ] SSN encryption works end-to-end
- [ ] Form submission creates audit trail
- [ ] IP address and user agent captured
- [ ] Form data retrieval works
- [ ] Print preview generates correctly

## Legal Compliance

### IRS Requirements

- Form must match official IRS W-4 structure
- All required fields must be collected
- Employee signature required under penalty of perjury
- Employer must retain for 4 years
- Updates required when IRS revises form

### Privacy Act Notice

The form includes IRS Privacy Act notice:

> "We ask for the information on this form to carry out the Internal Revenue laws of the United States..."

### Data Protection

- SSN must be encrypted at rest and in transit
- Access to W-4 data restricted to authorized personnel
- Audit logs for all W-4 access/modifications
- Secure deletion after retention period

## Related Resources

- [IRS Form W-4 Official PDF](https://www.irs.gov/pub/irs-pdf/fw4.pdf)
- [IRS Tax Withholding Estimator](https://www.irs.gov/W4App)
- Migration: `m20251202_005_seed_w4_form_template.rs`
- Template JSON: `w4-form-template.json`
- Onboarding Schema: `onboarding-schema.md`
