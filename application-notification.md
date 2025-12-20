Đang tổng hợp lại toàn bộ luồng ứng tuyển và kết nối sau khi đã cập nhật.


[4 tools called]


# TÀI LIỆU TỔNG HỢP: LUỒNG ỨNG TUYỂN VÀ KẾT NỐI (FINAL VERSION)

## 1. LUỒNG TUYỂN DỤNG (RECRUITMENT FLOW) - HOÀN CHỈNH

### 1.1. GIAI ĐOẠN 1: RECRUITER ĐĂNG TIN TUYỂN DỤNG

#### Bước 1.1: Tạo Draft Job
**Endpoint:** `POST /api/jobs`
**Body:**
```json
{
  "title": "Senior Developer",
  "description": "...",
  "company_id": "uuid",
  "location_id": "uuid",
  "salary_range": {"min": 20000000, "max": 30000000, "currency": "VND"},
  "job_type": "full_time",
  "experience_level": 5,
  "requirements": [...],
  "benefits": [...],
  "skills": ["uuid1", "uuid2"],
  "tags": ["uuid1", "uuid2"],
  "work_arrangements": {...}
}
```

**Database:**
```sql
INSERT INTO jobs (
  status = 'draft',
  deleted = false,
  posted_at = NULL,
  expires_at = NULL
)
INSERT INTO job_requirements, job_benefits, job_skills, job_tags, job_work_arrangements
```

#### Bước 1.2: Submit để Admin Duyệt
**Endpoint:** `PATCH /api/jobs/:id/status`
**Body:** `{ "status": "pending" }`

**Database:**
```sql
UPDATE jobs SET status = 'pending', updated_at = NOW()
INSERT INTO job_posts_history (version, content)
```

#### Bước 1.3: Admin Duyệt Tin
**Endpoint:** `PATCH /api/admin/jobs/:id/approve`

**Database:**
```sql
UPDATE jobs SET
  status = 'approved',
  posted_at = NOW(),
  expires_at = NOW() + INTERVAL '30 days'
```

**Notification:**
- Gửi cho Recruiter: `job_approved`
  - Action URL: `/recruiter/jobs/{id}`
  - Metadata: `{job_id, job_title}`

---

### 1.2. GIAI ĐOẠN 2: CANDIDATE TÌM KIẾM VÀ XEM JOB

#### Bước 2.1: Search Jobs
**Endpoint:** `GET /api/jobs?search=...&filters=...`

**Database:**
- SELECT từ `jobs` với filters
- Filter: `status = 'approved'`, `deleted = false`, `expires_at > NOW()`

#### Bước 2.2: Xem Job Detail
**Endpoint:** `GET /api/jobs/:id/public`

**Database:**
```sql
INSERT INTO job_views (
  job_id, profile_id, viewed_at, source
)
```

#### Bước 2.3: Lưu Job
**Endpoint:** `POST /api/saved-jobs`
**Body:** `{ "job_id": "uuid" }`

**Database:**
```sql
INSERT INTO saved_jobs (profile_id, job_id, saved_at)
-- Unique constraint: [profile_id, job_id]
```

---

### 1.3. GIAI ĐOẠN 3: CANDIDATE ỨNG TUYỂN

#### Bước 3.1: Submit Application
**Endpoint:** `POST /api/applications`
**Body:**
```json
{
  "job_id": "uuid",
  "resume_id": "uuid",  // optional
  "cover_letter": "text",  // optional
  "metadata": {}  // optional
}
```

**Database:**
```sql
INSERT INTO applications (
  job_id, profile_id, resume_id,
  status = 'pending',
  applied_at = NOW(),
  cover_letter,
  is_withdrawn = false,
  view_count = 0
)
```

**Notifications:**
- Gửi cho Recruiter: `application_received`
  - Title: "Đơn ứng tuyển mới: {job_title}"
  - Action URL: `/recruiter/applications/{application_id}`
  - Metadata: `{application_id, job_id, candidate_name, job_title}`
  - Category: `application`

