//! Data Validation Engine for QuickBooks Sync
//!
//! Pre-sync validation system that catches data quality issues before syncing,
//! preventing invalid, incomplete, or malformed data from entering either system.

use anyhow::Result;
use chrono::{DateTime, Utc};
use regex::Regex;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::integrations::intuit::{EmployeeExtended as QBEmployeeExtended, Department as QBDepartment};
use crate::models::{user, department, validation_failure, validation_rule};

/// Entity type being validated
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityType {
    Employee,
    Department,
}

impl EntityType {
    pub fn as_str(&self) -> &str {
        match self {
            EntityType::Employee => "Employee",
            EntityType::Department => "Department",
        }
    }
}

/// Type of validation rule
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleType {
    /// Field must be present and non-empty
    Required,
    /// Field must match a format (regex, email, phone)
    Format,
    /// Value must be within a range (min/max)
    Range,
    /// String length constraints
    Length,
    /// Reference to another entity must be valid
    Reference,
    /// Custom validation logic
    Custom,
    /// Complex business rules
    Business,
}

/// Severity of validation failure
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    /// Critical error - blocks sync
    Error,
    /// Warning - logs but allows sync
    Warning,
    /// Informational only
    Info,
}

impl Severity {
    pub fn as_str(&self) -> &str {
        match self {
            Severity::Error => "ERROR",
            Severity::Warning => "WARNING",
            Severity::Info => "INFO",
        }
    }
}

/// Auto-fix strategy for validation failures
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutoFixStrategy {
    /// Trim leading/trailing whitespace
    TrimWhitespace,
    /// Convert to proper case (John Smith)
    ProperCase,
    /// Format phone number (555-123-4567)
    FormatPhone,
    /// Use default value if empty
    UseDefault(String),
    /// No auto-fix available
    None,
}

/// A validation rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub entity_type: EntityType,
    pub field_name: String,
    pub rule_type: RuleType,
    pub condition: String,
    pub severity: Severity,
    pub auto_fix: AutoFixStrategy,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

/// A validation error or warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub rule_id: Uuid,
    pub rule_name: String,
    pub entity_type: EntityType,
    pub entity_id: Option<String>,
    pub field_name: String,
    pub invalid_value: String,
    pub error_message: String,
    pub severity: Severity,
    pub auto_fix_available: bool,
    pub detected_at: DateTime<Utc>,
}

/// Result of validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
    pub score: u8, // 0-100 data quality score
}

impl ValidationResult {
    /// Create a new passing validation result
    pub fn pass() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
            score: 100,
        }
    }

    /// Check if there are any blocking errors
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    /// Calculate data quality score
    fn calculate_score(errors: &[ValidationError], warnings: &[ValidationError]) -> u8 {
        let error_penalty = errors.len() * 20;
        let warning_penalty = warnings.len() * 5;
        let total_penalty = error_penalty + warning_penalty;

        100u8.saturating_sub(total_penalty.min(100) as u8)
    }

    /// Add an error to the result
    pub fn add_error(&mut self, error: ValidationError) {
        if error.severity == Severity::Error {
            self.valid = false;
            self.errors.push(error);
        } else if error.severity == Severity::Warning {
            self.warnings.push(error);
        }
        self.score = Self::calculate_score(&self.errors, &self.warnings);
    }
}

/// Validation engine for data quality checks
pub struct ValidationEngine {
    rules: Vec<ValidationRule>,
}

impl ValidationEngine {
    /// Create a new validation engine with built-in rules
    pub fn new() -> Self {
        Self {
            rules: Self::create_builtin_rules(),
        }
    }

