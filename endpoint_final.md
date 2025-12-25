# DANH SÁCH ENDPOINTS – JOB PORTAL API

## AUTH MODULE (/api/auth)

Method | Endpoint | Chức năng | Access
---|---|---|---
POST | /api/auth/register | Đăng ký tài khoản mới | Public
POST | /api/auth/login | Đăng nhập | Public
POST | /api/auth/logout | Đăng xuất | Private
POST | /api/auth/refresh-token | Refresh access token | Private
POST | /api/auth/resend-verify-email | Gửi lại email xác thực | Public
POST | /api/auth/verify-email | Xác thực email | Public
POST | /api/auth/forgot-password | Quên mật khẩu | Public
POST | /api/auth/verify-forgot-password | Xác thực token quên mật khẩu | Public
POST | /api/auth/reset-password | Đặt lại mật khẩu | Private
PATCH | /api/auth/change-password | Đổi mật khẩu | Private (Verified User)

## USER MODULE (/api/user)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/user/me | Lấy thông tin cơ bản user hiện tại | Private
GET | /api/user/profiles/:id/public | Xem profile công khai của candidate | Private (Recruiter)
GET | /api/user/me/profile | Lấy profile đầy đủ của user | Private (Candidate)
POST | /api/user/me/profile | Tạo profile mới | Private (Candidate)
PUT | /api/user/me/profile | Cập nhật profile | Private (Candidate)
GET | /api/user/me/profile/experiences | Lấy danh sách kinh nghiệm | Private (Candidate)
GET | /api/user/me/profile/experiences/:experienceId | Lấy chi tiết kinh nghiệm | Private (Candidate)
POST | /api/user/me/profile/experiences | Thêm kinh nghiệm | Private (Candidate)
PUT | /api/user/me/profile/experiences/:experienceId | Cập nhật kinh nghiệm | Private (Candidate)
DELETE | /api/user/me/profile/experiences/:experienceId | Xóa kinh nghiệm | Private (Candidate)
GET | /api/user/me/profile/educations | Lấy danh sách học vấn | Private (Candidate)
GET | /api/user/me/profile/educations/:educationId | Lấy chi tiết học vấn | Private (Candidate)
POST | /api/user/me/profile/educations | Thêm học vấn | Private (Candidate)
PUT | /api/user/me/profile/educations/:educationId | Cập nhật học vấn | Private (Candidate)
DELETE | /api/user/me/profile/educations/:educationId | Xóa học vấn | Private (Candidate)
GET | /api/user/me/profile/skills | Lấy danh sách kỹ năng | Private (Candidate)
GET | /api/user/me/profile/skills/:skillId | Lấy chi tiết kỹ năng | Private (Candidate)
POST | /api/user/me/profile/skills | Thêm kỹ năng | Private (Candidate)
PUT | /api/user/me/profile/skills/:skillId | Cập nhật kỹ năng | Private (Candidate)
DELETE | /api/user/me/profile/skills/:skillId | Xóa kỹ năng | Private (Candidate)
GET | /api/user/me/profile/certifications | Lấy danh sách chứng chỉ | Private (Candidate)
GET | /api/user/me/profile/certifications/:certificationId | Lấy chi tiết chứng chỉ | Private (Candidate)
POST | /api/user/me/profile/certifications | Thêm chứng chỉ | Private (Candidate)
PUT | /api/user/me/profile/certifications/:certificationId | Cập nhật chứng chỉ | Private (Candidate)
DELETE | /api/user/me/profile/certifications/:certificationId | Xóa chứng chỉ | Private (Candidate)
GET | /api/user/me/profile/awards | Lấy danh sách giải thưởng | Private (Candidate)
GET | /api/user/me/profile/awards/:awardId | Lấy chi tiết giải thưởng | Private (Candidate)
POST | /api/user/me/profile/awards | Thêm giải thưởng | Private (Candidate)
PUT | /api/user/me/profile/awards/:awardId | Cập nhật giải thưởng | Private (Candidate)
DELETE | /api/user/me/profile/awards/:awardId | Xóa giải thưởng | Private (Candidate)
PUT | /api/user/me/profile/visibility | Cập nhật visibility của profile | Private (Candidate)
GET | /api/user/me/profile/completeness | Lấy độ hoàn thiện profile | Private (Candidate)

