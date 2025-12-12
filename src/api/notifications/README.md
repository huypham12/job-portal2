# Notifications Module

## Overview

Real-time notification system using Socket.IO + REST API for the Job Portal application.

## Features

- ✅ REST API endpoints for notification management
- ✅ Real-time WebSocket notifications
- ✅ Multi-device synchronization
- ✅ Unread count tracking
- ✅ Notification type filtering
- ✅ Helper functions for easy integration

## REST API Endpoints

### 1. Get Notifications

```http
GET /api/notifications
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `read` (optional): Filter by read status (true/false)
- `type` (optional): Filter by notification type

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "application_received",
      "content": "Bạn có đơn ứng tuyển mới từ Nguyễn Văn A cho vị trí Senior Developer",
      "sent_at": "2025-12-11T10:30:00Z",
      "read": false,
      "metadata": {
        "application_id": "uuid",
        "job_id": "uuid",
        "candidate_name": "Nguyễn Văn A"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 95,
    "per_page": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

### 2. Get Unread Count

```http
GET /api/notifications/unread-count
```

**Response:**

```json
{
  "unread_count": 12,
  "by_type": {
    "application_received": 5,
    "connection_interest_received": 3,
    "application_status_changed": 4
  }
}
```

### 3. Mark as Read

```http
PATCH /api/notifications/:id/read
```

**Response:**

```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "read": true,
    "read_at": "2025-12-11T10:35:00Z"
  }
}
```

### 4. Mark All as Read

```http
PATCH /api/notifications/mark-all-read
```

**Response:**

```json
{
  "success": true,
  "updated_count": 12
}
```

### 5. Delete Notification

```http
DELETE /api/notifications/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

## WebSocket Events

### Client → Server

#### 1. Authenticate

```javascript
socket.emit('authenticate', { token: 'your-jwt-token' })
```

#### 2. Subscribe to Notifications

```javascript
socket.emit('subscribe:notifications')
```

#### 3. Mark Notification as Read

```javascript
socket.emit('notification:read', { notificationId: 'uuid' })
```

#### 4. Unsubscribe from Notifications

```javascript
socket.emit('unsubscribe:notifications')
```

### Server → Client

#### 1. New Notification

```javascript
socket.on('notification:new', (data) => {
  console.log('New notification:', data)
  // data: {
  //   id: 'uuid',
  //   type: 'application_received',
  //   content: 'Message...',
  //   sent_at: '2025-12-11T10:30:00Z',
  //   metadata: { ... }
  // }
})
```

#### 2. Notification Read (Multi-device sync)

```javascript
socket.on('notification:read', (data) => {
  console.log('Notification marked as read:', data)
  // data: {
  //   notificationId: 'uuid',
  //   read_at: '2025-12-11T10:35:00Z'
  // }
})
```

#### 3. Unread Count Update

```javascript
socket.on('notification:count', (data) => {
  console.log('Unread count:', data.unread_count)
  // data: { unread_count: 10 }
})
```

#### 4. Error

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message)
})
```

## Notification Types

```typescript
enum NotificationType {
  // Applications
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_STAGE_UPDATED = 'application_stage_updated',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  APPLICATION_WITHDRAWN = 'application_withdrawn',

  // Connection Interests
  CONNECTION_INTEREST_RECEIVED = 'connection_interest_received',
  CONNECTION_INTEREST_ACCEPTED = 'connection_interest_accepted',
  CONNECTION_INTEREST_REJECTED = 'connection_interest_rejected',
  CONNECTION_INTEREST_EXPIRED = 'connection_interest_expired',

  // Jobs
  JOB_SAVED = 'job_saved',
  SAVED_JOB_EXPIRING = 'saved_job_expiring',

  // System
  SYSTEM_ANNOUNCEMENT = 'system_announcement'
}
```

## Usage in Backend

### Using Notification Helper

The easiest way to send notifications is using the `NotificationHelper`:

```typescript
import { notificationHelper } from '@/shared/helpers/notification.helper'

// Example: Notify recruiter when application is received
await notificationHelper.notifyApplicationReceived({
  recruiterId: 'user-uuid',
  candidateName: 'Nguyễn Văn A',
  jobTitle: 'Senior Developer',
  applicationId: 'application-uuid',
  jobId: 'job-uuid'
})

// Example: Notify candidate when application status changes
await notificationHelper.notifyApplicationStatusChanged({
  candidateId: 'user-uuid',
  jobTitle: 'Senior Developer',
  status: 'accepted',
  applicationId: 'application-uuid'
})

