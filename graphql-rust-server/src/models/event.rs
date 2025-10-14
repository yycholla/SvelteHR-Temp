//! Event domain model with GraphQL integration
//!
//! Represents company events with recurring event support, capacity management, and attendee tracking.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult, SimpleObject};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// PostGraphile-style connection wrapper for attendees
#[derive(Debug, Clone)]
pub struct EventAttendeesConnection {
    pub nodes: Vec<super::event_attendee::EventAttendee>,
    pub total_count: i64,
}

#[Object]
impl EventAttendeesConnection {
    async fn nodes(&self) -> &Vec<super::event_attendee::EventAttendee> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }
}

/// Event type - matches hr_public.event_type PostgreSQL enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "hr_public.event_type", rename_all = "snake_case")]
pub enum EventType {
    Meeting,
    Training,
    Social,
    CompanyEvent,
    Holiday,
    Interview,
    Review,
    TeamBuilding,
    Other,
}

/// Event status - matches hr_public.event_status PostgreSQL enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "hr_public.event_status", rename_all = "snake_case")]
pub enum EventStatus {
    /// Event is being drafted, not yet published
    Draft,
    /// Event is scheduled and published
    Scheduled,
    /// Event is currently in progress
    InProgress,
    /// Event has been completed
    Completed,
    /// Event has been cancelled
    Cancelled,
}

/// Event ordering options for queries - compatible with PostGraphile convention
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum EventsOrderBy {
    /// Order by start time ascending (earliest first)
    #[graphql(name = "START_TIME_ASC")]
    StartTimeAsc,
    /// Order by start time descending (latest first)
    #[graphql(name = "START_TIME_DESC")]
    StartTimeDesc,
    /// Order by title ascending (A-Z)
    #[graphql(name = "TITLE_ASC")]
    TitleAsc,
    /// Order by title descending (Z-A)
    #[graphql(name = "TITLE_DESC")]
    TitleDesc,
    /// Order by created date ascending (oldest first)
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    /// Order by created date descending (newest first)
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
}

impl EventsOrderBy {
    /// Convert to SQL ORDER BY clause
    pub fn to_sql(&self) -> &'static str {
        match self {
            EventsOrderBy::StartTimeAsc => "start_time ASC",
            EventsOrderBy::StartTimeDesc => "start_time DESC",
            EventsOrderBy::TitleAsc => "title ASC",
            EventsOrderBy::TitleDesc => "title DESC",
            EventsOrderBy::CreatedAtAsc => "created_at ASC",
            EventsOrderBy::CreatedAtDesc => "created_at DESC",
        }
    }
}

