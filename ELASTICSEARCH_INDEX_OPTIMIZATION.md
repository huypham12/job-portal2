# Elasticsearch Index Optimization

## Tóm tắt

Sau khi chuyển sang sử dụng Elasticsearch làm search engine chính, chúng ta đã loại bỏ các database indexes không cần thiết để tối ưu write performance.

## Migration Applied

**Migration**: `20251119090827_remove_elasticsearch_replaced_indexes`
**Date**: 19/11/2025

## Các Index Đã Loại Bỏ

### 1. Search-Related Indexes

- `idx_company_lookup` - Complex search trên company details
- `idx_jobs_search_composite` - Composite search trên jobs
- `trigram_users_email` - Full-text search trên email

### 2. Category/Type Filtering Indexes

- `idx_company_benefits_type` - Filter theo benefit type
- `idx_job_benefits_type` - Filter theo job benefit type
- `idx_job_requirements_type_level` - Filter theo requirement type và level

### 3. Matching/Recommendation Indexes

- `idx_job_skills_matching` - Skills matching
- `idx_profile_skills_matching` - Profile skills matching
- `idx_job_recommendations` - Job recommendations
- `idx_job_views_recommendation` - View-based recommendations

### 4. Analytics/Performance Tracking Indexes

- `idx_search_analytics_performance` - Search analytics
- `idx_search_history_analytics` - Search history analytics
- `idx_job_views_analytics_performance` - Job views analytics
- `idx_job_views_job_analytics` - Detailed job analytics
- `idx_job_views_user_behavior` - User behavior analytics

### 5. JSON GIN Indexes

- `idx_search_history_clicked_jobs_gin` - GIN index trên clicked_jobs JSON
- `idx_search_history_filters_gin` - GIN index trên filters JSON
- `idx_connection_interests_contact_info_gin` - GIN index trên contact_info JSON
- `idx_user_preferences_value_gin` - GIN index trên preference_value JSON

### 6. Complex Preference Indexes

- `idx_user_preferences_lookup` - Complex lookup với weight sorting
- `idx_user_preferences_type` - Type-based preferences với weight
- `idx_user_preferences_weighted` - Duplicate weighted index

## Các Index Mới/Đã Đơn Giản Hóa

### Thay thế indexes phức tạp bằng indexes đơn giản:

1. **job_views**:
   - `idx_job_views_job_basic` - Thay thế 5 indexes phức tạp
   - `idx_job_views_user_basic` - Basic user view tracking

2. **user_preferences**:
   - `idx_user_preferences_basic` - Thay thế 3 indexes có weight sorting

## Các Index Được Giữ Lại

### Core Business Logic Indexes

- `idx_applications_user_job` - Unique constraints
- `idx_applications_pipeline` - Application workflow
- `idx_applications_dashboard` - Recruiter dashboard
- `idx_notifications_user_read` - User notifications

### Foreign Key Indexes

- `idx_jobs_company` - Company relations
- `idx_jobs_location` - Location relations
- `idx_applications_job` - Application relations
- Tất cả FK indexes cho referential integrity

### Essential Operational Indexes

- `idx_refresh_tokens_user_id` - Authentication
- `idx_user_tokens_expires_at` - Token expiration
- `idx_audits_table_record` - Audit trail
- `idx_user_activity_timeline` - Activity tracking

### Elasticsearch Sync Indexes

- `idx_companies_elasticsearch_sync` - Company sync
- `idx_jobs_elasticsearch_sync` - Job sync
- `idx_profiles_elasticsearch_sync` - Profile sync

## Tác Động Dự Kiến

### Cải Thiện Write Performance

- Giảm 21+ indexes sẽ cải thiện đáng kể INSERT/UPDATE/DELETE operations
- Đặc biệt quan trọng cho các operations có volume cao như job applications

### Search Performance

- Search operations được xử lý hoàn toàn bởi Elasticsearch
- Database chỉ giữ lại essential indexes cho business logic

### Maintenance

- Giảm complexity trong database maintenance
- Giảm storage overhead
- Tăng tốc backup/restore operations

## Lưu Ý Quan Trọng

1. **Monitoring**: Theo dõi performance sau migration
2. **Elasticsearch**: Đảm bảo Elasticsearch hoạt động ổn định
3. **Rollback**: Có thể rollback migration nếu cần thiết
4. **Testing**: Test các chức năng search và filtering

## Các Queries Cần Test

1. Job search với filters phức tạp
2. Profile matching algorithms
3. Recommendation engine
4. Analytics và reporting queries
5. User preference filtering

## Next Steps

1. Monitor write performance improvements
2. Verify search functionality hoạt động bình thường
3. Update application code nếu có dependencies vào removed indexes
4. Consider further optimizations based on performance data
