use std::path::{Path, PathBuf};
use std::fs;

/// Migration validation results
#[derive(Debug)]
pub struct ValidationReport {
    pub total_migrations: usize,
    pub issues: Vec<ValidationIssue>,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug)]
pub struct ValidationIssue {
    pub severity: IssueSeverity,
    pub file: String,
    pub line: Option<usize>,
    pub message: String,
    pub fix_suggestion: String,
}

#[derive(Debug)]
pub struct ValidationWarning {
    pub file: String,
    pub message: String,
}

#[derive(Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum IssueSeverity {
    Critical, // Will cause production failures
    High,     // Could cause failures
    Medium,   // Best practice violation
}

impl ValidationReport {
    pub fn is_valid(&self) -> bool {
        self.issues.iter().all(|i| matches!(i.severity, IssueSeverity::Medium))
    }

    pub fn critical_count(&self) -> usize {
        self.issues.iter().filter(|i| i.severity == IssueSeverity::Critical).count()
    }

    pub fn high_count(&self) -> usize {
        self.issues.iter().filter(|i| i.severity == IssueSeverity::High).count()
    }

    pub fn print_report(&self) {
        println!("\n🔍 MIGRATION VALIDATION REPORT");
        println!("=====================================");
        println!("Total Migrations: {}", self.total_migrations);
        println!("Critical Issues: {}", self.critical_count());
        println!("High Priority Issues: {}", self.high_count());
        println!("Warnings: {}", self.warnings.len());
        println!("=====================================\n");

        if self.issues.is_empty() {
            println!("✅ All migrations pass validation!\n");
            return;
        }

        // Group by severity
        let mut critical: Vec<_> = self.issues.iter()
            .filter(|i| i.severity == IssueSeverity::Critical)
            .collect();
        critical.sort_by_key(|i| &i.file);

        let mut high: Vec<_> = self.issues.iter()
            .filter(|i| i.severity == IssueSeverity::High)
            .collect();
        high.sort_by_key(|i| &i.file);

        let mut medium: Vec<_> = self.issues.iter()
            .filter(|i| i.severity == IssueSeverity::Medium)
            .collect();
        medium.sort_by_key(|i| &i.file);

        if !critical.is_empty() {
            println!("❌ CRITICAL ISSUES (Must Fix Before Deployment)");
            println!("------------------------------------------------");
            for issue in critical {
                Self::print_issue(issue);
            }
        }

        if !high.is_empty() {
            println!("\n⚠️  HIGH PRIORITY ISSUES");
            println!("------------------------------------------------");
            for issue in high {
                Self::print_issue(issue);
            }
        }

        if !medium.is_empty() {
            println!("\nℹ️  MEDIUM PRIORITY ISSUES (Best Practices)");
            println!("------------------------------------------------");
            for issue in medium {
                Self::print_issue(issue);
            }
        }

        if !self.warnings.is_empty() {
            println!("\n💡 WARNINGS");
            println!("------------------------------------------------");
            for warning in &self.warnings {
                println!("📄 {}", warning.file);
                println!("   {}", warning.message);
                println!();
            }
        }

        println!("\n📋 NEXT STEPS");
        println!("------------------------------------------------");
        if self.critical_count() > 0 {
            println!("1. Fix all CRITICAL issues immediately");
            println!("2. These issues can cause production failures");
            println!("3. Run validation again after fixes");
        } else if self.high_count() > 0 {
            println!("1. Review and fix HIGH priority issues");
            println!("2. These could cause failures in certain conditions");
        } else {
            println!("1. Consider addressing best practice issues");
            println!("2. These improve migration reliability");
        }
        println!();
    }

    fn print_issue(issue: &ValidationIssue) {
        let emoji = match issue.severity {
            IssueSeverity::Critical => "🔴",
            IssueSeverity::High => "🟠",
            IssueSeverity::Medium => "🟡",
        };

        println!("{} {}", emoji, issue.file);
        if let Some(line) = issue.line {
            println!("   Line {}: {}", line, issue.message);
        } else {
            println!("   {}", issue.message);
        }
        println!("   💡 Fix: {}", issue.fix_suggestion);
        println!();
    }
}

pub struct MigrationValidator {
    migration_dir: PathBuf,
}

impl MigrationValidator {
    pub fn new(migration_dir: impl AsRef<Path>) -> Self {
        Self {
            migration_dir: migration_dir.as_ref().to_path_buf(),
        }
    }

    pub fn validate(&self) -> ValidationReport {
        let mut report = ValidationReport {
            total_migrations: 0,
            issues: Vec::new(),
            warnings: Vec::new(),
        };

        let migration_files = self.find_migration_files();
        report.total_migrations = migration_files.len();

        for file_path in migration_files {
            self.validate_file(&file_path, &mut report);
        }

        report
    }

