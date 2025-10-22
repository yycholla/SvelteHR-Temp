//! Operational Entity Builders
//!
//! Simplified builders for operational entities: events, documents, reviews, tasks, time entries
//! These create minimal but realistic operational data for testing

use chrono::{Duration, Utc};
use fake::faker::lorem::en::Sentence;
use fake::Fake;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Seed events (20-30 events with past, current, and future dates)
pub async fn seed_events(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("events");
    let target_count = context.config.get_target_count("events").min(30);

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for event creation".to_string());
        return Ok(result);
    }

    let now = Utc::now();

    for i in 0..target_count {
        let creator = &users[i % users.len()];

        // Generate event date (past 2 months to future 4 months)
        let days_offset = (rand::random::<i64>() % 180) - 60; // -60 to +120 days
        let start_time = now + Duration::days(days_offset) + Duration::hours((rand::random::<i64>() % 8) + 9); // 9 AM to 5 PM
        let end_time = start_time + Duration::hours(1 + (rand::random::<i64>() % 3)); // 1-3 hours

        let title: String = Sentence(3..6).fake();

        // Create event
        let event_id = Uuid::new_v4();
        let new_event = crate::models::event::Event::ActiveModel {
            id: Set(event_id),
            title: Set(title.clone()),
            description: Set(Some(format!("Seed data event {}", i + 1))),
            start_time: Set(start_time),
            end_time: Set(end_time),
            location: Set(Some("Conference Room A".to_string())),
            is_all_day: Set(false),
            created_by: Set(creator.id),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_event.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "event", event_id).await {
                    tracing::warn!("Failed to log audit entry for event: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to create event: {}", e));
            }
        }
    }

    tracing::info!("Created {} events", result.created_count);
    Ok(result)
}

/// Seed documents (25-40 metadata records, no actual file uploads)
pub async fn seed_documents(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("documents");
    let target_count = context.config.get_target_count("documents").min(40);

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for document creation".to_string());
        return Ok(result);
    }

    let document_types = vec!["resume", "contract", "policy", "handbook", "form"];
    let now = Utc::now();

    for i in 0..target_count {
        let owner = &users[i % users.len()];
        let doc_type = document_types[i % document_types.len()];

        // Create document metadata (no actual file)
        let doc_id = Uuid::new_v4();
        let new_doc = crate::models::documents::document::ActiveModel {
            id: Set(doc_id),
            title: Set(format!("{} Document {}", doc_type, i + 1)),
            description: Set(Some(format!("Seed data {} document", doc_type))),
            file_name: Set(format!("{}_{}.pdf", doc_type, i + 1)),
            file_path: Set(format!("/seed-data/{}/{}.pdf", doc_type, doc_id)),
            file_size: Set(1024 * (50 + rand::random::<i64>() % 950)), // 50KB to 1MB
            mime_type: Set("application/pdf".to_string()),
            uploaded_by: Set(owner.id),
            uploaded_at: Set(now - Duration::days(rand::random::<i64>() % 180)),
            is_public: Set(false),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_doc.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "document", doc_id).await {
                    tracing::warn!("Failed to log audit entry for document: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create document: {}", e));
            }
        }
    }

    tracing::info!("Created {} documents", result.created_count);
    Ok(result)
}

/// Seed tasks (40-60 tasks with mixed statuses)
pub async fn seed_tasks(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("tasks");
    let target_count = context.config.get_target_count("tasks").min(60);

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for task creation".to_string());
        return Ok(result);
    }

    let statuses = vec!["todo", "in_progress", "done", "blocked"];
    let priorities = vec!["low", "medium", "high", "urgent"];
    let now = Utc::now();

    for i in 0..target_count {
        let owner = &users[i % users.len()];
        let assignee = &users[(i + 1) % users.len()];

        let title: String = Sentence(3..8).fake();
        let status = statuses[i % statuses.len()];
        let priority = priorities[rand::random::<usize>() % priorities.len()];

        // Create task
        let task_id = Uuid::new_v4();
        let due_date = now + Duration::days((rand::random::<i64>() % 60) + 1); // 1-60 days from now

        let new_task = crate::models::task::Task::ActiveModel {
            id: Set(task_id),
            title: Set(title.clone()),
            description: Set(Some(format!("Seed data task {}", i + 1))),
            status: Set(status.to_string()),
            priority: Set(priority.to_string()),
            due_date: Set(Some(due_date)),
            created_by: Set(owner.id),
            assigned_to: Set(Some(assignee.id)),
            completed_at: Set(if status == "done" {
                Some(now - Duration::days(rand::random::<i64>() % 30))
            } else {
                None
            }),
            created_at: Set(now - Duration::days(rand::random::<i64>() % 90)),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_task.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "task", task_id).await {
                    tracing::warn!("Failed to log audit entry for task: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to create task: {}", e));
            }
        }
    }

    tracing::info!("Created {} tasks", result.created_count);
    Ok(result)
}

/// Seed time entries (100-150 entries for past 2 weeks)
pub async fn seed_time_entries(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("time_entries");
    let target_count = context.config.get_target_count("time_entries").min(150);

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for time entry creation".to_string());
        return Ok(result);
    }

    let now = Utc::now();

    for i in 0..target_count {
        let user_model = &users[i % users.len()];

        // Generate time entry date (past 14 days, only weekdays)
        let days_ago = (i / users.len()) as i64;
        let entry_date = now - Duration::days(days_ago % 14);

        // Skip weekends
        if entry_date.weekday().number_from_monday() > 5 {
            continue;
        }

        // Random work hours (6-10 hours)
        let hours = 6.0 + (rand::random::<f64>() * 4.0);

        // Create time entry
        let entry_id = Uuid::new_v4();
        let new_entry = crate::models::time::TimeEntry::ActiveModel {
            id: Set(entry_id),
            user_id: Set(user_model.id),
            date: Set(entry_date.date_naive()),
            hours: Set(hours),
            description: Set(Some(format!("Daily work log for {}", entry_date.format("%Y-%m-%d")))),
            is_billable: Set(rand::random::<bool>()),
            created_at: Set(entry_date),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_entry.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "time_entry", entry_id).await {
                    tracing::warn!("Failed to log audit entry for time entry: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create time entry: {}", e));
            }
        }
    }

    tracing::info!("Created {} time entries", result.created_count);
    Ok(result)
}