## JOBS MODULE (/api/jobs)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/jobs | Lấy danh sách jobs active với filter | Public
GET | /api/jobs/featured | Lấy jobs nổi bật | Public
GET | /api/jobs/popular | Lấy jobs phổ biến theo view count | Public
GET | /api/jobs/trending | Lấy jobs trending theo growth rate | Public
GET | /api/jobs/popular-by-location | Lấy jobs phổ biến theo location | Public
GET | /api/jobs/latest | Lấy jobs mới nhất | Public
GET | /api/jobs/:id/public | Xem chi tiết job (public view) | Public
POST | /api/jobs/:id/view | Track job view (có thể anonymous hoặc authenticated) | Public
GET | /api/jobs/recently-viewed | Lấy jobs đã xem gần đây | Private
DELETE | /api/jobs/recently-viewed | Xóa lịch sử jobs đã xem | Private
GET | /api/jobs/recently-viewed/stats | Lấy thống kê viewing | Private
GET | /api/jobs/recommendations | Lấy job recommendations cá nhân hóa | Private
GET | /api/jobs/recommendations/for-you | Lấy "For You" recommendations | Private
POST | /api/jobs | Tạo job posting mới | Private (Recruiter)
GET | /api/jobs/my-jobs | Lấy jobs đã đăng của employer | Private (Recruiter)
GET | /api/jobs/:id/manage | Lấy job details cho management | Private (Recruiter)
GET | /api/jobs/:id/stats | Lấy job statistics (views, applications) | Private (Recruiter)
GET | /api/jobs/:id/suggested-candidates | Lấy suggested candidates cho job | Private (Recruiter)
PUT | /api/jobs/:id | Cập nhật job posting | Private (Recruiter)
PATCH | /api/jobs/:id/status | Cập nhật job status (open/close) | Private (Recruiter)
PATCH | /api/jobs/:id/publish | Publish draft job | Private (Recruiter)
POST | /api/jobs/bulk-actions | Bulk actions trên multiple jobs | Private (Recruiter)
PATCH | /api/jobs/bulk-extend | Bulk extend job expiry dates | Private (Recruiter)
DELETE | /api/jobs/:id | Soft delete job posting | Private (Recruiter)

## RESUMES MODULE (/api/resumes)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/resumes/themes | Lấy danh sách themes có sẵn | Private (Candidate)
POST | /api/resumes/from-profile | Tạo CV từ profile | Private (Candidate)
POST | /api/resumes | Tạo CV mới từ đầu | Private (Candidate)
GET | /api/resumes | Lấy danh sách CV của user | Private (Candidate)
GET | /api/resumes/:id | Lấy chi tiết CV | Private (Candidate)
PUT | /api/resumes/:id | Cập nhật CV | Private (Candidate)
PATCH | /api/resumes/:id/default | Đặt CV làm mặc định | Private (Candidate)
DELETE | /api/resumes/:id | Xóa CV | Private (Candidate)
POST | /api/resumes/upload | Upload CV file với auto parse | Private (Candidate)
GET | /api/resumes/:id/download | Download CV file | Private (Candidate)
POST | /api/resumes/:id/export | Export CV sang PDF với template | Private (Candidate)
GET | /api/resumes/:id/preview | Preview CV dạng HTML | Private (Candidate)

## COMPANIES MODULE (/api/companies)

Method | Endpoint | Chức năng | Access
---|---|---|---
POST | /api/companies | Tạo hồ sơ doanh nghiệp | Private (Recruiter)
GET | /api/companies/me | Xem hồ sơ doanh nghiệp của mình | Private (Recruiter)
PATCH | /api/companies/me | Cập nhật hồ sơ doanh nghiệp | Private (Recruiter)
GET | /api/companies/me/details | Xem thông tin chi tiết công ty | Private (Recruiter)
POST | /api/companies/me/details | Tạo thông tin chi tiết công ty | Private (Recruiter)
PATCH | /api/companies/me/details | Cập nhật thông tin chi tiết công ty | Private (Recruiter)
DELETE | /api/companies/me/details | Xóa thông tin chi tiết công ty | Private (Recruiter)
GET | /api/companies/me/benefits | Xem danh sách phúc lợi công ty | Private (Recruiter)
POST | /api/companies/me/benefits | Thêm phúc lợi cho công ty | Private (Recruiter)
PATCH | /api/companies/me/benefits/:id | Cập nhật phúc lợi công ty | Private (Recruiter)
DELETE | /api/companies/me/benefits/:id | Xóa phúc lợi công ty | Private (Recruiter)
GET | /api/companies/:id | Xem chi tiết hồ sơ doanh nghiệp | Public