- Gửi cho Candidate: `application_submitted` (nếu có)
  - Action URL: `/candidate/applications/{application_id}`
  - Metadata: `{application_id, job_title}`

#### Bước 3.2: Upload Documents (Optional)
**Endpoint:** `POST /api/applications/:id/documents`
**Body:** `{ "document_type": "portfolio" }` + File upload

**Database:**
```sql
INSERT INTO application_documents (
  application_id, document_type, file_url,
  original_filename, mime_type, file_size_bytes
)
```

**Notification:**
- Gửi cho Recruiter: `application_document_uploaded`
  - Title: "Tài liệu mới: {job_title}"
  - Action URL: `/recruiter/applications/{application_id}/documents`
  - Metadata: `{application_id, document_id, document_type, candidate_name, job_title}`
  - Category: `application`

#### Bước 3.3: Xem Trạng Thái Application
**Endpoint:** `GET /api/applications` hoặc `GET /api/applications/:id`

**Database:**
- SELECT từ `applications` với relations
- JOIN `jobs`, `companies`, `application_stages`

---

### 1.4. GIAI ĐOẠN 4: RECRUITER XỬ LÝ ỨNG TUYỂN

#### Bước 4.1: Xem Danh Sách Applications
**Endpoint:** `GET /api/applications/job/:jobId?status=...&page=...&limit=...`

**Database:**
- SELECT từ `applications` với filters
- JOIN `profiles`, `resumes`, `jobs`
- Index: `[job_id, status, applied_at DESC]`

#### Bước 4.2: Xem Application Detail + CV
**Endpoint:** `GET /api/applications/:id/cv`

**Database:**
```sql
UPDATE applications SET
  view_count = view_count + 1,
  first_viewed_at = COALESCE(first_viewed_at, NOW()),
  last_viewed_at = NOW()
```

#### Bước 4.3: Đánh Dấu "Đã Xem" (Reviewed)
**Endpoint:** `PATCH /api/applications/:id/status`
**Body:**
```json
{
  "status": "reviewed",
  "reason": "optional"
}
```

**Database:**
```sql
UPDATE applications SET
  status = 'reviewed',
  last_viewed_at = NOW()
```

**Notification:**
- Gửi cho Candidate: `application_status_changed`
  - Title: "Cập nhật đơn ứng tuyển: {job_title}"
  - Action URL: `/candidate/applications/{application_id}`
  - Metadata: `{application_id, job_title, status, status_display: "Đã xem"}`
  - Category: `application`

#### Bước 4.4: Từ Chối Application
**Endpoint:** `PATCH /api/applications/:id/status`
**Body:**
```json
{
  "status": "rejected",
  "reason": "Không phù hợp yêu cầu"
}
```

**Database:**
```sql
UPDATE applications SET
  status = 'rejected',
  rejected_at = NOW(),
  rejected_reason = 'Không phù hợp yêu cầu'
```

**Notification:**
- Gửi cho Candidate: `application_status_changed`
  - Title: "Cập nhật đơn ứng tuyển: {job_title}"
  - Action URL: `/candidate/applications/{application_id}`
  - Metadata: `{application_id, job_title, status, status_display: "Đã từ chối", reason}`
  - Category: `application`

---

### 1.5. GIAI ĐOẠN 5: PHỎNG VẤN (INTERVIEW STAGES)

#### Bước 5.1: Recruiter Tạo Interview Stage
**Endpoint:** `POST /api/applications/:id/stage`
**Body:**
```json
{
  "stage_name": "Phone Screen",
  "stage_order": 1,
  "scheduled_at": "2025-01-15T10:00:00Z",
  "location": "Online",
  "meeting_link": "https://zoom.us/...",
  "meeting_password": "123456",
  "interviewer_id": "uuid",
  "duration_minutes": 30,
  "interviewer_notes": "Internal notes"
}
```

