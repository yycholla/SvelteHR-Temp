# Feature 18: Smart Data Cleaning

## Overview

AI-powered data cleaning that automatically detects and fixes common data quality issues like duplicates, formatting inconsistencies, and missing information.

## Current System Integration

- Manual data cleaning required
- Basic validation exists
- No automated cleanup
- Duplicates must be found manually

## Key Components

- Duplicate detection and merging
- Format standardization (names, phones, addresses)
- Missing data prediction/inference
- Outlier detection
- Data enrichment from external sources
- ML-based data quality scoring
- Automated cleanup workflows

## Technical Requirements

### AI/ML Components

```rust
pub struct DataCleaningService {
    // Detect duplicates using fuzzy matching
    pub async fn find_duplicates(&self, entity_type: EntityType)
        -> Result<Vec<DuplicateGroup>> {
        // Use Levenshtein distance, phonetic matching
        // Consider multiple fields (name, email, phone)
        // Group similar records
    }

    // Auto-fix common issues
    pub async fn clean_entity(&self, entity_id: Uuid)
        -> Result<CleaningReport> {
        // Trim whitespace
        // Standardize formatting
        // Fix case issues
        // Parse structured data
    }

    // Predict missing data
    pub async fn enrich_data(&self, entity: &Employee)
        -> Result<EnrichmentSuggestions> {
        // ML model predicts department from title
        // Infer pay grade from role
        // Suggest standard job titles
    }
}
```

### Database Schema

```sql
CREATE TABLE hr_public.data_quality_issues (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    issue_type VARCHAR(50), -- DUPLICATE, FORMAT, MISSING, OUTLIER
    field_name VARCHAR(100),
    current_value TEXT,
    suggested_fix TEXT,
    confidence_score DECIMAL(3,2),
    status VARCHAR(20), -- DETECTED, AUTO_FIXED, MANUALLY_FIXED, IGNORED
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE hr_public.duplicate_candidates (
    id UUID PRIMARY KEY,
    entity1_id UUID,
    entity2_id UUID,
    similarity_score DECIMAL(3,2),
    matching_fields JSONB,
    suggested_action VARCHAR(50), -- MERGE, KEEP_BOTH, REVIEW
    status VARCHAR(20)
);
```

### Cleaning Rules

**Name Standardization:**

- "john smith" → "John Smith"
- "JANE DOE" → "Jane Doe"
- "o'brien" → "O'Brien"
- "mcDonald" → "McDonald"

**Phone Formatting:**

- "5551234567" → "(555) 123-4567"
- "555.123.4567" → "(555) 123-4567"
- "+1 555 123 4567" → "(555) 123-4567"

**Email Correction:**

- "john@gmial.com" → "john@gmail.com" (common typos)
- "user@exampel.com" → suggest correction

**Address Standardization:**

- Use USPS API for standardization
- "123 Main St" → "123 Main Street"
- Fix zip code formats

## Dependencies

- Fuzzy matching library (fuzzywuzzy, strsim)
- NLP library for name parsing
- USPS address validation API
- ML model for data prediction (optional)
- External data enrichment APIs

## Implementation Phases

### Phase 1: Basic Cleaning

- Whitespace trimming
- Case standardization
- Format fixes (phone, email)

### Phase 2: Duplicate Detection

- Fuzzy name matching
- Multi-field comparison
- Duplicate merge workflow

### Phase 3: Data Enrichment

- Missing field prediction
- External data sources
- Confidence scoring

### Phase 4: ML-Powered

- Train model on historical data
- Automated anomaly detection
- Continuous learning

## Research Notes

- [ ] Best fuzzy matching algorithms
- [ ] ML models for missing data prediction
- [ ] External data sources (Clearbit, FullContact)
- [ ] Duplicate merge strategies (which record to keep?)
- [ ] Auto-fix safety thresholds

## Duplicate Detection Algorithm

```python
def calculate_similarity(record1, record2):
    score = 0

    # Name similarity (40% weight)
    name_score = fuzzy_match(record1.name, record2.name)
    score += name_score * 0.4

    # Email similarity (30% weight)
    if record1.email and record2.email:
        email_score = exact_match(record1.email, record2.email)
        score += email_score * 0.3

    # Phone similarity (20% weight)
    if record1.phone and record2.phone:
        phone_score = normalize_and_compare(record1.phone, record2.phone)
        score += phone_score * 0.2

    # Employee number (10% weight)
    if record1.emp_number and record2.emp_number:
        emp_score = exact_match(record1.emp_number, record2.emp_number)
        score += emp_score * 0.1

    return score

# Threshold: > 0.85 = likely duplicate
```

## Success Metrics

- Data quality score improvement: +20%
- Duplicate detection accuracy: > 95%
- Auto-fix accuracy: > 98%
- Time saved on manual cleaning: 10+ hours/month

## Notes

_Research findings and implementation decisions_
