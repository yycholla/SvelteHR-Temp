//! Email Service for sending digest emails

use chrono::Datelike;
use handlebars::Handlebars;
use lettre::{
    message::{header::ContentType, Mailbox, MultiPart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

const HTML_TEMPLATE: &str = include_str!("../templates/digest_email.html");
const TEXT_TEMPLATE: &str = include_str!("../templates/digest_email.txt");
const PASSWORD_RESET_HTML: &str = include_str!("../templates/password_reset_email.html");
const PASSWORD_RESET_TEXT: &str = include_str!("../templates/password_reset_email.txt");

#[derive(Debug, Clone)]
pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub from_name: String,
    pub base_url: String,
}

impl EmailConfig {
    /// Load email configuration from environment variables
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            smtp_host: std::env::var("SMTP_HOST")
                .unwrap_or_else(|_| "smtp.gmail.com".to_string()),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()?,
            smtp_username: std::env::var("SMTP_USERNAME")?,
            smtp_password: std::env::var("SMTP_PASSWORD")?,
            from_email: std::env::var("SMTP_FROM_EMAIL")
                .unwrap_or_else(|_| "noreply@sveltehr.com".to_string()),
            from_name: std::env::var("SMTP_FROM_NAME")
                .unwrap_or_else(|_| "SvelteHR System".to_string()),
            base_url: std::env::var("APP_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
        })
    }
}

#[derive(Debug, Clone)]
pub struct EmailService {
    config: Arc<EmailConfig>,
    handlebars: Arc<Handlebars<'static>>,
}

#[derive(Debug, Serialize)]
pub struct DigestEmailData {
    pub digest_name: String,
    pub period_label: String,

    // Sync summary
    pub show_sync_summary: bool,
    pub total_syncs: i32,
    pub successful_syncs: i32,
    pub failed_syncs: i32,
    pub has_failed_syncs: bool,

    // Conflicts
    pub show_conflicts: bool,
    pub conflicts_detected: i32,
    pub conflicts_resolved: i32,
    pub pending_conflicts: i32,
    pub has_pending_conflicts: bool,

    // Health metrics
    pub show_health_metrics: bool,
    pub uptime_percentage: f64,
    pub data_quality_score: f64,
    pub uptime_class: String,
    pub quality_class: String,
    pub has_health_issues: bool,

    // Employee updates
    pub show_new_employees: bool,
    pub new_employees: i32,
    pub updated_employees: i32,
    pub has_new_employees: bool,
    pub new_employee_list: Vec<EmployeeInfo>,

    // Footer
    pub unsubscribe_url: String,
    pub dashboard_url: String,
    pub current_year: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmployeeInfo {
    pub name: String,
    pub email: String,
}

impl EmailService {
    /// Create a new email service
    pub fn new(config: EmailConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let mut handlebars = Handlebars::new();

        // Register templates
        handlebars.register_template_string("digest_html", HTML_TEMPLATE)?;
        handlebars.register_template_string("digest_text", TEXT_TEMPLATE)?;
        handlebars.register_template_string("password_reset_html", PASSWORD_RESET_HTML)?;
        handlebars.register_template_string("password_reset_text", PASSWORD_RESET_TEXT)?;

        Ok(Self {
            config: Arc::new(config),
            handlebars: Arc::new(handlebars),
        })
    }

    /// Send a digest email to recipients
    pub async fn send_digest(
        &self,
        recipients: Vec<String>,
        subject: String,
        data: DigestEmailData,
    ) -> Result<SendResult, Box<dyn std::error::Error>> {
        // Render templates
        let html_body = self.handlebars.render("digest_html", &data)?;
        let text_body = self.handlebars.render("digest_text", &data)?;

        // Create SMTP transport
        let creds = Credentials::new(
            self.config.smtp_username.clone(),
            self.config.smtp_password.clone(),
        );

        let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&self.config.smtp_host)?
            .credentials(creds)
            .port(self.config.smtp_port)
            .build();

        // Send to all recipients
        let mut sent_count = 0;
        let mut errors = Vec::new();

        for recipient_email in &recipients {
            match self.send_to_recipient(
                &mailer,
                recipient_email,
                &subject,
                &html_body,
                &text_body,
            ).await {
                Ok(_) => sent_count += 1,
                Err(e) => errors.push(format!("{}: {}", recipient_email, e)),
            }
        }

