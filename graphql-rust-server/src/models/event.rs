//! Event domain model with GraphQL integration
//!
//! Represents company events with recurring event support, capacity management, and attendee tracking.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Event model - maps to hr_public.events table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Event {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub is_all_day: bool,
    pub recurrence_rule: Option<String>, // RRULE format (RFC 5545)
    pub recurrence_end_date: Option<DateTime<Utc>>,
    pub capacity: Option<i32>,
    pub image_url: Option<String>,
    pub image_aspect_ratio: Option<String>, // "16:9" or "9:16"
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for Event
#[Object]
impl Event {
    /// Unique event identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Event title
    async fn title(&self) -> &str {
        &self.title
    }

    /// Event description (optional)
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Event location (optional)
    async fn location(&self) -> Option<&str> {
        self.location.as_deref()
    }

    /// Event start time
    async fn start_time(&self) -> DateTime<Utc> {
        self.start_time
    }

    /// Event end time
    async fn end_time(&self) -> DateTime<Utc> {
        self.end_time
    }

    /// Whether this is an all-day event
    async fn is_all_day(&self) -> bool {
        self.is_all_day
    }

    /// Recurrence rule in RRULE format (RFC 5545) for recurring events
    async fn recurrence_rule(&self) -> Option<&str> {
        self.recurrence_rule.as_deref()
    }

    /// End date for recurring events (5-year limit enforced)
    async fn recurrence_end_date(&self) -> Option<DateTime<Utc>> {
        self.recurrence_end_date
    }

    /// Maximum attendee capacity (optional, NULL means unlimited)
    async fn capacity(&self) -> Option<i32> {
        self.capacity
    }

    /// Event image URL (16:9 or 9:16 aspect ratio)
    async fn image_url(&self) -> Option<&str> {
        self.image_url.as_deref()
    }

    /// Image aspect ratio ("16:9" or "9:16")
    async fn image_aspect_ratio(&self) -> Option<&str> {
        self.image_aspect_ratio.as_deref()
    }

    /// User ID who created this event
    async fn created_by(&self) -> Uuid {
        self.created_by
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// User who created this event
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.created_by)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// All attendees for this event
    async fn attendees(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> GqlResult<Vec<super::event_attendee::EventAttendee>> {
        let pool = ctx.data::<PgPool>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let attendees = sqlx::query_as::<_, super::event_attendee::EventAttendee>(
            r#"
            SELECT id, event_id, employee_id, response_status, is_required,
                   created_at, reminder_time, scope, is_organizer
            FROM hr_public.event_attendees
            WHERE event_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(self.id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(attendees)
    }

    /// Count of attendees for this event
    async fn attendee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.event_attendees
            WHERE event_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of accepted RSVPs
    async fn accepted_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.event_attendees
            WHERE event_id = $1
              AND rsvp_status = 'accepted'
              AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Whether the event is at capacity (NULL capacity means unlimited)
    async fn is_at_capacity(&self, ctx: &Context<'_>) -> GqlResult<bool> {
        if let Some(cap) = self.capacity {
            let pool = ctx.data::<PgPool>()?;

            let count: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(*)::bigint
                FROM hr_public.event_attendees
                WHERE event_id = $1
                  AND rsvp_status = 'accepted'
                  AND deleted_at IS NULL
                "#,
            )
            .bind(self.id)
            .fetch_one(pool)
            .await?;

            Ok(count.0 >= cap as i64)
        } else {
            Ok(false) // No capacity limit means never at capacity
        }
    }

    /// Number of available spots (NULL if unlimited capacity)
    async fn available_spots(&self, ctx: &Context<'_>) -> GqlResult<Option<i32>> {
        if let Some(cap) = self.capacity {
            let pool = ctx.data::<PgPool>()?;

            let count: (i64,) = sqlx::query_as(
                r#"
                SELECT COUNT(*)::bigint
                FROM hr_public.event_attendees
                WHERE event_id = $1
                  AND rsvp_status = 'accepted'
                  AND deleted_at IS NULL
                "#,
            )
            .bind(self.id)
            .fetch_one(pool)
            .await?;

            let available = cap - count.0 as i32;
            Ok(Some(available.max(0)))
        } else {
            Ok(None) // Unlimited capacity
        }
    }

    /// Whether this is a recurring event
    async fn is_recurring(&self) -> bool {
        self.recurrence_rule.is_some()
    }
}

/// Event creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateEventInput {
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub is_all_day: bool,
    pub recurrence_rule: Option<String>,
    pub recurrence_end_date: Option<DateTime<Utc>>,
    pub capacity: Option<i32>,
    pub image_url: Option<String>,
    pub image_aspect_ratio: Option<String>,
}

/// Event update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEventInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub is_all_day: Option<bool>,
    pub recurrence_rule: Option<String>,
    pub recurrence_end_date: Option<DateTime<Utc>>,
    pub capacity: Option<i32>,
    pub image_url: Option<String>,
    pub image_aspect_ratio: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_model_compiles() {
        let event = Event {
            id: Uuid::new_v4(),
            title: "Team Meeting".to_string(),
            description: Some("Weekly sync".to_string()),
            location: Some("Conference Room A".to_string()),
            start_time: Utc::now(),
            end_time: Utc::now(),
            is_all_day: false,
            recurrence_rule: Some("FREQ=WEEKLY;BYDAY=MO".to_string()),
            recurrence_end_date: None,
            capacity: Some(10),
            image_url: None,
            image_aspect_ratio: None,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(event.title, "Team Meeting");
        assert!(event.capacity.is_some());
        assert!(event.recurrence_rule.is_some());
    }
}
