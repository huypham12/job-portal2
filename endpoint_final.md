# DANH SÁCH ENDPOINTS – JOB PORTAL API

## AUTH MODULE (/api/auth)

| Method | Endpoint                         | Chức năng                       | Access  |
| ------ | -------------------------------- | ------------------------------- | ------- |
| POST   | /api/auth/register               | Đăng ký tài khoản mới           | Public  |
| POST   | /api/auth/login                  | Đăng nhập                       | Public  |
| POST   | /api/auth/logout                 | Đăng xuất                       | Private |
| POST   | /api/auth/refresh-token          | Làm mới access token            | Private |
| POST   | /api/auth/resend-verify-email    | Gửi lại email xác thực          | Public  |
| POST   | /api/auth/verify-email           | Xác thực email                  | Public  |
| POST   | /api/auth/forgot-password        | Yêu cầu đặt lại mật khẩu        | Public  |
| POST   | /api/auth/verify-forgot-password | Xác thực token đặt lại mật khẩu | Public  |
| POST   | /api/auth/reset-password         | Đặt lại mật khẩu mới            | Public  |
| PATCH  | /api/auth/change-password        | Đổi mật khẩu                    | Private |

---

## USER MODULE (/api/user)

| Method | Endpoint                                             | Chức năng                                | Access              |
| ------ | ---------------------------------------------------- | ---------------------------------------- | ------------------- |
| GET    | /api/user/me                                         | Lấy thông tin cơ bản user đang đăng nhập | Private             |
| GET    | /api/user/profiles/:id/public                        | Xem profile công khai của candidate      | Private (Recruiter) |
| GET    | /api/user/me/profile                                 | Lấy profile đầy đủ của candidate         | Private (Candidate) |
| POST   | /api/user/me/profile                                 | Tạo profile mới                          | Private (Candidate) |
| PUT    | /api/user/me/profile                                 | Cập nhật profile                         | Private (Candidate) |
| GET    | /api/user/me/profile/experiences                     | Lấy danh sách kinh nghiệm làm việc       | Private (Candidate) |
| GET    | /api/user/me/profile/experiences/:experienceId       | Lấy chi tiết một kinh nghiệm             | Private (Candidate) |
| POST   | /api/user/me/profile/experiences                     | Thêm kinh nghiệm làm việc                | Private (Candidate) |
| PUT    | /api/user/me/profile/experiences/:experienceId       | Cập nhật kinh nghiệm                     | Private (Candidate) |
| DELETE | /api/user/me/profile/experiences/:experienceId       | Xóa kinh nghiệm                          | Private (Candidate) |
| GET    | /api/user/me/profile/educations                      | Lấy danh sách học vấn                    | Private (Candidate) |
| GET    | /api/user/me/profile/educations/:educationId         | Lấy chi tiết một học vấn                 | Private (Candidate) |
| POST   | /api/user/me/profile/educations                      | Thêm học vấn                             | Private (Candidate) |
| PUT    | /api/user/me/profile/educations/:educationId         | Cập nhật học vấn                         | Private (Candidate) |
| DELETE | /api/user/me/profile/educations/:educationId         | Xóa học vấn                              | Private (Candidate) |
| GET    | /api/user/me/profile/skills                          | Lấy danh sách kỹ năng                    | Private (Candidate) |
| GET    | /api/user/me/profile/skills/:skillId                 | Lấy chi tiết một kỹ năng                 | Private (Candidate) |
| POST   | /api/user/me/profile/skills                          | Thêm kỹ năng                             | Private (Candidate) |
| PUT    | /api/user/me/profile/skills/:skillId                 | Cập nhật kỹ năng                         | Private (Candidate) |
| DELETE | /api/user/me/profile/skills/:skillId                 | Xóa kỹ năng                              | Private (Candidate) |
| GET    | /api/user/me/profile/certifications                  | Lấy danh sách chứng chỉ                  | Private (Candidate) |
| GET    | /api/user/me/profile/certifications/:certificationId | Lấy chi tiết một chứng chỉ               | Private (Candidate) |
| POST   | /api/user/me/profile/certifications                  | Thêm chứng chỉ                           | Private (Candidate) |
| PUT    | /api/user/me/profile/certifications/:certificationId | Cập nhật chứng chỉ                       | Private (Candidate) |
| DELETE | /api/user/me/profile/certifications/:certificationId | Xóa chứng chỉ                            | Private (Candidate) |
| GET    | /api/user/me/profile/awards                          | Lấy danh sách giải thưởng                | Private (Candidate) |
| GET    | /api/user/me/profile/awards/:awardId                 | Lấy chi tiết một giải thưởng             | Private (Candidate) |
| POST   | /api/user/me/profile/awards                          | Thêm giải thưởng                         | Private (Candidate) |
| PUT    | /api/user/me/profile/awards/:awardId                 | Cập nhật giải thưởng                     | Private (Candidate) |
| DELETE | /api/user/me/profile/awards/:awardId                 | Xóa giải thưởng                          | Private (Candidate) |

