# Performance Indexes Management Guide

## Vấn đề: Index bị tự động xóa sau khi tạo migration

### Nguyên nhân

Khi tạo index trong migration mà không khai báo trong `schema.prisma`, Prisma sẽ coi đó là "drift" và tự động tạo migration để xóa các index không được quản lý.

### Giải pháp

#### 1. Đối với Index đơn giản (có thể khai báo trong Prisma)

**Thêm vào `schema.prisma`:**

```prisma
model applications {
  // ... other fields
  @@index([job_id, status, applied_at(sort: Desc)], map: "idx_applications_dashboard")
}

model job_skills {
  // ... other fields
  @@index([skill_id], map: "idx_job_skills_matching")
}

model search_history {
  // ... other fields
  @@index([searched_at(sort: Desc), search_type], map: "idx_search_analytics_performance")
  @@index([user_id, searched_at(sort: Desc)], map: "idx_search_conversion_tracking")
}

model user_preferences {
  // ... other fields
  @@index([user_id, preference_type, weight(sort: Desc)], map: "idx_user_preferences_weighted")
}
```

**Sau đó chạy:**

```bash
npx prisma migrate dev --name "add_performance_indexes"
```

#### 2. Đối với Index phức tạp (GiST, INCLUDE, WHERE clauses)

**Sử dụng file SQL riêng biệt:**

- File: `prisma/additional_performance_indexes_v2.sql`
- Chạy script: `node prisma/apply-performance-indexes.js`

#### 3. Quy trình đúng khi thêm index mới

1. **Kiểm tra xem index có thể khai báo trong Prisma không:**
   - ✅ Basic indexes với các column thông thường
   - ✅ Composite indexes
   - ✅ Partial indexes đơn giản với WHERE
   - ❌ GiST/GIN indexes
   - ❌ INCLUDE clauses
   - ❌ Complex WHERE conditions
   - ❌ Function-based indexes

2. **Nếu có thể khai báo trong Prisma:**

   ```bash
   # Thêm vào schema.prisma
   # Sau đó:
   npx prisma migrate dev --name "add_your_index_name"
   ```

3. **Nếu không thể khai báo trong Prisma:**
   ```bash
   # Tạo file SQL riêng
   # Chạy thủ công sau migrations
   node prisma/apply-performance-indexes.js
   ```

### Index hiện tại đã được quản lý

#### Trong Prisma Schema:

- `idx_applications_dashboard` - Dashboard queries
- `idx_job_skills_matching` - Skills matching
- `idx_search_analytics_performance` - Search analytics
- `idx_search_conversion_tracking` - Conversion tracking
- `idx_user_preferences_weighted` - User preferences

#### Trong SQL riêng biệt:

- `idx_jobs_salary_range_gist` - Salary range queries (GiST)
- `idx_jobs_active_search` - Active job search (partial)
- `idx_connection_active_matching` - Connection matching (partial)
- `idx_job_views_recommendation_engine` - Recommendations (partial)
- `idx_*_fulltext` - Full-text search indexes (GIN)
- `idx_*_covering` - Covering indexes with INCLUDE
- Various partial indexes with complex WHERE clauses

### Monitoring & Maintenance

#### Kiểm tra index usage:

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'recruitment'
ORDER BY idx_scan DESC;
```

#### Kiểm tra index size:

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'recruitment'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Best Practices

1. **Luôn test performance trước và sau khi thêm index**
2. **Sử dụng `CREATE INDEX CONCURRENTLY` trong production**
3. **Monitor index usage định kỳ**
4. **Document rõ ràng mục đích của từng index**
5. **Thêm index vào schema.prisma khi có thể để Prisma quản lý**

### Troubleshooting

#### Nếu index bị xóa không mong muốn:

1. Kiểm tra `schema.prisma` xem có khai báo không
2. Nếu chưa có, thêm vào schema và tạo migration
3. Nếu không thể thêm vào schema, sử dụng file SQL riêng biệt
4. Chạy lại script `apply-performance-indexes.js`

#### Nếu migration fail:

1. Kiểm tra syntax trong schema.prisma
2. Đảm bảo không có conflict với index existing
3. Sử dụng `npx prisma migrate reset` nếu cần (chỉ trong development)
