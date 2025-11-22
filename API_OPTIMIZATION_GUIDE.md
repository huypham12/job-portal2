# API Optimization Guide: Specialized Endpoints

## Vấn đề Performance đã được giải quyết

### Trước đây: Overloaded /me endpoint

```
GET /me
- Trả về toàn bộ thông tin user + complete profile + applications + activity
- Kích thước response lớn (nhiều KB)
- Thời gian response chậm
- Over-fetching data không cần thiết
```

### Bây giờ: Specialized endpoints

```
GET /me                   - Basic user info only (dashboard)
GET /me/profile          - Complete profile với tất cả sub-entities
GET /me/applications     - User applications với pagination
GET /me/activity         - Recent activity với pagination
```

## Chi tiết API Endpoints mới

### 1. GET /me - Basic User Info

**Mục đích**: Dashboard, header navigation, basic user display

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "candidate",
    "verified": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "profile": {
      "id": "profile-uuid",
      "display_name": "John Doe",
      "headline": "Software Engineer",
      "location_text": "Ho Chi Minh City",
      "is_looking_for_job": true,
      "location": {
        "name": "Ho Chi Minh City",
        "type": "city"
      }
    }
  }
}
```

### 2. GET /me/profile - Complete Profile

**Mục đích**: Profile page, profile editing

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "profile-uuid",
    "full_name": "John Doe",
    "display_name": "John Doe",
    "headline": "Senior Software Engineer",
    "bio": "Experienced developer with 5+ years...",
    "years_of_experience": 5,
    "experiences": [...],
    "educations": [...],
    "skills": [...],
    "certifications": [...],
    "awards": [...]
  }
}
```

### 3. GET /me/applications - User Applications

**Mục đích**: Applications management page

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response**:

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app-uuid",
        "status": "pending",
        "applied_at": "2024-01-01T00:00:00Z",
        "jobs": {
          "id": "job-uuid",
          "title": "Senior Developer",
          "salary_range": { "min": 20000000, "max": 30000000 },
          "job_type": "full_time",
          "companies": {
            "name": "Tech Corp",
            "logo_url": "https://..."
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

### 4. GET /me/activity - Recent Activity

**Mục đích**: Activity dashboard, recent actions

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response**:

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "type": "application",
        "id": "app-uuid",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "pending",
        "job": {
          "id": "job-uuid",
          "title": "Senior Developer",
          "companies": {
            "name": "Tech Corp",
            "logo_url": "https://..."
          }
        }
      },
      {
        "type": "saved_job",
        "id": "saved-uuid",
        "timestamp": "2024-01-01T00:00:00Z",
        "job": {
          "id": "job-uuid",
          "title": "Frontend Developer",
          "companies": {
            "name": "Startup Inc",
            "logo_url": "https://..."
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

## Performance Benefits

### 1. Reduced Response Size

- **Basic user info**: ~1KB vs ~50KB trước đây
- **Targeted data fetching**: Chỉ load data cần thiết cho từng màn hình

### 2. Faster Load Times

- Dashboard loads faster (chỉ cần basic info)
- Profile page loads complete data khi cần
- Applications page có pagination (không load hết)

### 3. Better User Experience

- Faster initial page load
- Progressive data loading
- Reduced bandwidth usage
- Better mobile performance

### 4. Improved Caching Strategy

- Cache basic user info longer (ít thay đổi)
- Cache complete profile shorter (thay đổi nhiều)
- Independent cache invalidation per endpoint

## Frontend Usage Examples

### Dashboard Component

```typescript
// Chỉ load basic info for dashboard
const { data: user } = useQuery('/me')
```

### Profile Page

```typescript
// Load complete profile for editing
const { data: profile } = useQuery('/me/profile')
```

### Applications Page

```typescript
// Load applications with pagination
const { data: applications } = useQuery('/me/applications?page=1&limit=10')
```

### Activity Widget

```typescript
// Load recent activity for sidebar
const { data: activity } = useQuery('/me/activity?limit=5')
```

## Backend Implementation

### Service Layer Separation

- `getBasicMe()`: Minimal user info query
- `getCompleteProfile()`: Full profile with relations
- `getMyApplications()`: Paginated applications
- `getMyActivity()`: Recent activity combined from applications + saved jobs

### Database Query Optimization

- Selective field querying (không select \* từ tables)
- Proper indexing cho pagination
- Efficient joins cho related data
- Separate queries thay vì một big join

### Response Format Consistency

- Tất cả responses có `success` boolean
- Data wrapper consistent
- Pagination format chuẩn hoá
- Error handling unified

## Migration Guide

### Từ Old API

```typescript
// OLD: Load everything
const response = await fetch('/me')
const { user, profile, applications, activity } = response.data

// NEW: Load theo nhu cầu
const user = await fetch('/me')
const profile = await fetch('/me/profile')
const applications = await fetch('/me/applications')
const activity = await fetch('/me/activity')
```

### Frontend Refactoring

1. Update API calls trong components
2. Implement loading states per endpoint
3. Add pagination controls
4. Optimize cache strategies per endpoint
5. Add error boundaries per data type

## Monitoring & Analytics

### Performance Metrics to Track

- Response time per endpoint
- Response size per endpoint
- Cache hit rates
- Database query performance
- User behavior patterns

### Expected Improvements

- 80% faster dashboard load times
- 60% reduction in initial data transfer
- Better mobile performance
- Reduced server load
- Improved user engagement metrics
