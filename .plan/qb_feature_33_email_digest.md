# Feature 33: Email Digest System

## Overview
Automated email summaries of sync activity, conflicts, and system health delivered on a customizable schedule (daily, weekly, monthly).

## Current System Integration
- No email notification system
- Users must log in to check status
- No proactive communication

## Key Components
- Customizable email templates
- Digest scheduling (daily, weekly, custom)
- Recipient management
- Content customization (what to include)
- HTML email with charts/graphs
- Plain text fallback
- Unsubscribe management

## Technical Requirements
### Email Service
```rust
pub struct DigestService {
    mailer: Mailer,
    db: DatabaseConnection,
}

pub struct DigestContent {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_syncs: i32,
    pub successful_syncs: i32,
    pub failed_syncs: i32,
    pub conflicts_detected: i32,
    pub conflicts_resolved: i32,
    pub new_employees: Vec<String>,
    pub updated_employees: Vec<String>,
    pub data_quality_score: f64,
}

impl DigestService {
    pub async fn generate_digest(&self, period: Period) 
        -> Result<DigestContent> {
        // Query sync logs
        // Aggregate statistics
        // Format content
    }
    
    pub async fn send_digest(&self, recipients: Vec<String>, content: DigestContent)
        -> Result<()> {
        // Render HTML template
        // Send emails
        // Track delivery
    }
}
```

### Database Schema
```sql
CREATE TABLE hr_public.email_digests (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    schedule_cron VARCHAR(100),
    recipients TEXT[],
    include_sync_summary BOOLEAN DEFAULT true,
    include_conflicts BOOLEAN DEFAULT true,
    include_health_metrics BOOLEAN DEFAULT true,
    include_new_employees BOOLEAN DEFAULT false,
    template_id UUID,
    enabled BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    next_send_at TIMESTAMPTZ
);

CREATE TABLE hr_public.email_digest_log (
    id UUID PRIMARY KEY,
    digest_id UUID REFERENCES hr_public.email_digests(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    recipients TEXT[],
    success BOOLEAN,
    error_message TEXT
);
```

### Email Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>QuickBooks Sync Digest</title>
</head>
<body>
    <h1>📊 Weekly Sync Summary</h1>
    <p>December 22 - December 29, 2025</p>
    
    <div class="stats">
        <div class="stat-card">
            <h3>25</h3>
            <p>Total Syncs</p>
        </div>
        <div class="stat-card success">
            <h3>23</h3>
            <p>Successful</p>
        </div>
        <div class="stat-card warning">
            <h3>2</h3>
            <p>Conflicts</p>
        </div>
    </div>
    
    <h2>Activity Highlights</h2>
    <ul>
        <li>✅ 170 employees synced successfully</li>
        <li>✅ 15 employee records updated</li>
        <li>⚠️ 2 conflicts require attention</li>
        <li>📈 Data quality score: 97%</li>
    </ul>
    
    <a href="https://app.example.com/integrations/conflicts">
        View Conflicts →
    </a>
</body>
</html>
```

## Dependencies
- Email service (SendGrid, AWS SES, Mailgun)
- HTML email template engine
- Cron scheduler
- Chart generation library (for graphs)

## Research Notes
- [ ] Optimal digest frequency (daily too much?)
- [ ] Email deliverability best practices
- [ ] Unsubscribe compliance (CAN-SPAM)
- [ ] Personalization options
- [ ] A/B testing email content

## Success Metrics
- Email open rate > 40%
- Click-through rate > 15%
- Unsubscribe rate < 2%
- User satisfaction score > 8/10

## Notes
_Research findings and implementation decisions_
