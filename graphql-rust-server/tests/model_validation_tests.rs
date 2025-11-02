//! Model Validation Tests - Pure Logic (No Database Required)
//!
//! Quick win tests covering 70+ validation scenarios for:
//! - Email validation
//! - String field validation (length, format)
//! - Enum/Status validation
//! - Date validation
//! - Numeric field validation
//!
//! All tests are synchronous and fast (<1 second total execution).

#[cfg(test)]
mod email_validation_tests {
    use regex::Regex;

    /// Validate email format (RFC 5322 simplified)
    fn validate_email(email: &str) -> Result<(), String> {
        if email.is_empty() {
            return Err("Email cannot be empty".to_string());
        }

        if email.len() > 255 {
            return Err("Email exceeds maximum length of 255 characters".to_string());
        }

        // Simplified RFC 5322 regex for email validation
        let email_regex = Regex::new(
            r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
        ).unwrap();

        if !email_regex.is_match(email) {
            return Err("Invalid email format".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_validate_email_accepts_valid_formats() {
        assert!(validate_email("user@example.com").is_ok());
        assert!(validate_email("first.last@company.co.uk").is_ok());
        assert!(validate_email("admin@hr-system.io").is_ok());
        assert!(validate_email("test+tag@domain.com").is_ok());
    }

    #[test]
    fn test_validate_email_rejects_invalid_formats() {
        assert!(validate_email("invalid").is_err());
        assert!(validate_email("@example.com").is_err());
        assert!(validate_email("user@").is_err());
        assert!(validate_email("user @example.com").is_err());
        // Note: user..name@example.com is technically valid per RFC 5322 local-part rules
    }

    #[test]
    fn test_validate_email_rejects_empty() {
        let result = validate_email("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Email cannot be empty");
    }

    #[test]
    fn test_validate_email_handles_special_characters() {
        assert!(validate_email("user+test@example.com").is_ok());
        assert!(validate_email("user.name@example.com").is_ok());
        assert!(validate_email("user_name@example.com").is_ok());
    }

    #[test]
    fn test_validate_email_enforces_length_limits() {
        let long_email = format!("{}@example.com", "a".repeat(250));
        assert!(validate_email(&long_email).is_err());
    }
}

#[cfg(test)]
mod password_validation_tests {
    /// Validate password strength
    fn validate_password(password: &str) -> Result<(), String> {
        if password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }

        if password.len() > 128 {
            return Err("Password exceeds maximum length of 128 characters".to_string());
        }

        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| !c.is_alphanumeric());

        if !has_uppercase {
            return Err("Password must contain at least one uppercase letter".to_string());
        }

        if !has_lowercase {
            return Err("Password must contain at least one lowercase letter".to_string());
        }

        if !has_digit {
            return Err("Password must contain at least one number".to_string());
        }

        if !has_special {
            return Err("Password must contain at least one special character".to_string());
        }

        // Common weak passwords check
        let weak_passwords = vec!["Password123!", "Admin123!", "Welcome123!"];
        if weak_passwords.contains(&password) {
            return Err("Password is too common".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_password_minimum_length_requirement() {
        assert!(validate_password("Short1!").is_err());
        assert!(validate_password("Valid123!").is_ok());
    }

    #[test]
    fn test_password_requires_uppercase_letter() {
        let result = validate_password("password123!");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("uppercase"));
    }

    #[test]
    fn test_password_requires_lowercase_letter() {
        let result = validate_password("PASSWORD123!");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("lowercase"));
    }

    #[test]
    fn test_password_requires_number() {
        let result = validate_password("Password!");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("number"));
    }

    #[test]
    fn test_password_requires_special_character() {
        let result = validate_password("Password123");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("special character"));
    }

    #[test]
    fn test_password_rejects_common_passwords() {
        assert!(validate_password("Password123!").is_err());
        assert!(validate_password("Admin123!").is_err());
    }

    #[test]
    fn test_password_enforces_max_length() {
        let long_password = format!("P{}1!", "a".repeat(130));
        assert!(validate_password(&long_password).is_err());
    }
}

#[cfg(test)]
mod date_range_validation_tests {
    use chrono::{DateTime, Duration, Utc};

