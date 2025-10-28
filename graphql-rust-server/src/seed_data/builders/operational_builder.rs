//! Operational Entity Builders
//!
//! Simplified builders for operational entities: events, documents, reviews, tasks, time entries
//! These create minimal but realistic operational data for testing

use chrono::{DateTime, Duration, Utc};
use fake::faker::lorem::en::Sentence;
use fake::Fake;
use rust_decimal::Decimal;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::config::EntityType;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Seed events (20-30 events with past, current, and future dates)
pub async fn seed_events(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("events");
    let target_count = context.config.get_target_count(EntityType::Events).min(30);

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

        // Generate event date with predictable distribution around current date
        // Creates events: 1 month back to 2 months forward (90 day window centered on today)
        let days_offset = ((i as i64) * 180 / (target_count as i64)) - 30; // Evenly distributed -30 to +150 days

        // Add some randomization to avoid all events being at exact intervals
        let random_adjustment = (rand::random::<i64>() % 5) - 2; // -2 to +2 days variance
        let final_offset = days_offset + random_adjustment;

        let start_time = now + Duration::days(final_offset) + Duration::hours((i as i64 % 8) + 9); // 9 AM to 5 PM
        let end_time = start_time + Duration::hours(1 + (i as i64 % 3)); // 1-3 hours

        let title: String = Sentence(3..6).fake();

        // Event types and statuses
        let event_types = vec!["meeting", "training", "social", "company_event", "team_building"];
        let event_type = event_types[i % event_types.len()];
        let status = if final_offset < -7 {
            "completed"
        } else if final_offset < 0 {
            "in_progress"
        } else {
            "scheduled"
        };

        // Create event
        let event_id = Uuid::new_v4();
        let new_event = crate::models::event::ActiveModel {
            id: Set(event_id),
            title: Set(title.clone()),
            description: Set(Some(format!("Seed data event {}", i + 1))),
            event_type: Set(event_type.to_string()),
            location: Set(Some("Conference Room A".to_string())),
            start_time: Set(start_time),
            end_time: Set(end_time),
            is_all_day: Set(false),
            status: Set(status.to_string()),
            is_public: Set(rand::random::<bool>()),
            color: Set(Some("#3b82f6".to_string())),
            organizer_id: Set(creator.id),
            recurrence_rule: Set(None),
            recurrence_id: Set(None),
            recurrence_end_date: Set(None),
            capacity: Set(Some(10 + (rand::random::<i32>() % 41))), // 10-50 capacity
            image_url: Set(None),
            image_aspect_ratio: Set(None),
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
    let target_count = context.config.get_target_count(EntityType::Documents).min(40);

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
            category_id: Set(None),
            uploader_id: Set(owner.id),
            file_path: Set(format!("/seed-data/{}/{}.pdf", doc_type, doc_id)),
            file_size: Set(1024 * (50 + rand::random::<i64>() % 950)), // 50KB to 1MB
            mime_type: Set("application/pdf".to_string()),
            access_level: Set("private".to_string()),
            is_encrypted: Set(false),
            expiry_date: Set(None),
            version_number: Set(1),
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
    let target_count = context.config.get_target_count(EntityType::Tasks).min(60);

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

    // Get all active departments for department-assigned tasks
    let departments = crate::models::department::Entity::find()
        .filter(crate::models::department::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    let statuses = vec!["todo", "in_progress", "done", "blocked"];
    let priorities = vec!["low", "medium", "high", "urgent"];
    let now = Utc::now();

    for i in 0..target_count {
        let owner = &users[i % users.len()];

        // Alternate between department-assigned and user-assigned tasks
        let is_department_task = !departments.is_empty() && i % 2 == 0;

        let title: String = if is_department_task {
            format!("{} (Department)", Sentence(3..8).fake::<String>())
        } else {
            Sentence(3..8).fake()
        };
        let status = statuses[i % statuses.len()];
        let priority = priorities[rand::random::<usize>() % priorities.len()];

        // Create task with exclusive assignment (either user OR department)
        let task_id = Uuid::new_v4();
        let due_date = now + Duration::days((rand::random::<i64>() % 60) + 1); // 1-60 days from now

        let new_task = crate::models::task::ActiveModel {
            id: Set(task_id),
            title: Set(title.clone()),
            description: Set(Some(if is_department_task {
                format!("Department-level task {} - requires team coordination", i + 1)
            } else {
                format!("Individual task {}", i + 1)
            })),
            task_type_id: Set(None),
            status: Set(status.to_string()),
            priority: Set(priority.to_string()),
            due_date: Set(Some(due_date)),
            completed_at: Set(if status == "done" {
                Some(now - Duration::days(rand::random::<i64>() % 30))
            } else {
                None
            }),
            estimated_hours: Set(Some(4 + (rand::random::<i32>() % 12))), // 4-16 hours
            actual_hours: Set(None),
            tags: Set(None),
            // Exclusive assignment: either department OR user, never both
            department_id: Set(if is_department_task {
                Some(departments[i % departments.len()].id)
            } else {
                None
            }),
            created_by: Set(owner.id),
            assignee_id: Set(if is_department_task {
                None
            } else {
                Some(users[(i + 1) % users.len()].id)
            }),
            parent_task_id: Set(None),
            requires_manual_reassignment: Set(Some(false)),
            archived: Set(false),
            archived_at: Set(None),
            archived_by: Set(None),
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

/// Seed attendance records (100-150 entries for past 2 weeks)
pub async fn seed_time_entries(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("attendance_records");
    let target_count = context.config.get_target_count(EntityType::TimeEntries).min(150);

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for attendance record creation".to_string());
        return Ok(result);
    }

    let now = Utc::now();

    for i in 0..target_count {
        let user_model = &users[i % users.len()];

        // Generate attendance date (past 14 days, only weekdays)
        let days_ago = (i / users.len()) as i64;
        let entry_datetime = now - Duration::days(days_ago % 14);
        let entry_date = entry_datetime.date_naive();

        // Skip weekends
        use chrono::Datelike;
        if entry_date.weekday().num_days_from_monday() > 4 {
            continue;
        }

        // Check if attendance record already exists for this user and date (idempotency)
        let existing = crate::models::time::attendance_record::Entity::find()
            .filter(crate::models::time::attendance_record::Column::UserId.eq(user_model.id))
            .filter(crate::models::time::attendance_record::Column::Date.eq(entry_date))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            continue;
        }

        // Random work hours (6-10 hours)
        let hours = 6.0 + (rand::random::<f64>() * 4.0);

        // Generate clock in/out times
        let clock_in = entry_datetime
            .date_naive()
            .and_hms_opt(9, 0, 0)
            .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc));
        let clock_out = clock_in.map(|ci| ci + Duration::hours(hours as i64));

        // Create attendance record
        let entry_id = Uuid::new_v4();
        let new_entry = crate::models::time::attendance_record::ActiveModel {
            id: Set(entry_id),
            user_id: Set(user_model.id),
            date: Set(entry_date),
            clock_in: Set(clock_in),
            clock_out: Set(clock_out),
            hours_worked: Set(Decimal::from_f64_retain(hours)),
            status: Set("present".to_string()),
            notes: Set(Some(format!(
                "Seed data attendance for {}",
                entry_date.format("%Y-%m-%d")
            ))),
            created_at: Set(entry_datetime),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_entry.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "attendance_record", entry_id).await
                {
                    tracing::warn!("Failed to log audit entry for attendance record: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                let error_msg = format!("Failed to create attendance record: {}", e);
                result.errors.push(error_msg.clone());
                tracing::error!("{}", error_msg);
            }
        }
    }

    tracing::info!("Created {} attendance records", result.created_count);
    Ok(result)
}