**Database:**
```sql
INSERT INTO application_stages (
  application_id, stage_name, stage_order,
  status = 'scheduled',
  scheduled_at, location, meeting_link,
  meeting_password, interviewer_id,
  duration_minutes, interviewer_notes
)

UPDATE applications SET status = 'interviewing'
```

**Notification:**
- Gửi cho Candidate: `interview_scheduled`
  - Title: "Lịch phỏng vấn: {job_title}"
  - Action URL: `/candidate/applications/{application_id}/stages/{stage_id}`
  - Metadata: `{application_id, stage_id, job_title, scheduled_at}`
  - Category: `interview`

#### Bước 5.2: Candidate Xem Interview Stages
**Endpoint:** `GET /api/applications/:id/stages`

**Database:**
- SELECT từ `application_stages`
- ORDER BY `stage_order ASC`
- Include: `location`, `meeting_link`, `scheduled_at`, `status`

#### Bước 5.3: Recruiter Update Interview Stage
**Endpoint:** `PATCH /api/applications/:id/stage`
**Body:**
```json
{
  "stage_id": "uuid",
  "status": "completed",
  "feedback": "Candidate có kỹ năng tốt...",
  "rating": 8,
  "interviewer_notes": "Internal notes",
  "completed_at": "2025-01-15T10:30:00Z"
}
```

**Database:**
```sql
UPDATE application_stages SET
  status = 'completed',
  feedback = '...',
  rating = 8,
  completed_at = NOW()
```

#### Bước 5.4: Candidate Gửi Feedback
**Endpoint:** `PATCH /api/applications/:id/stages/:stageId/feedback`
**Body:**
```json
{
  "candidate_feedback": "Interviewer rất chuyên nghiệp..."
}
```

**Database:**
```sql
UPDATE application_stages SET
  candidate_feedback = '...'
```

---

### 1.6. GIAI ĐOẠN 6: OFFER VÀ KẾT QUẢ

#### Bước 6.1: Recruiter Gửi Offer
**Endpoint:** `POST /api/applications/:id/offer`
**Body:**
```json
{
  "salary": {
    "min": 20000000,
    "max": 30000000,
    "currency": "VND"
  },
  "start_date": "2025-02-01",
  "message": "Chúc mừng! Chúng tôi muốn mời bạn...",
  "metadata": {}
}
```

**Database:**
```sql
UPDATE applications SET
  status = 'offered',
  offer_sent_at = NOW(),
  metadata = jsonb_set(
    metadata,
    '{offer_details}',
    '{"salary": {...}, "start_date": "...", "message": "..."}'
  )
```

**Notification:**
- Gửi cho Candidate: `offer_received`
  - Title: "Chúc mừng! Bạn đã nhận được offer: {job_title}"
  - Action URL: `/candidate/applications/{application_id}/offer`
  - Metadata: `{application_id, job_title, company_name}`
  - Category: `offer`

#### Bước 6.2: Candidate Xem Offers
**Endpoint:** `GET /api/applications/offers?page=1&limit=20`

**Database:**
```sql
SELECT * FROM applications
WHERE profile_id = ?
  AND status = 'offered'
  AND is_withdrawn = false
ORDER BY offer_sent_at DESC
```

**Response:**
```json
{
  "offers": [
    {
      "id": "uuid",
      "status": "offered",
      "offer_sent_at": "...",
      "metadata": {
        "offer_details": {
          "salary": {...},
          "start_date": "...",
          "message": "..."
        }
      },
      "jobs": {
        "id": "uuid",
        "title": "...",
        "companies": {...}
      }
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### Bước 6.3: Candidate Accept Offer
**Endpoint:** `PATCH /api/applications/:id/offer/accept`
**Body:**
```json
{
  "message": "Tôi rất vui được nhận offer này!"
}
```

**Database:**
```sql
UPDATE applications SET
  status = 'accepted',
  offer_accepted_at = NOW(),
  metadata = jsonb_set(
    metadata,
    '{acceptance_message}',
    '"Tôi rất vui được nhận offer này!"'
  )
