-- Create event_attendees table for RSVP tracking
CREATE TABLE IF NOT EXISTS hr_public.event_attendees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    response_status character varying(20) DEFAULT 'pending' NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT event_attendees_pkey PRIMARY KEY (id),
    CONSTRAINT event_attendees_unique UNIQUE (event_id, employee_id),
    CONSTRAINT fk_event_attendees_event FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_attendees_employee FOREIGN KEY (employee_id) REFERENCES hr_public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON hr_public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_employee_id ON hr_public.event_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_response_status ON hr_public.event_attendees(response_status);

COMMENT ON TABLE hr_public.event_attendees IS 'Event RSVP and attendance tracking';
