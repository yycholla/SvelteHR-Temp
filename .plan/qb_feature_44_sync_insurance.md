# Feature 44: Sync Insurance / Backup

## Overview
Automated backup system that creates point-in-time snapshots before every sync operation, enabling instant rollback and "sync with confidence" guarantee.

## Current System Integration
- No automatic backups
- Manual rollback only
- No snapshot capability
- Risky sync operations

## Key Components
- Pre-sync snapshot creation
- Point-in-time recovery
- Differential backups
- Compression and storage optimization
- Retention policies
- One-click rollback
- Backup verification
- Disaster recovery

## Technical Requirements
### Backup Service
```rust
pub struct SyncBackupService {
    db: DatabaseConnection,
    storage: BackupStorage,
}

pub struct Snapshot {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub entity_type: EntityType,
    pub snapshot_type: SnapshotType,
    pub records_count: i32,
    pub compressed_size_bytes: i64,
    pub storage_path: String,
    pub checksum: String,
}

pub enum SnapshotType {
    Full,        // Complete copy
    Differential, // Only changes since last full
    Incremental, // Only changes since last backup
}

impl SyncBackupService {
    // Create snapshot before sync
    pub async fn create_snapshot(&self, entity_type: EntityType) 
        -> Result<Snapshot> {
        // 1. Query all entities
        let entities = self.fetch_all_entities(entity_type).await?;
        
        // 2. Serialize to JSON
        let data = serde_json::to_vec(&entities)?;
        
        // 3. Compress
        let compressed = self.compress_data(&data)?;
        
        // 4. Calculate checksum
        let checksum = self.calculate_checksum(&compressed);
        
        // 5. Store (S3, local filesystem, etc.)
        let path = self.storage.save(compressed, entity_type).await?;
        
        // 6. Record snapshot metadata
        let snapshot = Snapshot {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            entity_type,
            snapshot_type: SnapshotType::Full,
            records_count: entities.len() as i32,
            compressed_size_bytes: compressed.len() as i64,
            storage_path: path,
            checksum,
        };
        
        self.save_snapshot_metadata(&snapshot).await?;
        
        Ok(snapshot)
    }
    
    // Restore from snapshot
    pub async fn restore_snapshot(&self, snapshot_id: Uuid) 
        -> Result<RestoreResult> {
        // 1. Load snapshot metadata
        let snapshot = self.get_snapshot(snapshot_id).await?;
        
        // 2. Retrieve compressed data
        let compressed = self.storage.load(&snapshot.storage_path).await?;
        
        // 3. Verify checksum
        if self.calculate_checksum(&compressed) != snapshot.checksum {
            return Err(Error::CorruptedBackup);
        }
        
        // 4. Decompress
        let data = self.decompress_data(&compressed)?;
        
        // 5. Deserialize
        let entities: Vec<Employee> = serde_json::from_slice(&data)?;
        
        // 6. Restore to database (transaction)
        let restored = self.restore_entities(entities).await?;
        
        Ok(RestoreResult {
            snapshot_id,
            records_restored: restored,
            restored_at: Utc::now(),
        })
    }
}
```

### Database Schema
```sql
CREATE TABLE hr_public.sync_snapshots (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    entity_type VARCHAR(50),
    snapshot_type VARCHAR(20),
    records_count INTEGER,
    compressed_size_bytes BIGINT,
    storage_path TEXT,
    checksum VARCHAR(64),
    created_before_sync_id UUID,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE TABLE hr_public.snapshot_restores (
    id UUID PRIMARY KEY,
    snapshot_id UUID REFERENCES hr_public.sync_snapshots(id),
    restored_at TIMESTAMPTZ DEFAULT NOW(),
    restored_by UUID REFERENCES hr_public.users(id),
    records_restored INTEGER,
    reason TEXT,
    status VARCHAR(20)
);
```

### Backup Strategy
**Frequency:**
- Full backup: Before every sync
- Incremental: Optional for large datasets
- Retention: 30 days of snapshots

**Storage:**
- Local: Fast access, limited space
- S3: Unlimited, cost-effective
- Hybrid: Recent local, old remote

**Compression:**
- gzip for moderate compression
- zstd for better ratio
- No compression for small datasets

## Dependencies
- Compression library (flate2, zstd)
- Storage backend (S3, local filesystem)
- Checksum algorithm (SHA-256)
- Transaction support for restores

## Implementation Phases
### Phase 1: Basic Snapshots
- Pre-sync full backups
- Local storage
- Manual restore

### Phase 2: Automated Restore
- One-click rollback
- UI for snapshot management
- Backup verification

### Phase 3: Optimization
- Differential backups
- S3 storage
- Retention policies
- Automated cleanup

## Research Notes
- [ ] Storage costs (S3 pricing)
- [ ] Compression ratios for HR data
- [ ] Restore time targets (< 30 seconds?)
- [ ] Legal retention requirements
- [ ] GDPR implications (backup of deleted data)

## UI for Rollback
```svelte
<!-- Sync Insurance Panel -->
<Card>
  <CardHeader>
    <CardTitle>🛡️ Sync Insurance</CardTitle>
    <CardDescription>
      Automatic backups protect your data
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div class="snapshots">
      {#each snapshots as snapshot}
        <div class="snapshot-item">
          <div>
            <strong>{formatDate(snapshot.createdAt)}</strong>
            <span>{snapshot.recordsCount} records</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onclick={() => restore(snapshot.id)}
          >
            Restore
          </Button>
        </div>
      {/each}
    </div>
  </CardContent>
</Card>
```

## Success Metrics
- Backup success rate: 100%
- Restore accuracy: 100%
- Restore time: < 1 minute
- Storage cost: < $10/month
- User confidence increase: measurable via survey

## Notes
_Research findings and implementation decisions_
