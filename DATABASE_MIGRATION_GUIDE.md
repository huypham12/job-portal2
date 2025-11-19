# Database Migration Guide: Metadata Refactoring & Performance Optimization

## Overview

Đây là guide cho việc refactor database từ JSON metadata sang structured tables và thêm performance indexes cho Elasticsearch integration.

## Migration Steps

### 1. Main Migration (Đã chạy)

```bash
npx prisma migrate dev --name add_metadata_tables_and_performance_indexes
```

### 2. Additional Performance Indexes

Chạy script này để thêm các index performance tối ưu:

```bash
psql -d your_database_url -f prisma/additional_performance_indexes.sql
```

### 3. Data Migration (Tùy chọn)

Nếu bạn có data JSON metadata cần migrate:

```bash
psql -d your_database_url -f prisma/migrate_metadata.sql
```

## New Tables Structure

### Job Metadata Tables

#### `job_requirements`

- Lưu trữ các yêu cầu của job (skills, education, certification)
- Thay thế `jobs.metadata.requirements`
- Indexed cho tìm kiếm theo type và level

#### `job_benefits`

- Lưu trữ các benefit của job
- Thay thế `jobs.metadata.benefits`
- Hỗ trợ cả text và monetary benefits

#### `job_work_arrangements`

- Lưu trữ thông tin remote, flexible working
- Thay thế `jobs.metadata.work_arrangement`
- One-to-one relationship với jobs

### Company Metadata Tables

#### `company_details`

- Thông tin chi tiết về company (industry, size, website)
- Thay thế `companies.metadata`
- Indexed cho tìm kiếm theo industry và company size

#### `company_benefits`

- Benefits mà company cung cấp
- Separate từ job benefits
- Có thể feature highlight

#### `company_cultures`

- Culture aspects với rating
- Dùng cho company matching và filtering

### Application Tracking Tables

#### `application_stages`

- Track application process stages
- Thay thế application status tracking trong metadata
- Hỗ trợ feedback và rating cho từng stage

#### `application_documents`

- Lưu trữ documents đính kèm với application
- Separate từ resume system
- Support multiple document types

## Performance Indexes Added

### Search Optimization

```sql
-- Composite index for job search
idx_jobs_search_composite (status, location_id, job_type)

-- Application pipeline for recruiters
idx_applications_pipeline (job_id, status, applied_at DESC)

-- Company lookup
idx_company_lookup (industry, employee_count_min)
```

### Elasticsearch Sync

```sql
-- Sync indexes for updated data
idx_jobs_elasticsearch_sync (updated_at DESC, id)
idx_profiles_elasticsearch_sync (updated_at DESC, id)
idx_companies_elasticsearch_sync (updated_at DESC, id)
```

### Recommendation Engine

```sql
-- Job recommendations based on user behavior
idx_job_recommendations (user_id, viewed_at DESC, duration_seconds DESC)

-- Skills matching
idx_profile_skills_matching (skill_id, level)
```

## Elasticsearch Integration

### Recommended Mapping Strategy

#### Jobs Index

```javascript
{
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "title": {"type": "text", "analyzer": "standard"},
      "description": {"type": "text", "analyzer": "standard"},
      "requirements": {
        "type": "nested",
        "properties": {
          "type": {"type": "keyword"},
          "title": {"type": "text"},
          "level": {"type": "keyword"},
          "is_required": {"type": "boolean"}
        }
      },
      "benefits": {
        "type": "nested",
        "properties": {
          "type": {"type": "keyword"},
          "title": {"type": "text"},
          "amount": {"type": "float"}
        }
      },
      "work_arrangement": {
        "properties": {
          "remote_allowed": {"type": "boolean"},
          "remote_percentage": {"type": "integer"},
          "flexible_hours": {"type": "boolean"}
        }
      }
    }
  }
}
```

### Sync Strategy

1. **Real-time sync**: Sử dụng `updated_at` indexes để track changes
2. **Batch sync**: Query với `updated_at > last_sync_time`
3. **Full reindex**: Khi cần rebuild toàn bộ index

## Query Examples

### 1. Search Jobs with Requirements

```typescript
// Postgres Query
const jobsWithRequirements = await prisma.jobs.findMany({
  where: {
    status: 'approved',
    job_requirements: {
      some: {
        requirement_type: 'skill',
        title: { contains: 'JavaScript' }
      }
    }
  },
  include: {
    job_requirements: true,
    job_benefits: true,
    job_work_arrangements: true
  }
})
```

### 2. Company Search by Industry & Size

```typescript
const companies = await prisma.companies.findMany({
  where: {
    company_details: {
      industry: 'technology',
      employee_count_min: { gte: 100 },
      employee_count_max: { lte: 1000 }
    }
  },
  include: {
    company_details: true,
    company_benefits: true,
    company_cultures: true
  }
})
```

### 3. Application Pipeline Tracking

```typescript
const applicationPipeline = await prisma.applications.findMany({
  where: { job_id: jobId },
  include: {
    application_stages: {
      orderBy: { stage_order: 'asc' }
    },
    application_documents: true,
    users: {
      include: { profiles: true }
    }
  },
  orderBy: { applied_at: 'desc' }
})
```

## Benefits

### 1. Performance Improvements

- **Faster filtering**: Dedicated indexes thay vì JSON queries
- **Better JOIN performance**: Structured relationships
- **Elasticsearch optimization**: Efficient sync mechanisms

### 2. Data Integrity

- **Type safety**: Strongly typed fields thay vì JSON
- **Constraints**: Check constraints cho data validation
- **Referential integrity**: Foreign key constraints

### 3. Scalability

- **Index selectivity**: Partial indexes cho active data
- **Query optimization**: PostgreSQL có thể optimize joins tốt hơn
- **Storage efficiency**: Normalized data structure

### 4. Search & Recommendation

- **Faceted search**: Dễ dàng build filters
- **Aggregations**: Better performance cho analytics
- **ML features**: Structured data cho machine learning

## Monitoring & Maintenance

### 1. Index Usage Monitoring

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'recruitment'
ORDER BY idx_scan DESC;
```

### 2. Query Performance

```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries > 1s
```

### 3. Index Maintenance

```sql
-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_jobs_search_composite;
```

## Migration Rollback (Nếu cần)

Nếu cần rollback, có thể:

1. Keep metadata JSON columns
2. Use migration script để sync ngược lại từ structured tables
3. Drop new tables và indexes

## Next Steps

1. **Update application code** để sử dụng new structured tables
2. **Implement Elasticsearch sync** với new indexes
3. **Monitor performance** và adjust indexes if needed
4. **Gradually phase out** JSON metadata fields sau khi verify data integrity
