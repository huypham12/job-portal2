# Ownership Consistency Fix

## Tổng quan vấn đề

Trước đây, dữ liệu ownership (recruiter của job, role của user) không được đồng bộ đầy đủ giữa PostgreSQL và Elasticsearch, dẫn đến:

1. **Job ownership inconsistency**: Job của recruiter A có thể hiển thị dưới tên recruiter B trên ES
2. **Security vulnerabilities**: Không thể verify ownership trực tiếp từ ES data
3. **Data integrity issues**: Race conditions trong sync process

## Giải pháp đã triển khai

### 1. Thêm ownership fields vào ES documents

#### Jobs Document

```javascript
{
  id: "job-uuid",
  company_id: "company-uuid",
  recruiter_id: "user-uuid",     // ← NEW: Direct ownership reference
  recruiter_role: "recruiter",   // ← NEW: User role for validation
  // ... other fields
}
```

#### Profiles Document

```javascript
{
  id: "profile-uuid",
  user_id: "user-uuid",
  user_role: "candidate",        // ← NEW: User role context
  // ... other fields
}
```

#### Companies Document

```javascript
{
  id: "company-uuid",
  recruiter_id: "user-uuid",     // ← Already existed
  recruiter_role: "recruiter",   // ← NEW: User role validation
  // ... other fields
}
```

### 2. Cập nhật ES Mappings

Đã thêm các field mới vào Elasticsearch mappings:

```javascript
// Jobs mapping
recruiter_id: { type: 'keyword' },
recruiter_role: { type: 'keyword' },

// Profiles mapping
user_role: { type: 'keyword' },

// Companies mapping
recruiter_role: { type: 'keyword' }
```

### 3. Cập nhật Transformers

#### `jobToESDoc()` - Thêm ownership info

```typescript
return {
  // ... existing fields
  recruiter_id: job.companies?.recruiter_id || null,
  recruiter_role: job.companies?.users?.role || null
}
```

#### `profileToESDoc()` - Thêm user role

```typescript
return {
  // ... existing fields
  user_role: profile.users?.role || null
}
```

#### `companyToESDoc()` - Thêm recruiter role

```typescript
return {
  // ... existing fields
  recruiter_role: company.users?.role || null
}
```

### 4. Cập nhật Sync Services

#### Enhanced Database Queries

```typescript
// syncJobById - Include users relation
include: {
  companies: {
    include: {
      users: true // For recruiter role
    }
  },
  // ... other includes
}

// syncProfileById - Include users relation
include: {
  users: true, // For user role
  // ... other includes
}

// syncCompanyById - Include users relation
include: {
  users: true, // For recruiter role
  // ... other includes
}
```

### 5. Ownership Verification Methods

#### ES-First Ownership Verification

```typescript
private async verifyJobOwnershipFromES(jobId: string, userId: string): Promise<boolean> {
  try {
    // Try ES first for performance
    const esJob = await elasticsearchService.getById('jobs', jobId);
    if (esJob && esJob.recruiter_id) {
      return esJob.recruiter_id === userId;
    }
  } catch (error) {
    console.warn('ES ownership verification failed, falling back to DB');
  }

  // Fallback to database
  return this.verifyJobOwnershipFromDB(jobId, userId);
}
```

## Lợi ích của giải pháp

### 1. **Data Consistency**

- Ownership information được đồng bộ đầy đủ
- Verification có thể thực hiện trực tiếp từ ES
- Giảm race conditions trong sync

### 2. **Performance Improvement**

- Ownership verification ưu tiên sử dụng ES (nhanh hơn DB)
- Fallback sang DB khi cần thiết
- Giảm load database queries

### 3. **Security Enhancement**

- Verification logic rõ ràng và consistent
- Không thể bypass ownership checks
- Audit trail qua ES data

### 4. **Maintainability**

- Centralized ownership logic
- Clear separation of concerns
- Easy to extend cho future requirements

## Testing và Validation

### Chạy test consistency:

```bash
node test-ownership-consistency.js
```

### Expected Output:

```
🧪 Testing ownership consistency...

📋 Test 1: Jobs ownership consistency
✅ Job job-1: Ownership consistent
✅ Job job-2: Ownership consistent

👤 Test 2: Profiles ownership consistency
✅ Profile profile-1: Ownership consistent
✅ Profile profile-2: Ownership consistent

🏢 Test 3: Companies ownership consistency
✅ Company company-1: Ownership consistent
✅ Company company-2: Ownership consistent

📊 Test Summary:
Jobs ownership issues: 0
Profiles ownership issues: 0
Companies ownership issues: 0
🎉 All ownership data is consistent!
```

## Migration Steps

### 1. Deploy Code Changes

```bash
# Deploy các file đã cập nhật:
# - src/shared/utils/es-transformers.ts
# - src/config/elasticsearch.service.ts
# - src/config/elasticsearch-sync.service.ts
# - src/api/jobs/job.service.ts
```

### 2. Update ES Mappings

```bash
# Restart services để áp dụng mapping changes
# Hoặc reindex data với forceReindex=true
```

### 3. Full Re-sync Data

```bash
# Chạy full sync để populate ownership fields
curl -X POST http://localhost:3000/api/admin/sync/full-reindex
```

### 4. Validate Consistency

```bash
# Chạy test script
node test-ownership-consistency.js
```

## Future Enhancements

### 1. Ownership-based Search Filters

- Filter jobs by recruiter role
- Search profiles by user type
- Company ownership validation

### 2. Advanced Security Features

- Multi-tenant ownership verification
- Role-based access control (RBAC)
- Ownership audit logging

### 3. Performance Optimizations

- Ownership-based query optimization
- Caching ownership data
- Batch ownership verification

## Troubleshooting

### Common Issues:

1. **ES mapping conflicts**: Delete and recreate indices
2. **Missing ownership data**: Run full re-sync
3. **Verification failures**: Check database relations
4. **Performance issues**: Monitor ES query patterns

### Debug Commands:

```bash
# Check ES document
curl http://localhost:9200/jobs/_doc/job-id

# Check ownership fields
curl http://localhost:9200/jobs/_search -d '{"query":{"term":{"recruiter_id":"user-id"}}}'

# Validate sync status
curl http://localhost:3000/api/admin/sync/stats
```