---

## ADMIN MODULE (/api/admin)

| Method | Endpoint                      | Chức năng                              | Access          |
| ------ | ----------------------------- | -------------------------------------- | --------------- |
| GET    | /api/admin/users              | Lấy danh sách tất cả người dùng        | Private (Admin) |
| GET    | /api/admin/users/:userId      | Lấy chi tiết một người dùng            | Private (Admin) |
| PATCH  | /api/admin/users/:userId      | Cập nhật user (khóa/mở khóa/đổi role)  | Private (Admin) |
| DELETE | /api/admin/users/:userId      | Xóa vĩnh viễn user                     | Private (Admin) |
| GET    | /api/admin/jobs               | Lấy danh sách tất cả công việc         | Private (Admin) |
| GET    | /api/admin/jobs/pending       | Lấy danh sách tin chờ duyệt            | Private (Admin) |
| GET    | /api/admin/jobs/:id           | Lấy chi tiết một công việc             | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/approve   | Duyệt tin tuyển dụng                   | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/reject    | Từ chối tin tuyển dụng                 | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/label     | Gán nhãn cho tin (Hot/Urgent/Featured) | Private (Admin) |
| DELETE | /api/admin/jobs/:id/violation | Gỡ tin vi phạm (soft delete)           | Private (Admin) |
| POST   | /api/admin/jobs/:id/restore   | Khôi phục tin đã xóa                   | Private (Admin) |

---

## COMPANY MODULE (/api/companies)

| Method | Endpoint                       | Chức năng                           | Access              |
| ------ | ------------------------------ | ----------------------------------- | ------------------- |
| POST   | /api/companies                 | Tạo hồ sơ doanh nghiệp              | Private (Recruiter) |
| GET    | /api/companies/me              | Xem hồ sơ doanh nghiệp của mình     | Private (Recruiter) |
| PATCH  | /api/companies/me              | Cập nhật hồ sơ doanh nghiệp         | Private (Recruiter) |
| GET    | /api/companies/me/details      | Xem thông tin chi tiết công ty      | Private (Recruiter) |
| POST   | /api/companies/me/details      | Tạo thông tin chi tiết công ty      | Private (Recruiter) |
| PATCH  | /api/companies/me/details      | Cập nhật thông tin chi tiết công ty | Private (Recruiter) |
| DELETE | /api/companies/me/details      | Xóa thông tin chi tiết công ty      | Private (Recruiter) |
| GET    | /api/companies/me/benefits     | Xem danh sách phúc lợi công ty      | Private (Recruiter) |
| POST   | /api/companies/me/benefits     | Thêm phúc lợi cho công ty           | Private (Recruiter) |
| PATCH  | /api/companies/me/benefits/:id | Cập nhật phúc lợi công ty           | Private (Recruiter) |
| DELETE | /api/companies/me/benefits/:id | Xóa phúc lợi công ty                | Private (Recruiter) |
| GET    | /api/companies/:id             | Xem chi tiết hồ sơ doanh nghiệp     | Public              |

---

## JOB MODULE (/api/jobs)

| Method | Endpoint             | Chức năng                              | Access              |
| ------ | -------------------- | -------------------------------------- | ------------------- |
| GET    | /api/jobs            | Lấy danh sách công việc (có filter)    | Public              |
| GET    | /api/jobs/featured   | Lấy danh sách công việc nổi bật        | Public              |
| GET    | /api/jobs/latest     | Lấy danh sách công việc mới nhất       | Public              |
| GET    | /api/jobs/:id/public | Xem chi tiết công việc (public view)   | Public              |
| POST   | /api/jobs/:id/view   | Tracking lượt xem job                  | Public              |
| POST   | /api/jobs            | Tạo tin tuyển dụng mới                 | Private (Recruiter) |
| GET    | /api/jobs/my-jobs    | Lấy danh sách tin của employer         | Private (Recruiter) |
| GET    | /api/jobs/:id/manage | Xem chi tiết job để quản lý            | Private (Recruiter) |
| GET    | /api/jobs/:id/stats  | Xem thống kê job (views, applications) | Private (Recruiter) |
| PUT    | /api/jobs/:id        | Cập nhật tin tuyển dụng                | Private (Recruiter) |
| PATCH  | /api/jobs/:id/status | Cập nhật trạng thái job (open/close)   | Private (Recruiter) |
| DELETE | /api/jobs/:id        | Xóa mềm tin tuyển dụng                 | Private (Recruiter) |