    /// Create built-in validation rules
    fn create_builtin_rules() -> Vec<ValidationRule> {
        let mut rules = Vec::new();

        // Employee validation rules
        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_email_required".to_string(),
            description: Some("Employee must have a valid email address".to_string()),
            entity_type: EntityType::Employee,
            field_name: "email".to_string(),
            rule_type: RuleType::Required,
            condition: "not_empty".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_email_format".to_string(),
            description: Some("Email must be in valid format".to_string()),
            entity_type: EntityType::Employee,
            field_name: "email".to_string(),
            rule_type: RuleType::Format,
            condition: r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::TrimWhitespace,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_first_name_required".to_string(),
            description: Some("Employee must have a first name".to_string()),
            entity_type: EntityType::Employee,
            field_name: "first_name".to_string(),
            rule_type: RuleType::Required,
            condition: "not_empty".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_last_name_required".to_string(),
            description: Some("Employee must have a last name".to_string()),
            entity_type: EntityType::Employee,
            field_name: "last_name".to_string(),
            rule_type: RuleType::Required,
            condition: "not_empty".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_name_format".to_string(),
            description: Some("Name should not contain special characters or numbers".to_string()),
            entity_type: EntityType::Employee,
            field_name: "first_name,last_name".to_string(),
            rule_type: RuleType::Format,
            condition: r"^[a-zA-Z\s'-]+$".to_string(),
            severity: Severity::Warning,
            auto_fix: AutoFixStrategy::ProperCase,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "employee_name_length".to_string(),
            description: Some("Name must be between 1 and 100 characters".to_string()),
            entity_type: EntityType::Employee,
            field_name: "first_name,last_name".to_string(),
            rule_type: RuleType::Length,
            condition: "1,100".to_string(), // min,max
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        // Department validation rules
        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "department_name_required".to_string(),
            description: Some("Department must have a name".to_string()),
            entity_type: EntityType::Department,
            field_name: "name".to_string(),
            rule_type: RuleType::Required,
            condition: "not_empty".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        rules.push(ValidationRule {
            id: Uuid::new_v4(),
            name: "department_name_length".to_string(),
            description: Some("Department name must be between 1 and 100 characters".to_string()),
            entity_type: EntityType::Department,
            field_name: "name".to_string(),
            rule_type: RuleType::Length,
            condition: "1,100".to_string(),
            severity: Severity::Error,
            auto_fix: AutoFixStrategy::None,
            enabled: true,
            created_at: Utc::now(),
        });

        rules
    }

    /// Validate a local employee before pushing to QuickBooks
    pub fn validate_local_employee(&self, employee: &user::Model) -> ValidationResult {
        let mut result = ValidationResult::pass();

        for rule in &self.rules {
            if !rule.enabled || rule.entity_type != EntityType::Employee {
                continue;
            }

            let validation_error = match rule.field_name.as_str() {
                "email" => self.validate_field(
                    rule,
                    &employee.email,
                    Some(employee.id.to_string()),
                ),
                "first_name" => self.validate_field(
                    rule,
                    &employee.first_name,
                    Some(employee.id.to_string()),
                ),
                "last_name" => self.validate_field(
                    rule,
                    &employee.last_name,
                    Some(employee.id.to_string()),
                ),
                "first_name,last_name" => {
                    // Validate both first and last name with the same rule
                    if let Some(err) = self.validate_field(
                        rule,
                        &employee.first_name,
                        Some(employee.id.to_string()),
                    ) {
                        Some(err)
                    } else {
                        self.validate_field(
                            rule,
                            &employee.last_name,
                            Some(employee.id.to_string()),
                        )
                    }
                }
                _ => None,
            };

            if let Some(error) = validation_error {
                result.add_error(error);
            }
        }

        result
    }

    /// Validate a QuickBooks employee before pulling to local DB
    pub fn validate_quickbooks_employee(&self, employee: &QBEmployeeExtended, qb_id: &str) -> ValidationResult {
        let mut result = ValidationResult::pass();

        for rule in &self.rules {
            if !rule.enabled || rule.entity_type != EntityType::Employee {
                continue;
            }

            let validation_error = match rule.field_name.as_str() {
                "email" => {
                    let email = employee.base.primary_email_addr
                        .as_ref()
                        .and_then(|e| e.address.as_ref())
                        .map(|s| s.as_str())
                        .unwrap_or("");
                    self.validate_field(rule, email, Some(qb_id.to_string()))
                }
                "first_name" => {
                    let first_name = employee.base.given_name.as_deref().unwrap_or("");
                    self.validate_field(rule, first_name, Some(qb_id.to_string()))
                }
                "last_name" => {
                    let last_name = employee.base.family_name.as_deref().unwrap_or("");
                    self.validate_field(rule, last_name, Some(qb_id.to_string()))
                }
                "first_name,last_name" => {
                    let first_name = employee.base.given_name.as_deref().unwrap_or("");
                    let last_name = employee.base.family_name.as_deref().unwrap_or("");

                    if let Some(err) = self.validate_field(rule, first_name, Some(qb_id.to_string())) {
                        Some(err)
                    } else {
                        self.validate_field(rule, last_name, Some(qb_id.to_string()))
                    }
                }
                _ => None,
            };

            if let Some(error) = validation_error {
                result.add_error(error);
            }
        }

        result
    }

    /// Validate a local department before pushing to QuickBooks
    pub fn validate_local_department(&self, department: &department::Model) -> ValidationResult {
        let mut result = ValidationResult::pass();

        for rule in &self.rules {
            if !rule.enabled || rule.entity_type != EntityType::Department {
                continue;
            }

            let validation_error = match rule.field_name.as_str() {
                "name" => self.validate_field(
                    rule,
                    &department.name,
                    Some(department.id.to_string()),
                ),
                _ => None,
            };

            if let Some(error) = validation_error {
                result.add_error(error);
            }
        }

        result
    }