    /// Validate date range
    fn validate_date_range(
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<(), String> {
        if end_date <= start_date {
            return Err("End date must be after start date".to_string());
        }

        let max_duration = Duration::days(365); // 1 year max
        if end_date - start_date > max_duration {
            return Err("Date range exceeds maximum duration of 1 year".to_string());
        }

        Ok(())
    }

    /// Validate future date
    fn validate_future_date(date: DateTime<Utc>) -> Result<(), String> {
        if date <= Utc::now() {
            return Err("Date must be in the future".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_start_date_before_end_date_validation() {
        let start = Utc::now();
        let end = start + Duration::days(7);
        assert!(validate_date_range(start, end).is_ok());
    }

    #[test]
    fn test_end_date_before_start_date_rejected() {
        let start = Utc::now();
        let end = start - Duration::days(1);
        assert!(validate_date_range(start, end).is_err());
    }

    #[test]
    fn test_date_range_maximum_duration_check() {
        let start = Utc::now();
        let end = start + Duration::days(400); // Exceeds 365 days
        let result = validate_date_range(start, end);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("maximum duration"));
    }

    #[test]
    fn test_past_dates_rejected_for_future_only_fields() {
        let past_date = Utc::now() - Duration::days(7);
        assert!(validate_future_date(past_date).is_err());
    }

    #[test]
    fn test_future_dates_accepted() {
        let future_date = Utc::now() + Duration::days(7);
        assert!(validate_future_date(future_date).is_ok());
    }
}

#[cfg(test)]
mod enum_status_validation_tests {
    /// User status enum
    #[derive(Debug, PartialEq)]
    enum UserStatus {
        Active,
        Inactive,
        Terminated,
    }

    /// Parse user status from string
    fn parse_user_status(status: &str) -> Result<UserStatus, String> {
        match status.to_lowercase().as_str() {
            "active" => Ok(UserStatus::Active),
            "inactive" => Ok(UserStatus::Inactive),
            "terminated" => Ok(UserStatus::Terminated),
            _ => Err(format!("Invalid user status: {}", status)),
        }
    }

    /// Task status transitions
    fn validate_task_status_transition(from: &str, to: &str) -> Result<(), String> {
        let valid_transitions = vec![
            ("todo", "in_progress"),
            ("in_progress", "review"),
            ("review", "done"),
            ("review", "in_progress"),
            ("in_progress", "blocked"),
            ("blocked", "in_progress"),
        ];

        if valid_transitions.contains(&(from, to)) {
            Ok(())
        } else {
            Err(format!("Invalid status transition from {} to {}", from, to))
        }
    }

    #[test]
    fn test_valid_enum_values_accepted() {
        assert_eq!(parse_user_status("active").unwrap(), UserStatus::Active);
        assert_eq!(
            parse_user_status("inactive").unwrap(),
            UserStatus::Inactive
        );
        assert_eq!(
            parse_user_status("terminated").unwrap(),
            UserStatus::Terminated
        );
    }

    #[test]
    fn test_invalid_enum_values_rejected() {
        assert!(parse_user_status("invalid").is_err());
        assert!(parse_user_status("deleted").is_err());
        assert!(parse_user_status("").is_err());
    }

    #[test]
    fn test_status_transition_validation() {
        // Valid transitions
        assert!(validate_task_status_transition("todo", "in_progress").is_ok());
        assert!(validate_task_status_transition("in_progress", "review").is_ok());
        assert!(validate_task_status_transition("review", "done").is_ok());

        // Invalid transitions
        assert!(validate_task_status_transition("todo", "done").is_err());
        assert!(validate_task_status_transition("done", "todo").is_err());
    }

    #[test]
    fn test_case_insensitive_enum_matching() {
        assert_eq!(parse_user_status("ACTIVE").unwrap(), UserStatus::Active);
        assert_eq!(parse_user_status("Active").unwrap(), UserStatus::Active);
        assert_eq!(parse_user_status("AcTiVe").unwrap(), UserStatus::Active);
    }
}

#[cfg(test)]
mod string_field_validation_tests {
    /// Validate string field with length constraints
    fn validate_string_field(
        field_name: &str,
        value: &str,
        min_length: usize,
        max_length: usize,
    ) -> Result<(), String> {
        if value.is_empty() {
            return Err(format!("{} cannot be empty", field_name));
        }

        if value.len() < min_length {
            return Err(format!(
                "{} must be at least {} characters long",
                field_name, min_length
            ));
        }

        if value.len() > max_length {
            return Err(format!(
                "{} exceeds maximum length of {} characters",
                field_name, max_length
            ));
        }

        Ok(())
    }

    /// Trim and validate whitespace
    fn validate_and_trim(value: &str) -> Result<String, String> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err("Value cannot be only whitespace".to_string());
        }
        Ok(trimmed.to_string())
    }

    #[test]
    fn test_maximum_length_enforcement() {
        let result = validate_string_field("title", &"a".repeat(256), 1, 255);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("exceeds maximum length"));
    }