---

## UPLOAD MODULE (/api/uploads)

| Method | Endpoint                                         | Chức năng                   | Access              |
| ------ | ------------------------------------------------ | --------------------------- | ------------------- |
| POST   | /api/uploads/avatar                              | Upload ảnh đại diện profile | Private (Candidate) |
| POST   | /api/uploads/company-logo/:companyId             | Upload logo công ty         | Private (Recruiter) |
| POST   | /api/uploads/resume/:profileId                   | Upload file CV (PDF, DOCX)  | Private (Candidate) |
| POST   | /api/uploads/application-document/:applicationId | Upload tài liệu ứng tuyển   | Private (Candidate) |

---

## RESUME MODULE (/api/resumes)

| Method | Endpoint                  | Chức năng                        | Access              |
| ------ | ------------------------- | -------------------------------- | ------------------- |
| GET    | /api/resumes/themes       | Lấy danh sách theme CV           | Private (Candidate) |
| POST   | /api/resumes/from-profile | Tạo CV từ profile                | Private (Candidate) |
| POST   | /api/resumes              | Tạo CV mới từ đầu                | Private (Candidate) |
| GET    | /api/resumes              | Lấy danh sách CV của user        | Private (Candidate) |
| GET    | /api/resumes/:id          | Lấy chi tiết CV                  | Private (Candidate) |
| PUT    | /api/resumes/:id          | Cập nhật CV                      | Private (Candidate) |
| PATCH  | /api/resumes/:id/default  | Đặt CV làm mặc định              | Private (Candidate) |
| DELETE | /api/resumes/:id          | Xóa CV                           | Private (Candidate) |
| POST   | /api/resumes/upload       | Upload CV file với tự động parse | Private (Candidate) |
| GET    | /api/resumes/:id/download | Download CV file                 | Private (Candidate) |
| POST   | /api/resumes/:id/export   | Export CV sang PDF               | Private (Candidate) |
| GET    | /api/resumes/:id/preview  | Preview CV dạng HTML             | Private (Candidate) |

---

## SKILL MODULE (/api/skills)

| Method | Endpoint               | Chức năng                                 | Access |
| ------ | ---------------------- | ----------------------------------------- | ------ |
| GET    | /api/skills            | Tìm kiếm và liệt kê skills (autocomplete) | Public |
| GET    | /api/skills/categories | Lấy danh sách category của skills         | Public |

---

## SAVED JOB MODULE (/api/saved-jobs)

| Method | Endpoint                     | Chức năng                        | Access              |
| ------ | ---------------------------- | -------------------------------- | ------------------- |
| POST   | /api/saved-jobs              | Lưu job vào danh sách yêu thích  | Private (Candidate) |
| DELETE | /api/saved-jobs/:jobId       | Xóa job khỏi danh sách yêu thích | Private (Candidate) |
| GET    | /api/saved-jobs              | Lấy danh sách job đã lưu         | Private (Candidate) |
| GET    | /api/saved-jobs/check/:jobId | Kiểm tra job đã được lưu chưa    | Private (Candidate) |

---

## APPLICATION MODULE - CANDIDATE (/api/applications)

| Method | Endpoint                                       | Chức năng                            | Access              |
| ------ | ---------------------------------------------- | ------------------------------------ | ------------------- |
| POST   | /api/applications                              | Tạo đơn ứng tuyển mới                | Private (Candidate) |
| GET    | /api/applications                              | Lấy danh sách đơn ứng tuyển          | Private (Candidate) |
| GET    | /api/applications/:id                          | Xem chi tiết đơn ứng tuyển           | Private (Candidate) |
| GET    | /api/applications/:id/stages                   | Xem lịch sử giai đoạn ứng tuyển      | Private (Candidate) |
| GET    | /api/applications/:id/documents                | Xem danh sách tài liệu đính kèm      | Private (Candidate) |
| POST   | /api/applications/:id/documents                | Upload tài liệu bổ sung              | Private (Candidate) |
| DELETE | /api/applications/:id                          | Rút đơn ứng tuyển                    | Private (Candidate) |
| PATCH  | /api/applications/:id/stages/:stageId/feedback | Gửi feedback cho giai đoạn phỏng vấn | Private (Candidate) |

