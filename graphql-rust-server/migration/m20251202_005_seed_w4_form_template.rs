use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // W-4 Form Template JSON - matching the IRS 2024 W-4 structure
        let w4_fields_json = r#"
[
  {
    "id": "personal_info_header",
    "label": "Personal Information",
    "type": "SECTION_HEADER",
    "required": false,
    "help_text": "Enter your personal information as it appears on your Social Security card"
  },
  {
    "id": "first_name",
    "label": "First Name",
    "type": "TEXT",
    "required": true,
    "validation": {
      "min_length": 1,
      "max_length": 50,
      "pattern": "^[A-Za-z\\s'-]+$"
    },
    "help_text": "Enter your legal first name"
  },
  {
    "id": "middle_initial",
    "label": "Middle Initial",
    "type": "TEXT",
    "required": false,
    "validation": {
      "max_length": 1,
      "pattern": "^[A-Za-z]$"
    }
  },
  {
    "id": "last_name",
    "label": "Last Name",
    "type": "TEXT",
    "required": true,
    "validation": {
      "min_length": 1,
      "max_length": 50,
      "pattern": "^[A-Za-z\\s'-]+$"
    },
    "help_text": "Enter your legal last name"
  },
  {
    "id": "ssn",
    "label": "Social Security Number",
    "type": "SSN",
    "required": true,
    "validation": {
      "pattern": "^\\d{3}-\\d{2}-\\d{4}$"
    },
    "help_text": "Enter your 9-digit Social Security Number (XXX-XX-XXXX)",
    "encrypted": true
  },
  {
    "id": "address",
    "label": "Home Address",
    "type": "ADDRESS",
    "required": true,
    "fields": {
      "street": {
        "label": "Street Address",
        "required": true,
        "max_length": 100
      },
      "apt_unit": {
        "label": "Apt/Unit Number",
        "required": false,
        "max_length": 10
      },
      "city": {
        "label": "City",
        "required": true,
        "max_length": 50
      },
      "state": {
        "label": "State",
        "required": true,
        "type": "DROPDOWN",
        "options": [
          "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
          "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
          "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
          "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
          "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
        ]
      },
      "zip": {
        "label": "ZIP Code",
        "required": true,
        "pattern": "^\\d{5}(-\\d{4})?$"
      }
    },
    "help_text": "Enter your current home address"
  },
  {
    "id": "step1_header",
    "label": "Step 1: Enter Personal Information",
    "type": "SECTION_HEADER",
    "required": false,
    "help_text": "Complete Steps 1-4 ONLY if they apply to you; otherwise, skip to Step 5"
  },
  {
    "id": "filing_status",
    "label": "Filing Status",
    "type": "RADIO",
    "required": true,
    "options": [
      {
        "value": "single",
        "label": "Single or Married filing separately",
        "description": "Check this box if you file as Single or if you are Married filing separately"
      },
      {
        "value": "married_joint",
        "label": "Married filing jointly or Qualifying surviving spouse",
        "description": "Check this box if you are Married filing jointly or are a Qualifying surviving spouse"
      },
      {
        "value": "head_of_household",
        "label": "Head of household",
        "description": "Check this box ONLY if you file as Head of household"
      }
    ],
    "help_text": "Select your tax filing status"
  },
  {
    "id": "step2_header",
    "label": "Step 2: Multiple Jobs or Spouse Works",
    "type": "SECTION_HEADER",
    "required": false,
    "help_text": "Complete this step if you hold more than one job at a time, or are married filing jointly and your spouse also works"
  },
  {
    "id": "step2_option",
    "label": "Choose ONE of the following options:",
    "type": "RADIO",
    "required": false,
    "options": [
      {
        "value": "none",
        "label": "Not applicable - I have only one job and my spouse doesn't work"
      },
      {
        "value": "online_estimator",
        "label": "Use the IRS Tax Withholding Estimator (RECOMMENDED)"
      },
      {
        "value": "worksheet",
        "label": "Use the Multiple Jobs Worksheet"
      },
      {
        "value": "checkbox_c",
        "label": "Check the box in Step 2(c) (if only 2 jobs total)"
      }
    ]
  },
  {
    "id": "step2c_checkbox",
    "label": "Step 2(c): Two Jobs, Similar Pay",
    "type": "CHECKBOX",
    "required": false,
    "default": false,
    "help_text": "Check ONLY if you have exactly 2 jobs with similar pay"
  },
  {
    "id": "step3_header",
    "label": "Step 3: Claim Dependents",
    "type": "SECTION_HEADER",
    "required": false,
    "help_text": "If your total income will be $200,000 or less ($400,000 or less if married filing jointly)"
  },
  {
    "id": "step3_eligible",
    "label": "Are you eligible to claim dependents?",
    "type": "RADIO",
    "required": false,
    "options": [
      {
        "value": "no",
        "label": "No - My income exceeds the threshold or I have no dependents"
      },
      {
        "value": "yes",
        "label": "Yes - I am eligible to claim dependents"
      }
    ]
  },
  {
    "id": "qualifying_children",
    "label": "Number of qualifying children under age 17",
    "type": "NUMBER",
    "required": false,
    "validation": {
      "min": 0,
      "max": 20
    },
    "help_text": "Multiply by $2,000"
  },
  {
    "id": "other_dependents",
    "label": "Number of other dependents",
    "type": "NUMBER",
    "required": false,
    "validation": {
      "min": 0,
      "max": 20
    },
    "help_text": "Multiply by $500"
  },
  {
    "id": "step3_total",
    "label": "Step 3 Total Credit Amount",
    "type": "NUMBER",
    "required": false,
    "calculated": true,
    "formula": "(qualifying_children * 2000) + (other_dependents * 500)",
    "help_text": "Automatically calculated"
  },
  {
    "id": "step4_header",
    "label": "Step 4: Other Adjustments (optional)",
    "type": "SECTION_HEADER",
    "required": false
  },
  {
    "id": "step4a_other_income",
    "label": "Step 4(a): Other income (not from jobs)",
    "type": "NUMBER",
    "required": false,
    "validation": {
      "min": 0,
      "max": 9999999
    },
    "help_text": "Interest, dividends, retirement income, etc."
  },
  {
    "id": "step4b_deductions",
    "label": "Step 4(b): Deductions",
    "type": "NUMBER",
    "required": false,
    "validation": {
      "min": 0,
      "max": 9999999
    },
    "help_text": "Deductions other than standard deduction"
  },
  {
    "id": "step4c_extra_withholding",
    "label": "Step 4(c): Extra withholding per pay period",
    "type": "NUMBER",
    "required": false,
    "validation": {
      "min": 0,
      "max": 9999999
    },
    "help_text": "Additional tax to withhold each pay period"
  },
  {
    "id": "step5_header",
    "label": "Step 5: Sign Here",
    "type": "SECTION_HEADER",
    "required": false,
    "help_text": "Under penalties of perjury, I declare that this certificate is true, correct, and complete"
  },
  {
    "id": "employee_signature",
    "label": "Employee Signature",
    "type": "SIGNATURE",
    "required": true,
    "help_text": "Sign your name using the signature pad",
    "signature_config": {
      "type": "drawn",
      "require_date": true,
      "require_initials": false,
      "canvas_width": 400,
      "canvas_height": 150
    }
  },
  {
    "id": "signature_date",
    "label": "Date Signed",
    "type": "DATE",
    "required": true,
    "default": "today",
    "help_text": "Date you signed this form"
  }
]
        "#;

        // Insert W-4 template
        manager
            .get_connection()
            .execute_unprepared(&format!(
                r#"
                INSERT INTO hr_public.onboarding_form_templates
                (id, name, description, category, version, is_active, fields, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    'Federal W-4 Form (2024)',
                    'Employee''s Withholding Certificate - IRS Form W-4 (Rev. December 2020)',
                    'Tax Forms',
                    '2024',
                    true,
                    '{}',
                    NOW(),
                    NOW()
                )
                "#,
                w4_fields_json.replace("'", "''")
            ))
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Delete W-4 template
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DELETE FROM hr_public.onboarding_form_templates
                WHERE name = 'Federal W-4 Form (2024)'
                "#,
            )
            .await?;

        Ok(())
    }
}