/// Event model - maps to hr_public.events table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Event {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub event_type: EventType,
    pub location: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    #[sqlx(rename = "all_day")]
    pub is_all_day: bool,
    pub status: EventStatus,
    pub is_public: bool,
    pub color: Option<String>,
    pub organizer_id: Uuid,
    #[sqlx(rename = "rrule")]
    pub recurrence_rule: Option<String>, // RRULE format (RFC 5545)
    pub recurrence_id: Option<Uuid>, // Parent event for recurring series
    pub recurrence_end_date: Option<DateTime<Utc>>, // End date for recurring events (5-year limit)
    #[sqlx(rename = "max_capacity")]
    pub capacity: Option<i32>,
    pub image_url: Option<String>,
    pub image_aspect_ratio: Option<String>, // "16:9" or "9:16"
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

    /// PostGraphile global node ID (Relay pattern)
    async fn node_id(&self) -> String {
        // Base64 encode "Event:uuid" for Relay global ID
        use base64::{Engine as _, engine::general_purpose};
        let raw_id = format!("Event:{}", self.id);
        general_purpose::STANDARD.encode(raw_id.as_bytes())
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

    /// Event type (meeting, training, social, etc.)
    async fn event_type(&self) -> EventType {
        self.event_type
    }

    /// Whether this is an all-day event
    async fn is_all_day(&self) -> bool {
        self.is_all_day
    }

    /// PostGraphile alias: allDay
    async fn all_day(&self) -> bool {
        self.is_all_day
    }

    /// Event status (draft, scheduled, in_progress, completed, cancelled)
    async fn status(&self) -> EventStatus {
        self.status
    }

    /// Whether the event is publicly visible
    async fn is_public(&self) -> bool {
        self.is_public
    }

    /// Event color (hex code)
    async fn color(&self) -> Option<&str> {
        self.color.as_deref()
    }

    /// Organizer user ID
    async fn organizer_id(&self) -> Uuid {
        self.organizer_id
    }

    /// PostGraphile alias: createdBy (for internal compatibility)
    async fn created_by(&self) -> Uuid {
        self.organizer_id
    }

    /// Recurrence rule in RRULE format (RFC 5545) for recurring events
    async fn recurrence_rule(&self) -> Option<&str> {
        self.recurrence_rule.as_deref()
    }

    /// PostGraphile alias: recurrencePattern (same as recurrence_rule)
    async fn recurrence_pattern(&self) -> Option<&str> {
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
        .bind(self.organizer_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// PostGraphile alias: userByOrganizerId
    async fn user_by_organizer_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
        .bind(self.organizer_id)
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

    /// PostGraphile connection: eventAttendeesByEventId
    async fn event_attendees_by_event_id(
        &self,
        ctx: &Context<'_>,
        condition: Option<super::event_attendee::EventAttendeeFilter>,
        limit: Option<i64>,
    ) -> GqlResult<EventAttendeesConnection> {
        let pool = ctx.data::<PgPool>()?;
        let limit = limit.unwrap_or(100).min(1000);

        // Build base query
        let mut query_builder = sqlx::QueryBuilder::new(
            "SELECT id, event_id, employee_id, response_status, is_required, \
             created_at, reminder_time, scope, is_organizer \
             FROM hr_public.event_attendees WHERE event_id = "
        );
        query_builder.push_bind(self.id);

        // Apply condition filters if provided
        if let Some(filter) = &condition {
            if filter.has_filters() {
                query_builder.push(" AND ");
                filter.apply_to_query(&mut query_builder);
            }
        }

        query_builder.push(" ORDER BY created_at DESC LIMIT ");
        query_builder.push_bind(limit);

        let attendees = query_builder
            .build_query_as::<super::event_attendee::EventAttendee>()
            .fetch_all(pool)
            .await?;

        // Get total count with same filters
        let mut count_builder = sqlx::QueryBuilder::new(
            "SELECT COUNT(*)::bigint FROM hr_public.event_attendees WHERE event_id = "
        );
        count_builder.push_bind(self.id);

        if let Some(filter) = &condition {
            if filter.has_filters() {
                count_builder.push(" AND ");
                filter.apply_to_query(&mut count_builder);
            }
        }

        let total_count: (i64,) = count_builder
            .build_query_as()
            .fetch_one(pool)
            .await?;

        Ok(EventAttendeesConnection {
            nodes: attendees,
            total_count: total_count.0,
        })
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

    /// PostGraphile alias: currentAcceptanceCount (same as accepted_count)
    async fn current_acceptance_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
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

/// Event filter condition for PostGraphile-style querying
#[derive(Debug, Clone, Default, InputObject)]
pub struct EventCondition {
    pub id: Option<Uuid>,
    pub title: Option<String>,
    pub status: Option<EventStatus>,
    pub created_by: Option<Uuid>,
    pub is_public: Option<bool>,
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
            event_type: EventType::Meeting,
            location: Some("Conference Room A".to_string()),
            start_time: Utc::now(),
            end_time: Utc::now(),
            is_all_day: false,
            status: EventStatus::Scheduled,
            is_public: true,
            color: Some("#3b82f6".to_string()),
            organizer_id: Uuid::new_v4(),
            recurrence_rule: Some("FREQ=WEEKLY;BYDAY=MO".to_string()),
            recurrence_end_date: None,
            capacity: Some(10),
            image_url: None,
            image_aspect_ratio: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(event.title, "Team Meeting");
        assert_eq!(event.status, EventStatus::Scheduled);
        assert_eq!(event.event_type, EventType::Meeting);
        assert!(event.is_public);
        assert!(event.capacity.is_some());
        assert!(event.recurrence_rule.is_some());
    }
}