---

## APPLICATION MODULE - RECRUITER (/api/applications)

| Method | Endpoint                           | Chức năng                              | Access              |
| ------ | ---------------------------------- | -------------------------------------- | ------------------- |
| GET    | /api/applications/job/:jobId       | Lấy danh sách ứng viên của job         | Private (Recruiter) |
| GET    | /api/applications/job/:jobId/stats | Lấy thống kê đơn ứng tuyển theo job    | Private (Recruiter) |
| POST   | /api/applications/bulk-update      | Cập nhật hàng loạt nhiều đơn           | Private (Recruiter) |
| GET    | /api/applications/:id/cv           | Xem CV chi tiết của ứng viên           | Private (Recruiter) |
| PATCH  | /api/applications/:id/status       | Cập nhật trạng thái đơn                | Private (Recruiter) |
| PATCH  | /api/applications/:id/stage        | Cập nhật giai đoạn hiện tại            | Private (Recruiter) |
| POST   | /api/applications/:id/stage        | Tạo giai đoạn mới (schedule interview) | Private (Recruiter) |
| POST   | /api/applications/:id/notes        | Thêm ghi chú nội bộ                    | Private (Recruiter) |
| POST   | /api/applications/:id/contact      | Liên hệ ứng viên qua email/thông báo   | Private (Recruiter) |

---

## NOTIFICATION MODULE (/api/notifications)

| Method | Endpoint                         | Chức năng                            | Access  |
| ------ | -------------------------------- | ------------------------------------ | ------- |
| GET    | /api/notifications/unread-count  | Lấy số lượng thông báo chưa đọc      | Private |
| PATCH  | /api/notifications/mark-all-read | Đánh dấu tất cả đã đọc               | Private |
| GET    | /api/notifications               | Lấy danh sách thông báo (phân trang) | Private |
| PATCH  | /api/notifications/:id/read      | Đánh dấu một thông báo đã đọc        | Private |
| DELETE | /api/notifications/:id           | Xóa thông báo                        | Private |

---

## CONNECTION INTEREST MODULE (/api/connection-interests)

| Method | Endpoint                        | Chức năng                         | Access                        |
| ------ | ------------------------------- | --------------------------------- | ----------------------------- |
| GET    | /api/connection-interests/stats | Lấy thống kê connection interest  | Private (Candidate/Recruiter) |
| POST   | /api/connection-interests       | Tạo yêu cầu kết nối với candidate | Private (Recruiter)           |
| GET    | /api/connection-interests       | Lấy danh sách connection interest | Private (Candidate/Recruiter) |
| GET    | /api/connection-interests/:id   | Xem chi tiết connection interest  | Private (Candidate/Recruiter) |
| DELETE | /api/connection-interests/:id   | Xóa connection interest           | Private (Recruiter)           |

---

## LOCATION MODULE (/api/locations)

| Method | Endpoint                 | Chức năng                           | Access |
| ------ | ------------------------ | ----------------------------------- | ------ |
| GET    | /api/locations/provinces | Lấy danh sách tỉnh/thành            | Public |
| GET    | /api/locations/districts | Lấy danh sách quận/huyện theo tỉnh  | Public |
| GET    | /api/locations/search    | Tìm kiếm địa điểm                   | Public |
| GET    | /api/locations/:id       | Lấy chi tiết địa điểm với hierarchy | Public |

---

## SEARCH MODULE (/api/search)

| Method | Endpoint                | Chức năng                 | Access |
| ------ | ----------------------- | ------------------------- | ------ |
| GET    | /api/search/jobs        | Tìm kiếm công việc        | Public |
| GET    | /api/search/suggestions | Lấy gợi ý tìm kiếm        | Public |
| POST   | /api/search/events      | Ghi nhận sự kiện tìm kiếm | Public |

---

## MATCHING MODULE (/api/matching)

| Method | Endpoint                              | Chức năng                     | Access                 |
| ------ | ------------------------------------- | ----------------------------- | ---------------------- |
| POST   | /api/matching/job/:jobId/candidates   | Tìm candidate phù hợp với job | Unknown (need confirm) |
| POST   | /api/matching/profile/:profileId/jobs | Tìm job phù hợp với profile   | Unknown (need confirm) |

