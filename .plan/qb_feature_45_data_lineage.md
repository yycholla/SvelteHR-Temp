# Feature 45: Data Lineage Tracking

## Overview
Complete provenance tracking showing the full history and origin of every data field, answering "where did this value come from?" and "who changed it when?"

## Current System Integration
- Basic sync logging exists
- No field-level provenance
- Can't trace data origins
- No change attribution

## Key Components
- Field-level change tracking
- Source attribution (local, QB, API)
- Change timeline per field
- Data flow visualization
- Cross-system lineage
- Transformation tracking
- Compliance-ready provenance

## Technical Requirements
### Lineage Tracking System
```rust
pub struct DataLineageService {
    db: DatabaseConnection,
}

pub struct FieldLineage {
    pub entity_id: String,
    pub field_name: String,
    pub current_value: String,
    pub lineage_chain: Vec<LineageEvent>,
}

pub struct LineageEvent {
    pub event_id: Uuid,
    pub occurred_at: DateTime<Utc>,
    pub event_type: LineageEventType,
    pub source: DataSource,
    pub user_id: Option<Uuid>,
    pub previous_value: Option<String>,
    pub new_value: String,
    pub transformation: Option<String>,
    pub metadata: serde_json::Value,
}

pub enum DataSource {
    QuickBooks,
    LocalInput,
    APIImport,
    BulkUpload,
    SystemGenerated,
    Integration(String), // e.g., "ADP", "BambooHR"
}

pub enum LineageEventType {
    Created,
    Updated,
    Synced,
    Imported,
    Transformed,
    Merged,
}

impl DataLineageService {
    // Track every field change
    pub async fn record_change(&self, change: FieldChange) 
        -> Result<()> {
        let event = LineageEvent {
            event_id: Uuid::new_v4(),
            occurred_at: Utc::now(),
            event_type: change.event_type,
            source: change.source,
            user_id: change.user_id,
            previous_value: change.old_value,
            new_value: change.new_value,
            transformation: change.transformation,
            metadata: change.metadata,
        };
        
        // Store in lineage table
        self.insert_lineage_event(event).await?;
        
        Ok(())
    }
    
    // Get complete history of a field
    pub async fn get_field_lineage(&self, entity_id: &str, field: &str) 
        -> Result<FieldLineage> {
        let events = field_lineage::Entity::find()
            .filter(field_lineage::Column::EntityId.eq(entity_id))
            .filter(field_lineage::Column::FieldName.eq(field))
            .order_by_asc(field_lineage::Column::OccurredAt)
            .all(&self.db)
            .await?;
        
        Ok(FieldLineage {
            entity_id: entity_id.to_string(),
            field_name: field.to_string(),
            current_value: events.last().map(|e| e.new_value.clone()).unwrap_or_default(),
            lineage_chain: events.into_iter().map(Into::into).collect(),
        })
    }
    
    // Visualize data flow
    pub async fn generate_lineage_graph(&self, entity_id: &str) 
        -> Result<LineageGraph> {
        // Create visual graph showing data flow
        // Nodes: Sources, transformations, destinations
        // Edges: Data movements
    }
}
```

### Database Schema
```sql
CREATE TABLE hr_public.field_lineage (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    field_name VARCHAR(100),
    occurred_at TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50),
    source VARCHAR(100),
    user_id UUID REFERENCES hr_public.users(id),
    previous_value TEXT,
    new_value TEXT,
    transformation TEXT,
    metadata JSONB,
    sync_session_id UUID
);

CREATE INDEX idx_lineage_entity ON hr_public.field_lineage(entity_type, entity_id, field_name, occurred_at);
CREATE INDEX idx_lineage_occurred ON hr_public.field_lineage(occurred_at DESC);

-- Materialized view for current field sources
CREATE MATERIALIZED VIEW field_current_sources AS
SELECT DISTINCT ON (entity_id, field_name)
    entity_id,
    field_name,
    source,
    occurred_at,
    user_id
FROM hr_public.field_lineage
ORDER BY entity_id, field_name, occurred_at DESC;
```

### Lineage Visualization
```typescript
interface LineageNode {
  id: string;
  label: string;
  type: 'source' | 'transformation' | 'field';
  timestamp: Date;
  metadata: Record<string, any>;
}

interface LineageEdge {
  from: string;
  to: string;
  label: string;
  value?: string;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

// Example graph for email field:
// [QuickBooks] --"john@example.com"--> [Email Field]
//                                           |
//                                    [Auto-correction]
//                                           |
//                                   [Email Field] --"john.smith@company.com"-->
```

## Dependencies
- Graph visualization library (D3.js, Cytoscape.js)
- Efficient time-series queries
- Large storage for lineage data
- Data retention policies

## Implementation Phases
### Phase 1: Basic Tracking
- Track field changes
- Store source attribution
- Simple history view

### Phase 2: Visualization
- Timeline view per field
- Source breakdown
- Change attribution

### Phase 3: Advanced
- Cross-system lineage
- Graph visualization
- Transformation tracking
- Compliance reports

## Research Notes
- [ ] Storage requirements (10x audit log size?)
- [ ] Query performance at scale
- [ ] Data retention policy
- [ ] Compliance requirements (GDPR, SOX)
- [ ] Visualization best practices

## UI Components
```svelte
<!-- Field lineage viewer -->
<div class="lineage-viewer">
  <h3>Email Field History</h3>
  
  <div class="timeline">
    {#each lineage.lineageChain as event}
      <div class="event">
        <div class="timestamp">{formatDate(event.occurredAt)}</div>
        <div class="change">
          <Badge variant={getSourceColor(event.source)}>
            {event.source}
          </Badge>
          {#if event.previousValue}
            <span class="old-value">{event.previousValue}</span>
            <Arrow />
          {/if}
          <span class="new-value">{event.newValue}</span>
        </div>
        {#if event.userId}
          <div class="user">by {getUserName(event.userId)}</div>
        {/if}
      </div>
    {/each}
  </div>
  
  <Button onclick={viewGraph}>View Data Flow Graph</Button>
</div>
```

## Success Metrics
- Lineage completeness: 100%
- Query performance: < 1 second
- User understanding: > 90% find value
- Compliance audit pass rate: 100%

## Notes
_Research findings and implementation decisions_