    /// Validate a QuickBooks department before pulling to local DB
    pub fn validate_quickbooks_department(&self, department: &QBDepartment, qb_id: &str) -> ValidationResult {
        let mut result = ValidationResult::pass();

        for rule in &self.rules {
            if !rule.enabled || rule.entity_type != EntityType::Department {
                continue;
            }

            let validation_error = match rule.field_name.as_str() {
                "name" => {
                    let name = department.name.as_deref().unwrap_or("");
                    self.validate_field(rule, name, Some(qb_id.to_string()))
                }
                _ => None,
            };

            if let Some(error) = validation_error {
                result.add_error(error);
            }
        }

        result
    }

    /// Validate a single field against a rule
    fn validate_field(
        &self,
        rule: &ValidationRule,
        value: &str,
        entity_id: Option<String>,
    ) -> Option<ValidationError> {
        let is_valid = match &rule.rule_type {
            RuleType::Required => !value.trim().is_empty(),
            RuleType::Format => {
                if value.is_empty() {
                    return None; // Skip format validation for empty fields (handled by Required rule)
                }
                if let Ok(regex) = Regex::new(&rule.condition) {
                    regex.is_match(value)
                } else {
                    true // Invalid regex pattern, skip validation
                }
            }
            RuleType::Length => {
                let parts: Vec<&str> = rule.condition.split(',').collect();
                if parts.len() == 2 {
                    if let (Ok(min), Ok(max)) = (parts[0].parse::<usize>(), parts[1].parse::<usize>()) {
                        let len = value.len();
                        len >= min && len <= max
                    } else {
                        true
                    }
                } else {
                    true
                }
            }
            _ => true, // Other rule types not yet implemented
        };

        if !is_valid {
            Some(ValidationError {
                rule_id: rule.id,
                rule_name: rule.name.clone(),
                entity_type: rule.entity_type,
                entity_id,
                field_name: rule.field_name.clone(),
                invalid_value: value.to_string(),
                error_message: rule.description.clone().unwrap_or_else(|| {
                    format!("Validation failed for field: {}", rule.field_name)
                }),
                severity: rule.severity,
                auto_fix_available: rule.auto_fix != AutoFixStrategy::None,
                detected_at: Utc::now(),
            })
        } else {
            None
        }
    }

    /// Attempt to auto-fix validation errors
    pub fn auto_fix(&self, value: &str, strategy: &AutoFixStrategy) -> Option<String> {
        match strategy {
            AutoFixStrategy::TrimWhitespace => Some(value.trim().to_string()),
            AutoFixStrategy::ProperCase => Some(Self::to_proper_case(value)),
            AutoFixStrategy::FormatPhone => Self::format_phone(value),
            AutoFixStrategy::UseDefault(default) => {
                if value.trim().is_empty() {
                    Some(default.clone())
                } else {
                    None
                }
            }
            AutoFixStrategy::None => None,
        }
    }