## APPLICATIONS MODULE (/api/applications)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/applications/job/:jobId | Lấy tất cả applications cho job cụ thể | Private (Recruiter)
GET | /api/applications/job/:jobId/stats | Lấy application statistics cho job | Private (Recruiter)
POST | /api/applications/shortlist | Thêm/bớt candidate vào shortlist | Private (Recruiter)
GET | /api/applications/shortlisted | Lấy shortlisted candidates | Private (Recruiter)
POST | /api/applications/compare | So sánh multiple candidates | Private (Recruiter)
POST | /api/applications/bulk-update | Bulk update multiple applications | Private (Recruiter)
GET | /api/applications/:id/timeline | Lấy full application timeline | Private (Recruiter)
GET | /api/applications/:id/cv | View detailed CV của applicant | Private (Recruiter)
PATCH | /api/applications/:id/status | Cập nhật application status | Private (Recruiter)
PATCH | /api/applications/:id/stage | Cập nhật application stage | Private (Recruiter)
POST | /api/applications/:id/stage | Tạo new application stage | Private (Recruiter)
POST | /api/applications/:id/notes | Thêm internal notes | Private (Recruiter)
POST | /api/applications/:id/contact | Contact candidate via email/notification | Private (Recruiter)
POST | /api/applications | Tạo job application mới | Private (Candidate)
GET | /api/applications | Lấy list applications của user | Private (Candidate)
GET | /api/applications/:id | Lấy application details | Private (Candidate)
GET | /api/applications/:id/stages | Lấy application stages history | Private (Candidate)
GET | /api/applications/:id/documents | Lấy application documents | Private (Candidate)
POST | /api/applications/:id/documents | Upload additional document | Private (Candidate)
DELETE | /api/applications/:id | Withdraw application | Private (Candidate)
PATCH | /api/applications/:id/stages/:stageId/feedback | Submit candidate feedback | Private (Candidate)

## ADMIN MODULE (/api/admin)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/admin/users | Lấy danh sách tất cả users | Private (Admin)
GET | /api/admin/users/:userId | Lấy chi tiết user | Private (Admin)
PATCH | /api/admin/users/:userId | Cập nhật user (khóa/mở khóa, đổi role) | Private (Admin)
DELETE | /api/admin/users/:userId | Xóa vĩnh viễn user | Private (Admin)
GET | /api/admin/jobs | Lấy danh sách tất cả jobs | Private (Admin)
GET | /api/admin/jobs/pending | Lấy danh sách jobs chờ duyệt | Private (Admin)
GET | /api/admin/jobs/:id | Lấy chi tiết job (admin view) | Private (Admin)
PATCH | /api/admin/jobs/:id/approve | Duyệt job → Sync ES | Private (Admin)
PATCH | /api/admin/jobs/:id/reject | Từ chối job | Private (Admin)
PATCH | /api/admin/jobs/:id/label | Gán nhãn cho job (Hot/Urgent/Featured) | Private (Admin)
DELETE | /api/admin/jobs/:id/violation | Gỡ job vi phạm (soft delete) | Private (Admin)
POST | /api/admin/jobs/:id/restore | Khôi phục job đã xóa | Private (Admin)

## SKILLS MODULE (/api/skills)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/skills | Search và list tất cả skills cho autocomplete | Public
GET | /api/skills/categories | Lấy tất cả skill categories | Public

## UPLOADS MODULE (/api/uploads)

Method | Endpoint | Chức năng | Access
---|---|---|---
POST | /api/uploads/avatar | Upload profile avatar | Private (Candidate)
POST | /api/uploads/company-logo/:companyId | Upload company logo | Private (Recruiter)
POST | /api/uploads/resume/:profileId | Upload resume file | Private (Candidate)
POST | /api/uploads/application-document/:applicationId | Upload application document | Private (Candidate)