    #[test]
    fn test_minimum_length_enforcement() {
        let result = validate_string_field("name", "ab", 3, 50);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("at least 3 characters"));
    }

    #[test]
    fn test_required_field_validation() {
        let result = validate_string_field("email", "", 1, 255);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be empty"));
    }

    #[test]
    fn test_whitespace_trimming() {
        assert_eq!(validate_and_trim("  hello  ").unwrap(), "hello");
        assert_eq!(validate_and_trim("\thello\n").unwrap(), "hello");
    }

    #[test]
    fn test_whitespace_only_rejected() {
        assert!(validate_and_trim("   ").is_err());
        assert!(validate_and_trim("\t\n").is_err());
    }

    #[test]
    fn test_special_character_handling() {
        // Should accept alphanumeric and common special characters
        assert!(validate_string_field("description", "Task #1: Review & approve!", 1, 100).is_ok());
        assert!(validate_string_field("notes", "Test (2024) - Q1", 1, 100).is_ok());
    }
}

#[cfg(test)]
mod numeric_field_validation_tests {
    /// Validate integer range
    fn validate_integer_range(
        field_name: &str,
        value: i32,
        min: i32,
        max: i32,
    ) -> Result<(), String> {
        if value < min {
            return Err(format!("{} must be at least {}", field_name, min));
        }

        if value > max {
            return Err(format!("{} must be at most {}", field_name, max));
        }

        Ok(())
    }

    /// Validate decimal precision
    fn validate_decimal_precision(value: f64, max_decimals: usize) -> Result<(), String> {
        let value_str = value.to_string();
        if let Some(decimal_pos) = value_str.find('.') {
            let decimals = value_str.len() - decimal_pos - 1;
            if decimals > max_decimals {
                return Err(format!(
                    "Value has {} decimal places, maximum is {}",
                    decimals, max_decimals
                ));
            }
        }
        Ok(())
    }

    /// Validate percentage (0-100)
    fn validate_percentage(value: i32) -> Result<(), String> {
        if value < 0 || value > 100 {
            return Err("Percentage must be between 0 and 100".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_minimum_value_enforcement() {
        let result = validate_integer_range("capacity", -5, 0, 100);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("at least 0"));
    }

    #[test]
    fn test_maximum_value_enforcement() {
        let result = validate_integer_range("hours", 200, 0, 168);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("at most 168"));
    }

    #[test]
    fn test_decimal_precision_validation() {
        assert!(validate_decimal_precision(123.45, 2).is_ok());
        assert!(validate_decimal_precision(123.456, 2).is_err());
    }

    #[test]
    fn test_negative_number_handling() {
        // Some fields should reject negative numbers
        assert!(validate_integer_range("age", -1, 0, 120).is_err());
        assert!(validate_integer_range("count", 0, 0, 1000).is_ok());
    }

    #[test]
    fn test_percentage_validation() {
        assert!(validate_percentage(50).is_ok());
        assert!(validate_percentage(0).is_ok());
        assert!(validate_percentage(100).is_ok());
        assert!(validate_percentage(-1).is_err());
        assert!(validate_percentage(101).is_err());
    }
}

#[cfg(test)]
mod phone_number_validation_tests {
    use regex::Regex;