    /// Convert string to proper case (capitalize first letter of each word)
    fn to_proper_case(s: &str) -> String {
        s.split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => {
                        first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                    }
                }
            })
            .collect::<Vec<String>>()
            .join(" ")
    }

    /// Format phone number to standard format
    fn format_phone(s: &str) -> Option<String> {
        // Extract digits only
        let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();

        // Format as XXX-XXX-XXXX for 10 digits
        if digits.len() == 10 {
            Some(format!(
                "{}-{}-{}",
                &digits[0..3],
                &digits[3..6],
                &digits[6..10]
            ))
        } else {
            None
        }
    }

    /// Save validation errors to database
    pub async fn save_errors(
        &self,
        db: &DatabaseConnection,
        errors: &[ValidationError],
    ) -> Result<()> {
        use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};

        for error in errors {
            // Try to find existing rule by name, or create a default one
            let rule = match validation_rule::Entity::find()
                .filter(validation_rule::Column::Name.eq(&error.rule_name))
                .one(db)
                .await?
            {
                Some(rule) => rule,
                None => {
                    // Create a default rule for this validation error
                    let new_rule = validation_rule::ActiveModel {
                        id: Set(Uuid::new_v4()),
                        name: Set(error.rule_name.clone()),
                        description: Set(Some(error.error_message.clone())),
                        entity_type: Set(error.entity_type.as_str().to_string()),
                        field_name: Set(error.field_name.clone()),
                        rule_type: Set("runtime".to_string()), // Runtime-generated rule
                        condition: Set("validation_failed".to_string()),
                        severity: Set(error.severity.as_str().to_string()),
                        auto_fix_strategy: Set("none".to_string()),
                        enabled: Set(true),
                        created_by: Set(None),
                        created_at: Set(Utc::now()),
                        updated_at: Set(Utc::now()),
                    };
                    new_rule.insert(db).await?
                }
            };

            // Save the validation failure
            let failure = validation_failure::ActiveModel {
                id: Set(Uuid::new_v4()),
                rule_id: Set(rule.id),
                entity_type: Set(error.entity_type.as_str().to_string()),
                entity_id: Set(error.entity_id.clone()),
                field_name: Set(error.field_name.clone()),
                invalid_value: Set(Some(error.invalid_value.clone())),
                error_message: Set(error.error_message.clone()),
                severity: Set(error.severity.as_str().to_string()),
                detected_at: Set(Utc::now()),
                resolved_at: Set(None),
                resolution: Set(None),
            };

            match failure.insert(db).await {
                Ok(_) => {
                    tracing::info!(
                        "Saved validation error: {} - {} (field: {}, value: '{}')",
                        error.rule_name,
                        error.error_message,
                        error.field_name,
                        error.invalid_value
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to save validation error '{}': {}",
                        error.rule_name,
                        e
                    );
                }
            }
        }
        Ok(())
    }

    /// Load custom validation rules from database
    pub async fn load_custom_rules(&mut self, _db: &DatabaseConnection) -> Result<()> {
        // TODO: Load rules from validation_rules table once entity is generated
        Ok(())
    }
}

impl Default for ValidationEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        let engine = ValidationEngine::new();

        // Find email format rule
        let rule = engine.rules.iter()
            .find(|r| r.name == "employee_email_format")
            .expect("Email format rule should exist");

        // Valid emails
        assert!(engine.validate_field(rule, "user@example.com", None).is_none());
        assert!(engine.validate_field(rule, "test.user@company.co.uk", None).is_none());

        // Invalid emails
        assert!(engine.validate_field(rule, "invalid", None).is_some());
        assert!(engine.validate_field(rule, "user@", None).is_some());
        assert!(engine.validate_field(rule, "@example.com", None).is_some());
    }

    #[test]
    fn test_required_validation() {
        let engine = ValidationEngine::new();

        let rule = engine.rules.iter()
            .find(|r| r.name == "employee_first_name_required")
            .expect("First name required rule should exist");

        // Valid
        assert!(engine.validate_field(rule, "John", None).is_none());

        // Invalid
        assert!(engine.validate_field(rule, "", None).is_some());
        assert!(engine.validate_field(rule, "   ", None).is_some());
    }

    #[test]
    fn test_length_validation() {
        let engine = ValidationEngine::new();

        let rule = engine.rules.iter()
            .find(|r| r.name == "employee_name_length")
            .expect("Name length rule should exist");

        // Valid
        assert!(engine.validate_field(rule, "John", None).is_none());
        assert!(engine.validate_field(rule, "A", None).is_none());

        // Invalid - too long (>100 chars)
        let long_name = "a".repeat(101);
        assert!(engine.validate_field(rule, &long_name, None).is_some());
    }

    #[test]
    fn test_proper_case() {
        assert_eq!(ValidationEngine::to_proper_case("john smith"), "John Smith");
        assert_eq!(ValidationEngine::to_proper_case("JANE DOE"), "Jane Doe");
        assert_eq!(ValidationEngine::to_proper_case("mary-jane watson"), "Mary-jane Watson");
    }

    #[test]
    fn test_phone_format() {
        assert_eq!(
            ValidationEngine::format_phone("5551234567"),
            Some("555-123-4567".to_string())
        );
        assert_eq!(
            ValidationEngine::format_phone("(555) 123-4567"),
            Some("555-123-4567".to_string())
        );
        assert_eq!(ValidationEngine::format_phone("123"), None);
    }

    #[test]
    fn test_validation_result_score() {
        let mut result = ValidationResult::pass();
        assert_eq!(result.score, 100);

        // Add an error (20 point penalty)
        result.add_error(ValidationError {
            rule_id: Uuid::new_v4(),
            rule_name: "test".to_string(),
            entity_type: EntityType::Employee,
            entity_id: None,
            field_name: "test".to_string(),
            invalid_value: "".to_string(),
            error_message: "test error".to_string(),
            severity: Severity::Error,
            auto_fix_available: false,
            detected_at: Utc::now(),
        });

        assert_eq!(result.score, 80);
        assert!(!result.valid);
    }
}