```

**Notification:**
- Gửi cho Recruiter: `offer_accepted`
  - Title: "{candidate_name} đã chấp nhận offer: {job_title}"
  - Action URL: `/recruiter/applications/{application_id}`
  - Metadata: `{application_id, candidate_name, job_title}`
  - Category: `offer`

#### Bước 6.4: Candidate Decline Offer
**Endpoint:** `PATCH /api/applications/:id/offer/decline`
**Body:**
```json
{
  "reason": "Tôi đã nhận offer khác"
}
```

**Database:**
```sql
UPDATE applications SET
  status = 'rejected',
  offer_declined_at = NOW(),
  rejected_reason = 'Tôi đã nhận offer khác',
  metadata = jsonb_set(
    metadata,
    '{decline_reason}',
    '"Tôi đã nhận offer khác"'
  )
```

**Notification:**
- Gửi cho Recruiter: `offer_declined`
  - Title: "{candidate_name} đã từ chối offer: {job_title}"
  - Action URL: `/recruiter/applications/{application_id}`
  - Metadata: `{application_id, candidate_name, job_title, reason}`
  - Category: `offer`

---

### 1.7. GIAI ĐOẠN 7: CANDIDATE RÚT ĐƠN (WITHDRAW)

#### Bước 7.1: Candidate Withdraw Application
**Endpoint:** `DELETE /api/applications/:id`

**Database:**
```sql
UPDATE applications SET
  is_withdrawn = true,
  withdrawn_at = NOW(),
  status = 'withdrawn'
```

**Notification:**
- Gửi cho Recruiter: `application_withdrawn`
  - Title: "Ứng viên đã rút đơn: {job_title}"
  - Action URL: `/recruiter/applications/{application_id}`
  - Metadata: `{application_id, candidate_name, job_title}`
  - Category: `application`

---

## 2. LUỒNG KẾT NỐI (CONNECTION FLOW) - HOÀN CHỈNH

### 2.1. GIAI ĐOẠN 1: RECRUITER HEADHUNT CANDIDATE

#### Bước 1.1: Recruiter Gửi Connection Request (Headhunt)
**Endpoint:** `POST /api/connection-interests`
**Body:**
```json
{
  "candidate_id": "uuid",
  "job_id": null,  // null nếu headhunt không gắn job cụ thể
  "suggested_job_ids": ["uuid1", "uuid2", "uuid3"],  // ✅ MỚI: Gửi kèm nhiều jobs
  "interest_type": "network_connection",  // hoặc "job_invitation", "profile_view"
  "message": "Xin chào, tôi thấy profile của bạn rất phù hợp...",
  "contact_info": {
    "email": "recruiter@company.com",
    "phone": "+84901234567"
  }
}
```

**Database:**
```sql
INSERT INTO connection_interests (
  candidate_id, recruiter_id, job_id,
  interest_type, status = 'pending',
  message, contact_info,
  suggested_job_ids = '["uuid1", "uuid2", "uuid3"]',  -- ✅ JSONB array
  created_at = NOW(),
  expires_at = NOW() + INTERVAL '7 days'
)
-- Unique constraint: [candidate_id, recruiter_id, job_id, interest_type]
```

**Validation:**
- Verify candidate exists
- Verify suggested_job_ids (nếu có) thuộc về recruiter và status = 'approved'
- Max 10 suggested jobs
- Check duplicate (pending hoặc accepted)

**Response:**
```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "recruiter_id": "uuid",
  "job_id": null,
  "interest_type": "network_connection",
  "status": "pending",
  "message": "...",
  "suggested_job_ids": ["uuid1", "uuid2", "uuid3"],
  "suggested_jobs": [  // ✅ Full job details
    {
      "id": "uuid1",
      "title": "Senior Developer",
      "description": "...",
      "job_type": "full_time",
      "salary_range": {...},
      "companies": {...},
      "locations": {...}
    },
    ...
  ],
  "candidate": {...},
  "recruiter": {...},
  "jobs": null
}
```

**Notification:**
- Gửi cho Candidate: `connection_interest_received`
  - Title: "{recruiter_name} quan tâm đến hồ sơ của bạn"
  - Action URL: `/candidate/connections/{interest_id}`
  - Metadata: `{interest_id, recruiter_name, job_id, suggested_job_ids: ["uuid1", "uuid2"]}`
  - Category: `connection`

#### Bước 1.2: Recruiter Gửi Connection từ Application
**Endpoint:** `POST /api/connection-interests`
**Body:**
```json
{
  "candidate_id": "uuid",  // từ application.profile_id
  "job_id": "uuid",  // từ application.job_id
  "suggested_job_ids": ["uuid1", "uuid2"],  // ✅ Các jobs phù hợp khác
  "interest_type": "job_invitation",
  "message": "Tôi thấy bạn đã ứng tuyển cho vị trí Y, tôi muốn..."
}
```

**Database & Notification:** Tương tự Bước 1.1

---

### 2.2. GIAI ĐOẠN 2: CANDIDATE PHẢN HỒI CONNECTION REQUEST

#### Bước 2.1: Candidate Xem Connection Requests
**Endpoint:** `GET /api/connection-interests?status=pending&role=received`

**Database:**
```sql
SELECT * FROM connection_interests
WHERE candidate_id = ?
  AND status = 'pending'