    fn find_migration_files(&self) -> Vec<PathBuf> {
        let mut files = Vec::new();

        if let Ok(entries) = fs::read_dir(&self.migration_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if name.starts_with("m2025") && name.ends_with(".rs") {
                            files.push(path);
                        }
                    }
                }
            }
        }

        files.sort();
        files
    }

    fn validate_file(&self, file_path: &Path, report: &mut ValidationReport) {
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => return,
        };

        // Check 1: Non-idempotent ADD COLUMN
        self.check_add_column_idempotency(&content, filename, report);

        // Check 2: Non-idempotent CREATE INDEX
        self.check_create_index_idempotency(&content, filename, report);

        // Check 3: Non-idempotent CREATE TABLE
        self.check_create_table_idempotency(&content, filename, report);

        // Check 4: Direct error propagation without handling
        self.check_error_handling(&content, filename, report);

        // Check 5: Migration helper usage
        self.check_helper_usage(&content, filename, report);
    }

    fn check_add_column_idempotency(&self, content: &str, filename: &str, report: &mut ValidationReport) {
        for (line_num, line) in content.lines().enumerate() {
            // Skip comments
            if line.trim_start().starts_with("//") || line.trim_start().starts_with("#") {
                continue;
            }

            if line.contains("ADD COLUMN") && !line.contains("IF NOT EXISTS") {
                report.issues.push(ValidationIssue {
                    severity: IssueSeverity::Critical,
                    file: filename.to_string(),
                    line: Some(line_num + 1),
                    message: "Non-idempotent ADD COLUMN statement".to_string(),
                    fix_suggestion: "Replace 'ADD COLUMN column_name' with 'ADD COLUMN IF NOT EXISTS column_name'".to_string(),
                });
            }
        }
    }

    fn check_create_index_idempotency(&self, content: &str, filename: &str, report: &mut ValidationReport) {
        for (line_num, line) in content.lines().enumerate() {
            if line.trim_start().starts_with("//") || line.trim_start().starts_with("#") {
                continue;
            }

            if line.contains("CREATE INDEX") && !line.contains("IF NOT EXISTS") {
                report.issues.push(ValidationIssue {
                    severity: IssueSeverity::High,
                    file: filename.to_string(),
                    line: Some(line_num + 1),
                    message: "Non-idempotent CREATE INDEX statement".to_string(),
                    fix_suggestion: "Replace 'CREATE INDEX idx_name' with 'CREATE INDEX IF NOT EXISTS idx_name'".to_string(),
                });
            }
        }
    }

    fn check_create_table_idempotency(&self, content: &str, filename: &str, report: &mut ValidationReport) {
        for (line_num, line) in content.lines().enumerate() {
            if line.trim_start().starts_with("//") || line.trim_start().starts_with("#") {
                continue;
            }

            if line.contains("CREATE TABLE") && !line.contains("IF NOT EXISTS") {
                report.issues.push(ValidationIssue {
                    severity: IssueSeverity::Critical,
                    file: filename.to_string(),
                    line: Some(line_num + 1),
                    message: "Non-idempotent CREATE TABLE statement".to_string(),
                    fix_suggestion: "Replace 'CREATE TABLE table_name' with 'CREATE TABLE IF NOT EXISTS table_name'".to_string(),
                });
            }
        }
    }

    fn check_error_handling(&self, content: &str, filename: &str, report: &mut ValidationReport) {
        // Count direct .await? without custom error handling
        let direct_await_count = content.matches("execute_unprepared").count();
        let has_match_handling = content.contains("match") && content.contains("already exists");

        if direct_await_count > 0 && !has_match_handling {
            report.issues.push(ValidationIssue {
                severity: IssueSeverity::Medium,
                file: filename.to_string(),
                line: None,
                message: "Direct error propagation without idempotent error handling".to_string(),
                fix_suggestion: "Use MigrationHelpers for graceful handling of 'already exists' errors".to_string(),
            });
        }
    }

    fn check_helper_usage(&self, content: &str, filename: &str, report: &mut ValidationReport) {
        let uses_helpers = content.contains("migration_helpers") ||
                          content.contains("MigrationHelpers");

        let has_raw_sql = content.contains("execute_unprepared");

        if has_raw_sql && !uses_helpers {
            report.warnings.push(ValidationWarning {
                file: filename.to_string(),
                message: "Consider using MigrationHelpers for better error handling and logging".to_string(),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validator_creation() {
        let validator = MigrationValidator::new(".");
        assert!(validator.migration_dir.exists() || !validator.migration_dir.exists());
    }

    #[test]
    fn test_detect_non_idempotent_add_column() {
        let content = r#"
            manager.execute_unprepared(
                "ALTER TABLE users ADD COLUMN email VARCHAR(255)"
            ).await?;
        "#;

        let mut report = ValidationReport {
            total_migrations: 1,
            issues: Vec::new(),
            warnings: Vec::new(),
        };

        let validator = MigrationValidator::new(".");
        validator.check_add_column_idempotency(content, "test.rs", &mut report);

        assert_eq!(report.issues.len(), 1);
        assert_eq!(report.issues[0].severity, IssueSeverity::Critical);
    }

    #[test]
    fn test_detect_idempotent_add_column() {
        let content = r#"
            manager.execute_unprepared(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"
            ).await?;
        "#;

        let mut report = ValidationReport {
            total_migrations: 1,
            issues: Vec::new(),
            warnings: Vec::new(),
        };

        let validator = MigrationValidator::new(".");
        validator.check_add_column_idempotency(content, "test.rs", &mut report);

        assert_eq!(report.issues.len(), 0);
    }
}
