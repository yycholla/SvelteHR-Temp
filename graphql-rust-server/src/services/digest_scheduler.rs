//! Email Digest Scheduler
//!
//! Background service that automatically sends email digests based on their schedules

use crate::services::digest_service::DigestService;
use crate::services::email_service::EmailService;
use anyhow::Result;
use chrono::{Duration, Utc};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio_cron_scheduler::{Job, JobScheduler};

pub struct DigestScheduler {
    scheduler: JobScheduler,
}

impl DigestScheduler {
    /// Create a new digest scheduler
    pub async fn new(
        db: Arc<DatabaseConnection>,
        email_service: Option<Arc<EmailService>>,
    ) -> Result<Self> {
        let scheduler = JobScheduler::new().await?;

        // Create digest service with email capabilities
        let digest_service = if let Some(email_svc) = email_service {
            DigestService::with_email_service(db.clone(), email_svc)
        } else {
            DigestService::new(db.clone())
        };

        let service_arc = Arc::new(digest_service);

        // Add a job that runs every minute to check for pending digests
        let service_clone = service_arc.clone();
        let job = Job::new_async("0 * * * * *", move |_uuid, _l| {
            let service = service_clone.clone();
            Box::pin(async move {
                if let Err(e) = Self::check_and_send_digests(&service).await {
                    tracing::error!("Failed to check and send digests: {}", e);
                }
            })
        })?;

        scheduler.add(job).await?;

        Ok(Self { scheduler })
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<()> {
        self.scheduler.start().await?;
        tracing::info!("Email digest scheduler started");
        Ok(())
    }

    /// Stop the scheduler
    pub async fn shutdown(&mut self) -> Result<()> {
        self.scheduler.shutdown().await?;
        tracing::info!("Email digest scheduler stopped");
        Ok(())
    }

    /// Check for pending digests and send them
    async fn check_and_send_digests(
        service: &DigestService,
    ) -> Result<()> {
        let pending_digests = service.get_pending_digests().await?;

        if pending_digests.is_empty() {
            return Ok(());
        }

        tracing::info!(
            "Found {} pending digest(s) to send",
            pending_digests.len()
        );

        for digest in pending_digests {
            tracing::info!(
                "Sending digest '{}' (ID: {}) to {} recipients",
                digest.name,
                digest.id,
                digest.recipients.len()
            );

            // Calculate time period for the digest
            let period_end = Utc::now();
            let period_start = match digest.schedule_cron.as_str() {
                "0 9 * * *" => period_end - Duration::days(1),      // Daily: last 24 hours
                "0 9 * * 1" => period_end - Duration::days(7),      // Weekly: last 7 days
                "0 9 1 * *" => period_end - Duration::days(30),     // Monthly: last 30 days
                _ => period_end - Duration::days(7),                // Default: last 7 days
            };

            // Generate digest content
            match service.generate_digest_content(
                period_start,
                period_end,
                digest.include_sync_summary,
                digest.include_conflicts,
                digest.include_health_metrics,
                digest.include_new_employees,
            ).await {
                Ok(content) => {
                    // Send the digest
                    match service.send_digest(
                        digest.id,
                        digest.name.clone(),
                        digest.recipients.clone(),
                        content,
                        digest.include_sync_summary,
                        digest.include_conflicts,
                        digest.include_health_metrics,
                        digest.include_new_employees,
                    ).await {
                        Ok(result) => {
                            if result.success {
                                tracing::info!(
                                    "Successfully sent digest '{}' to {} recipients",
                                    digest.name,
                                    result.recipients_count
                                );

                                // Update next_send_at for this digest
                                if let Some(next_send) = service.calculate_next_send_time(&digest.schedule_cron, Utc::now()) {
                                    // Update the digest's next_send_at in the database
                                    // This is handled by the send_digest method
                                    tracing::debug!(
                                        "Next send time for '{}': {}",
                                        digest.name,
                                        next_send
                                    );
                                }
                            } else {
                                tracing::error!(
                                    "Failed to send digest '{}': {}",
                                    digest.name,
                                    result.error_message.unwrap_or_else(|| "Unknown error".to_string())
                                );
                            }
                        }
                        Err(e) => {
                            tracing::error!(
                                "Error sending digest '{}': {}",
                                digest.name,
                                e
                            );
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "Error generating content for digest '{}': {}",
                        digest.name,
                        e
                    );
                }
            }
        }

        Ok(())
    }
}
