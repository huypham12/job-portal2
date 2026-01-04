# Elasticsearch Sync System

## Tổng quan

Hệ thống sync tự động đồng bộ dữ liệu từ PostgreSQL sang Elasticsearch để đảm bảo dữ liệu luôn mới nhất cho việc tìm kiếm và matching.

## Cách hoạt động

### 1. Sync Real-time (Middleware)

- **Middleware tự động**: `ElasticsearchSyncMiddleware` được áp dụng cho tất cả routes liên quan đến jobs, profiles, companies, applications
- **Trigger**: Mỗi khi có POST/PUT/PATCH/DELETE operations, middleware sẽ tự động sync dữ liệu sang ES
- **Non-blocking**: Sync chạy bất đồng bộ, không ảnh hưởng đến response time của API

### 2. Sync Background (Worker)

- **SyncRetryWorker**: Chạy mỗi 60 giây để retry các failed syncs
- **Exponential backoff**: Retry với delay tăng dần (1s, 2s, 4s, 8s...)
- **Cleanup**: Tự động dọn dẹp old sync records mỗi 24h

### 3. Monitoring & Recovery

- **Database tracking**: Bảng `sync_status` ghi lại trạng thái sync của từng entity
- **Health check**: API endpoints để monitor và fix issues
- **Consistency validation**: Tự động detect và fix data mismatches

## API Endpoints

### Monitoring

```bash
GET /api/sync/status
# Trả về thống kê sync và danh sách failed records
```

```bash
GET /api/sync/consistency
# Validate data consistency giữa DB và ES
```

```bash
GET /api/sync/failed-summary
# Summary failed syncs theo entity type
```

### Recovery

```bash
POST /api/sync/retry
# Manual retry tất cả failed syncs
```

```bash
POST /api/sync/retry/:entityType/:entityId
# Retry sync cho entity cụ thể
```

```bash
POST /api/sync/fix-consistency
# Auto-fix data consistency issues
```

```bash
POST /api/sync/cleanup
# Manual cleanup old sync records
```

## Sync Flow

### Khi User tạo Profile:

1. **API Request**: `POST /api/user/me/profile`
2. **Database**: Profile được tạo trong PostgreSQL
3. **Middleware**: `ElasticsearchSyncMiddleware` detect và trigger sync
4. **Transform**: `profileToESDoc()` convert data sang ES format
5. **Sync**: Gửi lên Elasticsearch với retry logic
6. **Track**: Ghi status vào `sync_status` table

### Khi có lỗi:

1. **Detect**: Sync thất bại được ghi vào `sync_status`
2. **Retry**: Worker retry mỗi 60 giây với exponential backoff
3. **Recovery**: Admin có thể manual retry qua API

## Data Consistency

### Validation Rules

- **Ownership**: Validate user/company ownership trước khi sync
- **Required fields**: Check required fields (id, title, etc.)
- **Data integrity**: Validate FK relationships

### Consistency Checks

- **Count validation**: So sánh số lượng records giữa DB và ES
- **Sample validation**: Check sample IDs để detect mismatches
- **Auto-fix**: Tự động sync missing entities

## Monitoring Dashboard

### Key Metrics

- **Sync success rate**: % operations thành công
- **Average sync time**: Thời gian trung bình để sync
- **Failed syncs**: Số lượng failed syncs theo entity type
- **Data consistency**: % data consistent giữa DB và ES

### Alerts

- **High failure rate**: >5% sync failures
- **Data inconsistency**: DB count ≠ ES count
- **Worker down**: SyncRetryWorker không hoạt động

## Troubleshooting

### Common Issues

#### 1. Sync failures

```bash
# Check failed syncs
GET /api/sync/status

# Retry specific entity
POST /api/sync/retry/job/123e4567-e89b-12d3-a456-426614174000

# Retry all failed
POST /api/sync/retry
```

#### 2. Data inconsistency

```bash
# Check consistency
GET /api/sync/consistency

# Auto-fix
POST /api/sync/fix-consistency
```

#### 3. Performance issues

```bash
# Check sync stats
GET /api/sync/status

# Cleanup old records
POST /api/sync/cleanup
```

### Debug Commands

```bash
# Manual sync entity
curl -X POST /api/sync/retry/profile/123e4567-e89b-12d3-a456-426614174000

# Force reindex (nếu cần)
# Trong code, gọi elasticsearchSyncService.syncAllData({ forceReindex: true })
```

## Best Practices

### For Developers

1. **Test sync**: Luôn test sync khi thêm/modify entities
2. **Monitor logs**: Watch cho sync errors trong logs
3. **Handle failures**: Implement proper error handling trong sync operations

### For Admins

1. **Regular monitoring**: Check `/api/sync/status` daily
2. **Consistency checks**: Run `/api/sync/consistency` weekly
3. **Cleanup**: Run `/api/sync/cleanup` monthly

### For DevOps

1. **Alert setup**: Setup alerts cho high failure rates
2. **Resource monitoring**: Monitor ES cluster health
3. **Backup strategy**: Regular ES snapshots

## Performance Optimization

### Indexing Strategy

- **Incremental sync**: Chỉ sync changed entities
- **Bulk operations**: Group multiple syncs thành bulk requests
- **Async processing**: Non-blocking sync để không ảnh hưởng API response

### Caching Strategy

- **Redis cache**: Cache search results để reduce ES load
- **Sync status cache**: Cache sync stats để quick monitoring
- **Entity cache**: Cache recently synced entities

### Scalability

- **Worker pools**: Multiple worker instances nếu cần
- **Queue system**: Redis queue cho high-volume syncs
- **Shard optimization**: Proper ES shard configuration

## Security Considerations

### Data Validation

- **Ownership validation**: Chỉ sync entities user sở hữu
- **Input sanitization**: Validate và sanitize data trước khi sync
- **Rate limiting**: Prevent abuse của sync endpoints

### Access Control

- **Admin only**: Sync management endpoints chỉ dành cho admin
- **User isolation**: Sync operations respect user permissions
- **Audit logging**: Log tất cả sync operations cho audit

## Migration Guide

### From Manual Sync to Auto Sync

1. Enable middleware trong routes
2. Start SyncRetryWorker
3. Run initial sync: `elasticsearchSyncService.syncAllData()`
4. Monitor và fix issues qua API endpoints

### Upgrading Existing System

1. Backup current ES indices
2. Update mappings với enhanced schema
3. Run reindex với `forceReindex: true`
4. Validate consistency sau migration

---

**Result**: Hệ thống sync đảm bảo data luôn consistent giữa PostgreSQL và Elasticsearch với real-time sync, background retry, và comprehensive monitoring! 🎯
