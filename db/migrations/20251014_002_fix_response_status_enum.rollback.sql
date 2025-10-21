-- Rollback: Revert event_attendees.response_status to VARCHAR(20)

ALTER TABLE hr_public.event_attendees
ALTER COLUMN response_status TYPE character varying(20)
USING response_status::text;