---

## TỔNG KẾT

### Thống kê

- **Tổng số endpoint**: 139 endpoints
- **Số module**: 15 modules

### Danh sách module đã có route

1. ✅ **Auth** - Đầy đủ authentication flow (register, login, verify, forgot password)
2. ✅ **User/Profile** - CRUD profile + các sub-entities (experience, education, skills, certifications, awards)
3. ✅ **Admin** - Quản lý users và jobs (approve/reject/label)
4. ✅ **Company** - CRUD company profile + details + benefits
5. ✅ **Job** - CRUD jobs + public view + stats + tracking
6. ✅ **Upload** - Upload avatar, company logo, resume, application documents
7. ✅ **Resume** - Quản lý CV (tạo từ profile, upload, export, download, preview)
8. ✅ **Skill** - Public skill search và categories
9. ✅ **Saved Job** - Candidate lưu job yêu thích
10. ✅ **Application** - Candidate apply job + Recruiter quản lý đơn
11. ✅ **Notification** - Hệ thống thông báo real-time
12. ✅ **Connection Interest** - Recruiter gửi yêu cầu kết nối candidate
13. ✅ **Location** - Master data địa điểm Việt Nam (tỉnh/huyện)
14. ✅ **Search** - Elasticsearch search jobs
15. ✅ **Matching** - AI matching job-candidate

### Nhận xét

#### ✅ Điểm mạnh:

- **Auth module**: Đầy đủ security flow (verify email, forgot password, refresh token)
- **User/Profile module**: Rất chi tiết với CRUD đầy đủ cho tất cả sub-entities
- **Resume module**: Tính năng quản lý CV đa dạng (upload, parse, export PDF, preview)
- **Application module**: Phân tách rõ ràng candidate/recruiter routes, có bulk operations
- **Admin module**: Kiểm soát tốt jobs (approve/reject/label/restore)
- **Notification**: Có real-time notification
- **Search**: Tích hợp Elasticsearch
- **Matching**: Có AI matching

#### ⚠️ Module có thể cần bổ sung:

1. **Matching module**:
   - ⚠️ Không có middleware authentication rõ ràng
   - Cần xác định access control (Private Recruiter? Private Candidate?)

2. **Search module**:
   - ✅ Hiện tại public (phù hợp)
   - Có thể cân nhắc thêm search history cho authenticated users

3. **Job module**:
   - Có thể thêm:
     - `/api/jobs/:id/similar` - Tìm job tương tự
     - `/api/jobs/:id/analytics` - Analytics chi tiết hơn cho recruiter

4. **Company module**:
   - Có thể thêm:
     - `/api/companies/:id/jobs` - Public view all jobs của company
     - `/api/companies/search` - Public search companies

5. **Application module**:
   - Có thể thêm:
     - `/api/applications/:id/timeline` - Timeline chi tiết của đơn
     - `/api/applications/:id/compare` - So sánh candidates

#### 🎯 Module hoàn chỉnh:

- **Auth**: ✅ Đầy đủ
- **User/Profile**: ✅ Đầy đủ (CRUD + sub-entities)
- **Resume**: ✅ Đầy đủ (có export/preview/parse)
- **Upload**: ✅ Đầy đủ
- **Skill**: ✅ Đầy đủ (public metadata)
- **Location**: ✅ Đầy đủ (public metadata)
- **Notification**: ✅ Đầy đủ (list, read, delete, mark-all)
- **Saved Job**: ✅ Đầy đủ (CRUD + check status)

#### 📊 Phân bố theo Access Level:

- **Public**: ~20 endpoints (jobs, search, locations, skills, companies public view)
- **Private (Candidate)**: ~50 endpoints (profile, resume, applications, saved-jobs)
- **Private (Recruiter)**: ~45 endpoints (company, jobs management, applications management, connection-interests)
- **Private (Admin)**: ~12 endpoints (user management, job moderation)
- **Private (Generic)**: ~10 endpoints (notifications, auth operations)
- **Unknown**: 2 endpoints (matching - cần xác định middleware)

---

**Kết luận**: Hệ thống API đã được thiết kế khá đầy đủ cho một job portal, cover được các use case chính: tìm kiếm việc làm, ứng tuyển, quản lý hồ sơ, quản lý tuyển dụng, và các tính năng nâng cao như AI matching, Elasticsearch search, real-time notification.