        Ok(SendResult {
            sent_count,
            failed_count: errors.len(),
            errors,
        })
    }

    async fn send_to_recipient(
        &self,
        mailer: &AsyncSmtpTransport<Tokio1Executor>,
        recipient_email: &str,
        subject: &str,
        html_body: &str,
        text_body: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let from: Mailbox = format!("{} <{}>", self.config.from_name, self.config.from_email)
            .parse()?;

        let to: Mailbox = recipient_email.parse()?;

        let email = Message::builder()
            .from(from)
            .to(to)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(text_body.to_string()),
                    )
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html_body.to_string()),
                    ),
            )?;

        mailer.send(email).await?;

        Ok(())
    }

    /// Get helper for creating email data with calculated fields
    pub fn create_email_data(
        &self,
        digest_name: String,
        period_label: String,
        show_sync_summary: bool,
        total_syncs: i32,
        successful_syncs: i32,
        failed_syncs: i32,
        show_conflicts: bool,
        conflicts_detected: i32,
        conflicts_resolved: i32,
        show_health_metrics: bool,
        uptime_percentage: f64,
        data_quality_score: f64,
        show_new_employees: bool,
        new_employees: i32,
        updated_employees: i32,
        new_employee_list: Vec<EmployeeInfo>,
    ) -> DigestEmailData {
        let pending_conflicts = conflicts_detected - conflicts_resolved;

        DigestEmailData {
            digest_name,
            period_label,

            show_sync_summary,
            total_syncs,
            successful_syncs,
            failed_syncs,
            has_failed_syncs: failed_syncs > 0,

            show_conflicts,
            conflicts_detected,
            conflicts_resolved,
            pending_conflicts,
            has_pending_conflicts: pending_conflicts > 0,

            show_health_metrics,
            uptime_percentage,
            data_quality_score,
            uptime_class: Self::get_health_class(uptime_percentage),
            quality_class: Self::get_health_class(data_quality_score),
            has_health_issues: uptime_percentage < 95.0 || data_quality_score < 90.0,

            show_new_employees,
            new_employees,
            updated_employees,
            has_new_employees: !new_employee_list.is_empty(),
            new_employee_list,

            unsubscribe_url: format!("{}/settings/notifications", self.config.base_url),
            dashboard_url: format!("{}/admin/dashboard", self.config.base_url),
            current_year: chrono::Utc::now().year(),
        }
    }

    fn get_health_class(percentage: f64) -> String {
        if percentage >= 95.0 {
            "success".to_string()
        } else if percentage >= 80.0 {
            "warning".to_string()
        } else {
            "error".to_string()
        }
    }

    /// Send password reset email
    pub async fn send_password_reset(
        &self,
        recipient_email: String,
        reset_token: String,
        expires_in_minutes: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create reset URL
        let reset_url = format!("{}/auth/reset-password?token={}", self.config.base_url, reset_token);

        // Create email data
        let data = PasswordResetEmailData {
            reset_url,
            expires_in_minutes,
            current_year: chrono::Utc::now().year(),
        };

        // Render templates
        let html_body = self.handlebars.render("password_reset_html", &data)?;
        let text_body = self.handlebars.render("password_reset_text", &data)?;

        // Create SMTP transport
        let creds = Credentials::new(
            self.config.smtp_username.clone(),
            self.config.smtp_password.clone(),
        );

        let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&self.config.smtp_host)?
            .credentials(creds)
            .port(self.config.smtp_port)
            .build();

        // Send email
        self.send_to_recipient(
            &mailer,
            &recipient_email,
            "Reset Your Password - SvelteHR",
            &html_body,
            &text_body,
        ).await?;

        tracing::info!("Password reset email sent to {}", recipient_email);

        Ok(())
    }
}

/// Password reset email data
#[derive(Debug, Serialize)]
pub struct PasswordResetEmailData {
    pub reset_url: String,
    pub expires_in_minutes: i32,
    pub current_year: i32,
}

#[derive(Debug)]
pub struct SendResult {
    pub sent_count: usize,
    pub failed_count: usize,
    pub errors: Vec<String>,
}