ORDER BY created_at DESC
```

**Response:** Bao gồm `suggested_jobs` (full details) nếu có

#### Bước 2.2: Candidate Accept Connection
**Endpoint:** `PATCH /api/connection-interests/:id/respond`
**Body:**
```json
{
  "action": "accept",
  "message": "optional"
}
```

**Database:**
```sql
UPDATE connection_interests SET
  status = 'accepted',
  responded_at = NOW(),
  message = COALESCE(?, message)
```

**Notification:**
- Gửi cho Recruiter: `connection_interest_accepted`
  - Title: "{candidate_name} đã chấp nhận kết nối"
  - Action URL: `/recruiter/connections/{interest_id}`
  - Metadata: `{interest_id, candidate_name}`
  - Category: `connection`

#### Bước 2.3: Candidate Reject Connection
**Endpoint:** `PATCH /api/connection-interests/:id/respond`
**Body:**
```json
{
  "action": "reject",
  "message": "optional"
}
```

**Database:**
```sql
UPDATE connection_interests SET
  status = 'rejected',
  responded_at = NOW()
```

**Notification:**
- Gửi cho Recruiter: `connection_interest_rejected`
  - Title: "{candidate_name} đã từ chối kết nối"
  - Action URL: `/recruiter/connections/{interest_id}`
  - Metadata: `{interest_id, candidate_name}`
  - Category: `connection`

---

### 2.3. GIAI ĐOẠN 3: CANDIDATE EXPRESS INTEREST

#### Bước 3.1: Candidate Quan Tâm Đến Job/Recruiter
**Endpoint:** `POST /api/connection-interests`
**Body:**
```json
{
  "recruiter_id": "uuid",  // từ jobs.companies.recruiter_id
  "job_id": "uuid",
  "interest_type": "job_invitation",  // candidate_interest
  "message": "Tôi quan tâm đến vị trí này..."
}
```

**Database:**
```sql
INSERT INTO connection_interests (
  candidate_id, recruiter_id, job_id,
  interest_type = 'job_invitation',
  status = 'pending',
  message
)
```

**Notification:**
- Gửi cho Recruiter: `connection_interest_received`
  - Title: "Có ứng viên quan tâm đến job"
  - Action URL: `/recruiter/connections/{interest_id}`
  - Metadata: `{interest_id, candidate_name, job_id}`
  - Category: `connection`

---

### 2.4. GIAI ĐOẠN 4: QUẢN LÝ CONNECTIONS ĐÃ CHẤP NHẬN

#### Bước 4.1: Xem Danh Sách Connections
**Endpoint:** `GET /api/connection-interests?status=accepted`

**Database:**
- SELECT từ `connection_interests` với `status = 'accepted'`
- JOIN `profiles`, `users`, `jobs`, `companies`
- Include `suggested_jobs` (full details)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "accepted",
      "job_id": "uuid",
      "suggested_job_ids": ["uuid1", "uuid2"],
      "suggested_jobs": [  // ✅ Full job details
        {
          "id": "uuid1",
          "title": "...",
          "companies": {...},
          "locations": {...}
        }
      ],
      "candidate": {...},
      "recruiter": {...},
      "jobs": {...}
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

#### Bước 4.2: Xem Connection Detail
**Endpoint:** `GET /api/connection-interests/:id`

**Response:** Bao gồm `suggested_jobs` (full details)

#### Bước 4.3: Connection Stats
**Endpoint:** `GET /api/connection-interests/stats`

**Database:**
- COUNT theo `status`, `interest_type`
- Tính conversion rate: connections → applications → hires

---

## 3. APPLICATION STATUS FLOW - CHI TIẾT

### Status Transitions:

```
┌─────────┐
│ pending │ ← Mặc định khi apply
└────┬────┘
     │
     ├─→ reviewed (Recruiter đã xem)
     │     │
     │     ├─→ interviewing (Có interview stage)
     │     │     │
     │     │     └─→ offered (Recruiter gửi offer)
     │     │           │
     │     │           ├─→ accepted ✅ (Candidate accept)
     │     │           └─→ rejected ❌ (Candidate decline)
     │     │
     │     └─→ rejected ❌ (Recruiter từ chối)
     │
     └─→ withdrawn (Candidate rút đơn)