## SEARCH MODULE (/api/search)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/search/jobs | Search jobs | Unknown (need confirm)
GET | /api/search/suggestions | Lấy search suggestions | Unknown (need confirm)
POST | /api/search/events | Track search events | Unknown (need confirm)
GET | /api/search/recent | Lấy recent searches | Unknown (need confirm)
DELETE | /api/search/recent/:id | Xóa recent search cụ thể | Unknown (need confirm)
DELETE | /api/search/recent | Xóa tất cả recent searches | Unknown (need confirm)
GET | /api/search/popular-queries | Lấy popular search queries | Unknown (need confirm)

## LOCATIONS MODULE (/api/locations)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/locations/provinces | Lấy tất cả provinces | Public
GET | /api/locations/districts | Lấy districts theo province | Public
GET | /api/locations/search | Search locations | Public
GET | /api/locations/:id | Lấy location details | Public

## MATCHING MODULE (/api/matching)

Method | Endpoint | Chức năng | Access
---|---|---|---
POST | /api/matching/job/:jobId/candidates | Match candidates cho job | Unknown (need confirm)
POST | /api/matching/profile/:profileId/jobs | Match jobs cho profile | Unknown (need confirm)

## SAVED JOBS MODULE (/api/saved-jobs)

Method | Endpoint | Chức năng | Access
---|---|---|---
POST | /api/saved-jobs | Lưu job vào favorites | Private (Candidate)
DELETE | /api/saved-jobs/:jobId | Bỏ lưu job khỏi favorites | Private (Candidate)
GET | /api/saved-jobs | Lấy list saved jobs | Private (Candidate)
GET | /api/saved-jobs/check/:jobId | Kiểm tra job đã được lưu chưa | Private (Candidate)

## NOTIFICATIONS MODULE (/api/notifications)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/notifications/unread-count | Lấy số notification chưa đọc | Private
PATCH | /api/notifications/mark-all-read | Đánh dấu tất cả đã đọc | Private
GET | /api/notifications | Lấy list notifications có phân trang | Private
PATCH | /api/notifications/:id/read | Đánh dấu notification đã đọc | Private
DELETE | /api/notifications/:id | Xóa notification | Private
POST | /api/notifications/send-job-recommendations | Gửi job recommendations | Private
POST | /api/notifications/send-popular-job-alerts | Gửi alerts về popular jobs | Private
POST | /api/notifications/send-location-based-alerts | Gửi alerts theo location | Private
POST | /api/notifications/send-search-based-alerts | Gửi alerts theo saved searches | Private
GET | /api/notifications/enhanced-stats | Lấy thống kê enhanced notifications | Private

## CONNECTION INTERESTS MODULE (/api/connection-interests)

Method | Endpoint | Chức năng | Access
---|---|---|---
GET | /api/connection-interests/stats | Lấy connection interest statistics | Private (Candidate, Recruiter)
POST | /api/connection-interests | Tạo connection interest mới | Private (Recruiter)
GET | /api/connection-interests | Lấy list connection interests | Private (Candidate, Recruiter)
GET | /api/connection-interests/:id | Lấy connection interest details | Private (Candidate, Recruiter)
DELETE | /api/connection-interests/:id | Xóa connection interest | Private (Recruiter)

## TỔNG KẾT

- **Tổng số endpoint**: 124
- **Danh sách module đã có route**: Auth, User, Jobs, Resumes, Companies, Applications, Admin, Skills, Uploads, Search, Locations, Matching, Saved Jobs, Notifications, Connection Interests
- **Module có file route nhưng không có endpoint active**: Không có
- **Nhận xét nhanh**:
  - Module Search có một số endpoint cần xác nhận access (có thể cần auth cho recent searches)
  - Module Matching có thể cần auth và role guard cho business logic
  - Module Admin có đầy đủ CRUD operations cho user và job management
  - Module Applications được chia thành 2 phần rõ ràng: recruiter management và candidate applications
  - Module User có CRUD hoàn chỉnh cho profile management với nhiều sub-entities
  - Một số module có khả năng cần bổ sung endpoint cho use case phổ biến như bulk operations, analytics/stats