// Example: Notify candidate when interview is scheduled
await notificationHelper.notifyInterviewScheduled({
  candidateId: 'user-uuid',
  jobTitle: 'Senior Developer',
  scheduledAt: '2025-12-15T14:00:00Z',
  applicationId: 'application-uuid',
  stageId: 'stage-uuid'
})
```

### Using Socket Service Directly

For custom notifications:

```typescript
import { socketService } from '@/socket/socket.service'
import { NotificationType } from '@/shared/constants/notification-types'

await socketService.sendNotification('user-uuid', NotificationType.SYSTEM_ANNOUNCEMENT, 'Custom notification message', {
  custom_data: 'value'
})
```

## Frontend Integration Example

### React + Socket.IO Client

```typescript
import { io } from 'socket.io-client'

// Initialize socket connection
const socket = io('http://localhost:4000', {
  auth: {
    token: yourJwtToken
  }
})

// Subscribe to notifications when connected
socket.on('connect', () => {
  console.log('Connected to socket server')
  socket.emit('subscribe:notifications')
})

// Listen for new notifications
socket.on('notification:new', (notification) => {
  // Show toast/alert
  showNotification(notification.content)
  // Update notification list
  addNotificationToList(notification)
  // Play sound
  playNotificationSound()
})

// Listen for unread count updates
socket.on('notification:count', (data) => {
  updateUnreadBadge(data.unread_count)
})

// Mark notification as read
const markAsRead = (notificationId) => {
  socket.emit('notification:read', { notificationId })
}

// Cleanup on unmount
socket.on('disconnect', () => {
  console.log('Disconnected from socket server')
})
```

### Vue + Socket.IO Client

```typescript
import { io } from 'socket.io-client'
import { ref } from 'vue'

const socket = io('http://localhost:4000', {
  auth: { token: yourJwtToken }
})

const notifications = ref([])
const unreadCount = ref(0)

socket.on('connect', () => {
  socket.emit('subscribe:notifications')
})

socket.on('notification:new', (notification) => {
  notifications.value.unshift(notification)
  unreadCount.value++
})

socket.on('notification:count', (data) => {
  unreadCount.value = data.unread_count
})
```

## Testing

### Test WebSocket Connection

```bash
npm install -g wscat
wscat -c ws://localhost:4000
```

### Test REST API

```bash
# Get notifications
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/notifications

# Get unread count
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/notifications/unread-count

# Mark as read
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/notifications/:id/read

# Mark all as read
curl -X PATCH \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/notifications/mark-all-read

# Delete notification
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/notifications/:id
```

## Environment Variables

```env
# JWT Secret for socket authentication
JWT_SECRET=your-secret-key

# CORS Origin for Socket.IO
CORS_ORIGIN=http://localhost:3000

# Server Port
PORT=4000
```

## Architecture

```
src/
├── api/
│   └── notifications/
│       ├── notifications.routes.ts      # Express routes
│       ├── notifications.controller.ts  # HTTP request handlers
│       ├── notifications.service.ts     # Business logic
│       ├── notifications.types.ts       # TypeScript interfaces
│       └── notifications.validation.ts  # Zod schemas
├── socket/
│   ├── socket.service.ts               # Socket.IO server
│   └── socket.middleware.ts            # Socket authentication
└── shared/
    ├── constants/
    │   └── notification-types.ts       # Notification types & templates
    └── helpers/
        └── notification.helper.ts       # Convenience methods
```

## Database Schema

```sql
model notifications {
  id      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id String    @db.Uuid
  type    String
  content String
  sent_at DateTime? @default(now()) @db.Timestamp(6)
  read    Boolean?  @default(false)

  @@index([user_id, read, sent_at(sort: Desc)])
}
```

## Performance Considerations

- Notifications are indexed by `[user_id, read, sent_at]` for fast queries
- Socket connections are tracked in-memory for O(1) user lookup
- Batch notification creation available for system announcements
- Pagination prevents large data transfers

## Security

- JWT authentication required for both REST and WebSocket
- Users can only access their own notifications
- Socket authentication happens on handshake
- CORS configured for trusted origins only

## Future Enhancements

- [ ] Add notification preferences (email, push, SMS)
- [ ] Implement notification batching/digest
- [ ] Add notification expiration
- [ ] Implement read receipts
- [ ] Add notification categories/priorities
- [ ] Push notifications for mobile apps
- [ ] Email fallback for offline users