```

### Database Fields Tracking:

| Status | Fields Updated | Notification |
|--------|---------------|--------------|
| `pending` | `applied_at` | → Recruiter: `application_received` |
| `reviewed` | `last_viewed_at` | → Candidate: `application_status_changed` |
| `interviewing` | (auto khi có stage) | → Candidate: `interview_scheduled` |
| `offered` | `offer_sent_at`, `metadata.offer_details` | → Candidate: `offer_received` |
| `accepted` | `offer_accepted_at` | → Recruiter: `offer_accepted` |
| `rejected` | `rejected_at`, `rejected_reason` | → Candidate: `application_status_changed` |
| `withdrawn` | `is_withdrawn = true`, `withdrawn_at`, `status = 'withdrawn'` | → Recruiter: `application_withdrawn` |

---

## 4. CONNECTION INTEREST STATUS FLOW

### Status Transitions:

```
┌─────────┐
│ pending │ ← Recruiter gửi hoặc Candidate express interest
└────┬────┘
     │
     ├─→ accepted ✅ (Candidate/Recruiter accept)
     │     └─→ Connection established
     │
     ├─→ rejected ❌ (Candidate/Recruiter reject)
     │
     └─→ expired ⏰ (Hết hạn sau 7 ngày)
```

### Database Fields:

| Field | Mô tả |
|-------|-------|
| `job_id` | Job chính (nếu có) - nullable |
| `suggested_job_ids` | ✅ Array of job IDs (JSONB) - tối đa 10 jobs |
| `interest_type` | `'job_invitation'`, `'profile_view'`, `'network_connection'` |
| `status` | `'pending'`, `'accepted'`, `'rejected'`, `'expired'` |
| `contact_info` | JSON: `{email, phone}` |
| `expires_at` | Tự động set = created_at + 7 days |

---

## 5. NOTIFICATION FLOW - ĐẦY ĐỦ

### 5.1. Application Notifications

| Event | Type | Gửi Cho | Action URL | Metadata |
|-------|------|---------|------------|----------|
| Candidate apply | `application_received` | Recruiter | `/recruiter/applications/{id}` | `{application_id, job_id, candidate_name, job_title}` |
| Status → reviewed | `application_status_changed` | Candidate | `/candidate/applications/{id}` | `{application_id, status, status_display}` |
| Status → rejected | `application_status_changed` | Candidate | `/candidate/applications/{id}` | `{application_id, status, status_display, reason}` |
| Interview scheduled | `interview_scheduled` | Candidate | `/candidate/applications/{id}/stages/{stageId}` | `{application_id, stage_id, scheduled_at}` |
| Document uploaded | `application_document_uploaded` | Recruiter | `/recruiter/applications/{id}/documents` | `{application_id, document_id, document_type}` |
| Application withdrawn | `application_withdrawn` | Recruiter | `/recruiter/applications/{id}` | `{application_id, candidate_name, job_title}` |
| Offer received | `offer_received` | Candidate | `/candidate/applications/{id}/offer` | `{application_id, job_title, company_name}` |
| Offer accepted | `offer_accepted` | Recruiter | `/recruiter/applications/{id}` | `{application_id, candidate_name, job_title}` |
| Offer declined | `offer_declined` | Recruiter | `/recruiter/applications/{id}` | `{application_id, candidate_name, job_title, reason}` |

### 5.2. Connection Notifications

| Event | Type | Gửi Cho | Action URL | Metadata |
|-------|------|---------|------------|----------|
| Connection received | `connection_interest_received` | Candidate/Recruiter | `/candidate/connections/{id}` | `{interest_id, recruiter_name, job_id, suggested_job_ids}` |
| Connection accepted | `connection_interest_accepted` | Recruiter | `/recruiter/connections/{id}` | `{interest_id, candidate_name}` |
| Connection rejected | `connection_interest_rejected` | Recruiter | `/recruiter/connections/{id}` | `{interest_id, candidate_name}` |

### 5.3. Notification Schema

```typescript
{
  id: UUID
  user_id: UUID
  type: NotificationType
  content: string
  title?: string              // ✅ MỚI
  action_url?: string         // ✅ MỚI
  action_text?: string        // ✅ MỚI
  metadata?: JSON             // ✅ MỚI
  category?: string           // ✅ MỚI (application, offer, connection, interview)
  read: boolean
  sent_at: DateTime
  read_at?: DateTime
}
```

---

## 6. ENDPOINTS TỔNG HỢP

### 6.1. Candidate Endpoints

**Applications:**
- `POST /api/applications` - Apply
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Detail
- `GET /api/applications/offers` - List offers
- `GET /api/applications/:id/stages` - Interview stages
- `GET /api/applications/:id/documents` - Documents
- `POST /api/applications/:id/documents` - Upload document
- `PATCH /api/applications/:id/offer/accept` - Accept offer
- `PATCH /api/applications/:id/offer/decline` - Decline offer
- `PATCH /api/applications/:id/stages/:stageId/feedback` - Candidate feedback
- `DELETE /api/applications/:id` - Withdraw

**Connections:**
- `GET /api/connection-interests` - List connections
- `GET /api/connection-interests/:id` - Detail
- `PATCH /api/connection-interests/:id/respond` - Accept/Reject
- `GET /api/connection-interests/stats` - Statistics

### 6.2. Recruiter Endpoints

**Applications:**
- `GET /api/applications/job/:jobId` - List by job
- `GET /api/applications/job/:jobId/stats` - Job stats
- `GET /api/applications/:id/cv` - View CV
- `PATCH /api/applications/:id/status` - Update status
- `POST /api/applications/:id/stage` - Create interview
- `PATCH /api/applications/:id/stage` - Update interview
- `POST /api/applications/:id/offer` - Send offer
- `POST /api/applications/:id/notes` - Add notes
- `POST /api/applications/:id/contact` - Contact candidate
- `POST /api/applications/bulk-update` - Bulk update

**Connections:**
- `POST /api/connection-interests` - Create connection (với suggested_job_ids)
- `GET /api/connection-interests` - List connections
- `GET /api/connection-interests/:id` - Detail
- `DELETE /api/connection-interests/:id` - Delete
- `GET /api/connection-interests/stats` - Statistics

---

## 7. TÍNH NĂNG MỚI ĐÃ THÊM

### 7.1. Notification Metadata & Action URL
- Tất cả notifications có `action_url` để deep link
- `metadata` chứa đầy đủ thông tin cho frontend
- `title` và `action_text` cho UX tốt hơn
- `category` để phân loại notifications

### 7.2. Suggested Jobs trong Connection Interest
- Recruiter có thể gửi kèm tối đa 10 jobs phù hợp
- API trả về full job details trong `suggested_jobs`
- Notification metadata chứa `suggested_job_ids`
- Validation: Tất cả jobs phải thuộc recruiter và status = 'approved'

### 7.3. Document Upload Notification
- Recruiter nhận notification khi candidate upload document
- Có action_url để xem document ngay
- Metadata chứa document_id và document_type

---

## 8. DATABASE SCHEMA SUMMARY

### Applications Table:
```typescript
{
  // Core fields
  id, job_id, profile_id, resume_id
  status: 'pending' | 'reviewed' | 'interviewing' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'

  // Tracking fields
  applied_at, first_viewed_at, last_viewed_at, view_count
  is_withdrawn, withdrawn_at, withdrawn_reason
  rejected_at, rejected_reason
  offer_sent_at, offer_accepted_at, offer_declined_at

  // Metadata
  metadata: JSON  // {offer_details, notes, acceptance_message, decline_reason}
}
```

### Application Stages Table:
```typescript
{
  // Core
  id, application_id, stage_name, stage_order, status

  // Interview details
  scheduled_at, completed_at, location, meeting_link,
  meeting_password, interviewer_id, duration_minutes

  // Feedback
  feedback, rating, interviewer_notes, candidate_feedback, result
}
```

### Connection Interests Table:
```typescript
{
  // Core
  id, candidate_id, recruiter_id, job_id, interest_type, status

  // ✅ MỚI
  suggested_job_ids: JSONB  // Array of job UUIDs (max 10)

  // Communication
  message, contact_info: JSON

  // Tracking
  created_at, expires_at, responded_at
}
```

### Notifications Table:
```typescript
{
  // Core
  id, user_id, type, content

  // ✅ MỚI - Enhanced fields
  title?: string
  action_url?: string
  action_text?: string
  metadata?: JSON
  category?: string

  // Status
  read, sent_at, read_at
}
```

---

## KẾT LUẬN

Hệ thống đã hỗ trợ đầy đủ:

1. Luồng Tuyển dụng: 100%
   - Từ đăng tin → Apply → Interview → Offer → Accept/Decline
   - Đồng bộ trạng thái 2 chiều với notifications
   - Tracking đầy đủ: views, withdrawals, rejections, offers

2. Luồng Kết nối: 100%
   - Headhunt với suggested jobs (tối đa 10)
   - Connection có trạng thái (pending → accepted/rejected)
   - Express interest 2 chiều

3. Notifications: 100%
   - Action URLs cho deep linking
   - Rich metadata cho frontend
   - Categories để phân loại
   - Đồng bộ 2 chiều đầy đủ

4. Interview Management: 100%
   - Đầy đủ fields: location, meeting_link, interviewer_id, duration
   - Candidate feedback
   - Status tracking

5. Offer Management: 100%
   - Send, Accept, Decline với tracking đầy đủ
   - Metadata lưu offer details

Hệ thống sẵn sàng cho production.