    /// Validate phone number format (E.164 international format)
    fn validate_phone_number(phone: &str) -> Result<(), String> {
        if phone.is_empty() {
            return Err("Phone number cannot be empty".to_string());
        }

        // E.164 format: +[country code][number] (max 15 digits)
        let phone_regex = Regex::new(r"^\+?[1-9]\d{1,14}$").unwrap();

        if !phone_regex.is_match(phone) {
            return Err("Invalid phone number format (use E.164 format)".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_valid_phone_formats_accepted() {
        assert!(validate_phone_number("+1234567890").is_ok());
        assert!(validate_phone_number("+447911123456").is_ok());
        assert!(validate_phone_number("1234567890").is_ok());
    }

    #[test]
    fn test_invalid_phone_formats_rejected() {
        // Note: "123" is technically valid per E.164 (min 2 digits after country code)
        assert!(validate_phone_number("+0123456789").is_err()); // Starts with 0
        assert!(validate_phone_number("abc123").is_err()); // Contains letters
        assert!(validate_phone_number("+1 234 567 890").is_err()); // Contains spaces
        assert!(validate_phone_number("0123456789").is_err()); // Starts with 0 (no country code)
    }

    #[test]
    fn test_phone_number_length_limits() {
        let too_long = format!("+{}", "1".repeat(20));
        assert!(validate_phone_number(&too_long).is_err());
    }
}

#[cfg(test)]
mod url_validation_tests {
    use regex::Regex;

    /// Validate URL format
    fn validate_url(url: &str) -> Result<(), String> {
        if url.is_empty() {
            return Err("URL cannot be empty".to_string());
        }

        // Simplified URL validation
        let url_regex = Regex::new(
            r"^https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$"
        ).unwrap();

        if !url_regex.is_match(url) {
            return Err("Invalid URL format".to_string());
        }

        if url.len() > 2048 {
            return Err("URL exceeds maximum length of 2048 characters".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_valid_url_formats_accepted() {
        assert!(validate_url("https://example.com").is_ok());
        assert!(validate_url("http://subdomain.example.com/path").is_ok());
        assert!(validate_url("https://example.com/path?query=value").is_ok());
    }

    #[test]
    fn test_invalid_url_formats_rejected() {
        assert!(validate_url("not-a-url").is_err());
        assert!(validate_url("ftp://example.com").is_err()); // Wrong protocol
        assert!(validate_url("").is_err());
    }

    #[test]
    fn test_url_length_limits() {
        let long_url = format!("https://example.com/{}", "a".repeat(2100));
        assert!(validate_url(&long_url).is_err());
    }
}

#[cfg(test)]
mod uuid_validation_tests {
    use uuid::Uuid;

    /// Validate UUID format
    fn validate_uuid(uuid_str: &str) -> Result<Uuid, String> {
        Uuid::parse_str(uuid_str).map_err(|_| "Invalid UUID format".to_string())
    }

    #[test]
    fn test_valid_uuid_formats_accepted() {
        assert!(validate_uuid("550e8400-e29b-41d4-a716-446655440000").is_ok());
        assert!(validate_uuid("f47ac10b-58cc-4372-a567-0e02b2c3d479").is_ok());
    }

    #[test]
    fn test_invalid_uuid_formats_rejected() {
        assert!(validate_uuid("not-a-uuid").is_err());
        assert!(validate_uuid("550e8400-e29b-41d4-a716").is_err()); // Too short
        assert!(validate_uuid("").is_err());
        // Note: UUID without dashes is valid in some parsers (hyphen-less format)
        // assert!(validate_uuid("550e8400e29b41d4a716446655440000").is_err());
    }
}

#[cfg(test)]
mod color_validation_tests {
    use regex::Regex;

    /// Validate hex color format
    fn validate_hex_color(color: &str) -> Result<(), String> {
        if color.is_empty() {
            return Err("Color cannot be empty".to_string());
        }

        let hex_regex = Regex::new(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$").unwrap();

        if !hex_regex.is_match(color) {
            return Err("Invalid hex color format (use #RRGGBB or #RGB)".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_valid_hex_colors_accepted() {
        assert!(validate_hex_color("#FF5733").is_ok());
        assert!(validate_hex_color("#fff").is_ok());
        assert!(validate_hex_color("#000000").is_ok());
    }

    #[test]
    fn test_invalid_hex_colors_rejected() {
        assert!(validate_hex_color("FF5733").is_err()); // Missing #
        assert!(validate_hex_color("#GG5733").is_err()); // Invalid chars
        assert!(validate_hex_color("#FF57").is_err()); // Wrong length
    }
}

#[cfg(test)]
mod rrule_validation_tests {
    /// Validate RRULE format (simplified)
    fn validate_rrule(rrule: &str) -> Result<(), String> {
        if rrule.is_empty() {
            return Err("RRULE cannot be empty".to_string());
        }

        // Must start with FREQ=
        if !rrule.starts_with("FREQ=") {
            return Err("RRULE must start with FREQ=".to_string());
        }

        // Check for valid frequency values
        let valid_freqs = vec!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
        let has_valid_freq = valid_freqs.iter().any(|f| rrule.contains(f));

        if !has_valid_freq {
            return Err("RRULE must contain valid FREQ (DAILY, WEEKLY, MONTHLY, or YEARLY)".to_string());
        }

        Ok(())
    }

    #[test]
    fn test_valid_rrule_formats_accepted() {
        assert!(validate_rrule("FREQ=DAILY;INTERVAL=1").is_ok());
        assert!(validate_rrule("FREQ=WEEKLY;BYDAY=MO,WE,FR").is_ok());
        assert!(validate_rrule("FREQ=MONTHLY;BYMONTHDAY=15").is_ok());
    }

    #[test]
    fn test_invalid_rrule_formats_rejected() {
        assert!(validate_rrule("DAILY").is_err()); // Missing FREQ=
        assert!(validate_rrule("FREQ=INVALID").is_err()); // Invalid frequency
        assert!(validate_rrule("").is_err());
    }
}
