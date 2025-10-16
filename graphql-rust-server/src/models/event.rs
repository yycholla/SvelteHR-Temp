//! Event domain model with GraphQL integration
//!
//! Represents company events with recurring event support, capacity management, and attendee tracking.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Order, QueryOrder, QuerySelect, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// PostGraphile-style connection wrapper for attendees
#[derive(Debug, Clone)]
pub struct EventAttendeesConnection {
    pub nodes: Vec<super::event_attendee::Model>,
    pub total_count: i64,
}

#[Object(name = "EventAttendeesConnection")]
impl EventAttendeesConnection {
    async fn nodes(&self) -> &Vec<super::event_attendee::Model> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }
}

/// Event type - matches hr_public.event_type PostgreSQL enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
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

/// Event entity - maps to hr_public.events table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "events")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub event_type: String, // Will be converted to enum in GraphQL
    pub location: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    #[sea_orm(column_name = "all_day")]
    pub is_all_day: bool,
    pub status: String, // Will be converted to enum in GraphQL
    pub is_public: bool,
    pub color: Option<String>,
    pub organizer_id: Uuid,
    #[sea_orm(column_name = "rrule")]
    pub recurrence_rule: Option<String>, // RRULE format (RFC 5545)
    pub recurrence_id: Option<Uuid>, // Parent event for recurring series
    pub recurrence_end_date: Option<DateTime<Utc>>, // End date for recurring events (5-year limit)
    #[sea_orm(column_name = "max_capacity")]
    pub capacity: Option<i32>,
    pub image_url: Option<String>,
    pub image_aspect_ratio: Option<String>, // "16:9" or "9:16"
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::OrganizerId",
        to = "super::user::Column::Id"
    )]
    Organizer,
    #[sea_orm(has_many = "super::event_attendee::Entity")]
    Attendees,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Organizer.def()
    }
}

impl Related<super::event_attendee::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Attendees.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Event
#[Object(name = "Event")]
impl Model {
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
        match self.event_type.as_str() {
            "meeting" => EventType::Meeting,
            "training" => EventType::Training,
            "social" => EventType::Social,
            "company_event" => EventType::CompanyEvent,
            "holiday" => EventType::Holiday,
            "interview" => EventType::Interview,
            "review" => EventType::Review,
            "team_building" => EventType::TeamBuilding,
            _ => EventType::Other,
        }
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
        match self.status.as_str() {
            "draft" => EventStatus::Draft,
            "scheduled" => EventStatus::Scheduled,
            "in_progress" => EventStatus::InProgress,
            "completed" => EventStatus::Completed,
            "cancelled" => EventStatus::Cancelled,
            _ => EventStatus::Draft,
        }
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
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.organizer_id).one(&db).await?;
        Ok(user)
    }

    /// PostGraphile alias: userByOrganizerId
    async fn user_by_organizer_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.organizer_id).one(&db).await?;
        Ok(user)
    }

    /// All attendees for this event
    async fn attendees(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> GqlResult<Vec<super::event_attendee::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000) as u64;

        let attendees = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .order_by_desc(super::event_attendee::Column::CreatedAt)
            .limit(limit)
            .all(&db)
            .await?;

        Ok(attendees)
    }

    /// PostGraphile connection: eventAttendeesByEventId
    async fn event_attendees_by_event_id(
        &self,
        ctx: &Context<'_>,
        _condition: Option<super::event_attendee::EventAttendeeFilter>,
        limit: Option<i64>,
    ) -> GqlResult<EventAttendeesConnection> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000) as u64;

        // For now, ignore condition filtering - can be added back later
        let attendees = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .order_by_desc(super::event_attendee::Column::CreatedAt)
            .limit(limit)
            .all(&db)
            .await?;

        let total_count = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .count(&db)
            .await?;

        Ok(EventAttendeesConnection {
            nodes: attendees,
            total_count: total_count as i64,
        })
    }

    /// Count of attendees for this event
    async fn attendee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        let count = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .count(&db)
            .await?;
        Ok(count as i64)
    }

    /// Count of accepted RSVPs
    async fn accepted_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        let count = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .filter(super::event_attendee::Column::ResponseStatus.eq(super::event_attendee::RsvpStatus::Accepted))
            .count(&db)
            .await?;
        Ok(count as i64)
    }

    /// PostGraphile alias: currentAcceptanceCount (same as accepted_count)
    async fn current_acceptance_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        let count = super::event_attendee::Entity::find()
            .filter(super::event_attendee::Column::EventId.eq(self.id))
            .filter(super::event_attendee::Column::ResponseStatus.eq(super::event_attendee::RsvpStatus::Accepted))
            .count(&db)
            .await?;
        Ok(count as i64)
    }

    /// Whether the event is at capacity (NULL capacity means unlimited)
    async fn is_at_capacity(&self, ctx: &Context<'_>) -> GqlResult<bool> {
        if let Some(cap) = self.capacity {
            let db = get_db_from_context(ctx)?;
            let count = super::event_attendee::Entity::find()
                .filter(super::event_attendee::Column::EventId.eq(self.id))
                .filter(super::event_attendee::Column::ResponseStatus.eq(super::event_attendee::RsvpStatus::Accepted))
                .count(&db)
                .await?;
            Ok(count >= cap as u64)
        } else {
            Ok(false) // No capacity limit means never at capacity
        }
    }

    /// Number of available spots (NULL if unlimited capacity)
    async fn available_spots(&self, ctx: &Context<'_>) -> GqlResult<Option<i32>> {
        if let Some(cap) = self.capacity {
            let db = get_db_from_context(ctx)?;
            let count = super::event_attendee::Entity::find()
                .filter(super::event_attendee::Column::EventId.eq(self.id))
                .filter(super::event_attendee::Column::ResponseStatus.eq(super::event_attendee::RsvpStatus::Accepted))
                .count(&db)
                .await?;
            let available = cap - count as i32;
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
    use super::Model as Event;

    #[test]
    fn test_event_model_compiles() {
        let event = Event {
            id: Uuid::new_v4(),
            title: "Team Meeting".to_string(),
            description: Some("Weekly sync".to_string()),
            event_type: "meeting".to_string(),
            location: Some("Conference Room A".to_string()),
            start_time: Utc::now(),
            end_time: Utc::now(),
            is_all_day: false,
            status: "scheduled".to_string(),
            is_public: true,
            color: Some("#3b82f6".to_string()),
            organizer_id: Uuid::new_v4(),
            recurrence_rule: Some("FREQ=WEEKLY;BYDAY=MO".to_string()),
            recurrence_id: None,
            recurrence_end_date: None,
            capacity: Some(10),
            image_url: None,
            image_aspect_ratio: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(event.title, "Team Meeting");
        assert_eq!(event.status, "scheduled");
        assert_eq!(event.event_type, "meeting");
        assert!(event.is_public);
        assert!(event.capacity.is_some());
        assert!(event.recurrence_rule.is_some());
    }
}
