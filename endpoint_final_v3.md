# DANH SÁCH ENDPOINTS – JOB PORTAL API

## AUTH (/api/auth)

| Method | Endpoint                         | Chức năng                    | Access                        |
| ------ | -------------------------------- | ---------------------------- | ----------------------------- |
| POST   | /api/auth/register               | Đăng ký tài khoản mới        | Public                        |
| POST   | /api/auth/login                  | Đăng nhập tài khoản          | Public                        |
| POST   | /api/auth/logout                 | Đăng xuất tài khoản          | Private                       |
| POST   | /api/auth/refresh-token          | Làm mới access token         | Private                       |
| POST   | /api/auth/resend-verify-email    | Gửi lại email xác thực       | Public                        |
| POST   | /api/auth/verify-email           | Xác thực email               | Public                        |
| POST   | /api/auth/forgot-password        | Quên mật khẩu                | Public                        |
| POST   | /api/auth/verify-forgot-password | Xác thực token quên mật khẩu | Public                        |
| POST   | /api/auth/reset-password         | Đặt lại mật khẩu             | Private                       |
| PATCH  | /api/auth/change-password        | Đổi mật khẩu                 | Private (Candidate/Recruiter) |

## USER (/api/user)

| Method | Endpoint                                             | Chức năng                           | Access              |
| ------ | ---------------------------------------------------- | ----------------------------------- | ------------------- |
| GET    | /api/user/me                                         | Lấy thông tin user hiện tại         | Private (Candidate) |
| GET    | /api/user/profiles/:id/public                        | Xem profile công khai của candidate | Private (Recruiter) |
| GET    | /api/user/me/profile                                 | Lấy thông tin profile đầy đủ        | Private (Candidate) |
| POST   | /api/user/me/profile                                 | Tạo profile mới                     | Private (Candidate) |
| PUT    | /api/user/me/profile                                 | Cập nhật profile                    | Private (Candidate) |
| GET    | /api/user/me/profile/experiences                     | Lấy danh sách kinh nghiệm           | Private (Candidate) |
| GET    | /api/user/me/profile/experiences/:experienceId       | Lấy chi tiết kinh nghiệm            | Private (Candidate) |
| POST   | /api/user/me/profile/experiences                     | Thêm kinh nghiệm mới                | Private (Candidate) |
| PUT    | /api/user/me/profile/experiences/:experienceId       | Cập nhật kinh nghiệm                | Private (Candidate) |
| DELETE | /api/user/me/profile/experiences/:experienceId       | Xóa kinh nghiệm                     | Private (Candidate) |
| GET    | /api/user/me/profile/educations                      | Lấy danh sách học vấn               | Private (Candidate) |
| GET    | /api/user/me/profile/educations/:educationId         | Lấy chi tiết học vấn                | Private (Candidate) |
| POST   | /api/user/me/profile/educations                      | Thêm học vấn mới                    | Private (Candidate) |
| PUT    | /api/user/me/profile/educations/:educationId         | Cập nhật học vấn                    | Private (Candidate) |
| DELETE | /api/user/me/profile/educations/:educationId         | Xóa học vấn                         | Private (Candidate) |
| GET    | /api/user/me/profile/skills                          | Lấy danh sách kỹ năng               | Private (Candidate) |
| GET    | /api/user/me/profile/skills/:skillId                 | Lấy chi tiết kỹ năng                | Private (Candidate) |
| POST   | /api/user/me/profile/skills                          | Thêm kỹ năng mới                    | Private (Candidate) |
| PUT    | /api/user/me/profile/skills/:skillId                 | Cập nhật kỹ năng                    | Private (Candidate) |
| DELETE | /api/user/me/profile/skills/:skillId                 | Xóa kỹ năng                         | Private (Candidate) |
| GET    | /api/user/me/profile/certifications                  | Lấy danh sách chứng chỉ             | Private (Candidate) |
| GET    | /api/user/me/profile/certifications/:certificationId | Lấy chi tiết chứng chỉ              | Private (Candidate) |
| POST   | /api/user/me/profile/certifications                  | Thêm chứng chỉ mới                  | Private (Candidate) |
| PUT    | /api/user/me/profile/certifications/:certificationId | Cập nhật chứng chỉ                  | Private (Candidate) |
| DELETE | /api/user/me/profile/certifications/:certificationId | Xóa chứng chỉ                       | Private (Candidate) |
| GET    | /api/user/me/profile/awards                          | Lấy danh sách giải thưởng           | Private (Candidate) |
| GET    | /api/user/me/profile/awards/:awardId                 | Lấy chi tiết giải thưởng            | Private (Candidate) |
| POST   | /api/user/me/profile/awards                          | Thêm giải thưởng mới                | Private (Candidate) |
| PUT    | /api/user/me/profile/awards/:awardId                 | Cập nhật giải thưởng                | Private (Candidate) |
| DELETE | /api/user/me/profile/awards/:awardId                 | Xóa giải thưởng                     | Private (Candidate) |
| PUT    | /api/user/me/profile/visibility                      | Cập nhật visibility profile         | Private (Candidate) |
| GET    | /api/user/me/profile/completeness                    | Lấy độ hoàn thiện profile           | Private (Candidate) |

## ADMIN (/api/admin)

| Method | Endpoint                      | Chức năng                              | Access          |
| ------ | ----------------------------- | -------------------------------------- | --------------- |
| GET    | /api/admin/users              | Lấy danh sách tất cả users             | Private (Admin) |
| GET    | /api/admin/users/:userId      | Lấy chi tiết user                      | Private (Admin) |
| PATCH  | /api/admin/users/:userId      | Cập nhật user (khóa/mở khóa, đổi role) | Private (Admin) |
| DELETE | /api/admin/users/:userId      | Xóa user vĩnh viễn                     | Private (Admin) |
| GET    | /api/admin/jobs               | Lấy danh sách tất cả jobs              | Private (Admin) |
| GET    | /api/admin/jobs/pending       | Lấy danh sách jobs chờ duyệt           | Private (Admin) |
| GET    | /api/admin/jobs/:id           | Lấy chi tiết job                       | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/approve   | Duyệt job                              | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/reject    | Từ chối job                            | Private (Admin) |
| PATCH  | /api/admin/jobs/:id/label     | Gán nhãn cho job                       | Private (Admin) |
| DELETE | /api/admin/jobs/:id/violation | Gỡ job vi phạm                         | Private (Admin) |
| POST   | /api/admin/jobs/:id/restore   | Khôi phục job đã xóa                   | Private (Admin) |

## COMPANIES (/api/companies)

| Method | Endpoint                       | Chức năng                           | Access              |
| ------ | ------------------------------ | ----------------------------------- | ------------------- |
| POST   | /api/companies                 | Tạo hồ sơ doanh nghiệp              | Private (Recruiter) |
| GET    | /api/companies/me              | Lấy hồ sơ doanh nghiệp của mình     | Private (Recruiter) |
| PATCH  | /api/companies/me              | Cập nhật hồ sơ doanh nghiệp         | Private (Recruiter) |
| GET    | /api/companies/me/details      | Lấy thông tin chi tiết công ty      | Private (Recruiter) |
| POST   | /api/companies/me/details      | Tạo thông tin chi tiết công ty      | Private (Recruiter) |
| PATCH  | /api/companies/me/details      | Cập nhật thông tin chi tiết công ty | Private (Recruiter) |
| DELETE | /api/companies/me/details      | Xóa thông tin chi tiết công ty      | Private (Recruiter) |
| GET    | /api/companies/me/benefits     | Lấy danh sách phúc lợi công ty      | Private (Recruiter) |
| POST   | /api/companies/me/benefits     | Thêm phúc lợi công ty               | Private (Recruiter) |
| PATCH  | /api/companies/me/benefits/:id | Cập nhật phúc lợi công ty           | Private (Recruiter) |
| DELETE | /api/companies/me/benefits/:id | Xóa phúc lợi công ty                | Private (Recruiter) |
| GET    | /api/companies/:id             | Lấy thông tin công ty công khai     | Public              |

## JOBS (/api/jobs)

| Method | Endpoint               | Chức năng                    | Access              |
| ------ | ---------------------- | ---------------------------- | ------------------- |
| GET    | /api/jobs/:id/public   | Lấy chi tiết job công khai   | Public              |
| POST   | /api/jobs/:id/view     | Theo dõi lượt xem job        | Public              |
| POST   | /api/jobs              | Tạo job mới                  | Private (Recruiter) |
| GET    | /api/jobs/my-jobs      | Lấy danh sách jobs đã đăng   | Private (Recruiter) |
| GET    | /api/jobs/:id/manage   | Lấy chi tiết job để quản lý  | Private (Recruiter) |
| GET    | /api/jobs/:id/stats    | Lấy thống kê job             | Private (Recruiter) |
| PUT    | /api/jobs/:id          | Cập nhật job                 | Private (Recruiter) |
| PATCH  | /api/jobs/:id/status   | Cập nhật trạng thái job      | Private (Recruiter) |
| POST   | /api/jobs/bulk-actions | Thao tác hàng loạt trên jobs | Private (Recruiter) |
| PATCH  | /api/jobs/bulk-extend  | Gia hạn hàng loạt jobs       | Private (Recruiter) |
| DELETE | /api/jobs/:id          | Xóa job                      | Private (Recruiter) |

## APPLICATIONS (/api/applications)

| Method | Endpoint                                                            | Chức năng                            | Access              |
| ------ | ------------------------------------------------------------------- | ------------------------------------ | ------------------- |
| POST   | /api/applications/candidate                                         | Tạo application mới                  | Private (Candidate) |
| GET    | /api/applications/candidate                                         | Lấy danh sách applications           | Private (Candidate) |
| GET    | /api/applications/candidate/:applicationId                          | Lấy chi tiết application             | Private (Candidate) |
| GET    | /api/applications/candidate/:applicationId/stages                   | Lấy lịch sử stages của application   | Private (Candidate) |
| GET    | /api/applications/candidate/:applicationId/documents                | Lấy documents của application        | Private (Candidate) |
| POST   | /api/applications/candidate/:applicationId/documents                | Upload document bổ sung              | Private (Candidate) |
| DELETE | /api/applications/candidate/:applicationId                          | Rút application                      | Private (Candidate) |
| PATCH  | /api/applications/candidate/:applicationId/stages/:stageId/feedback | Gửi feedback cho interview stage     | Private (Candidate) |
| GET    | /api/applications/job/:jobId                                        | Lấy applications cho job cụ thể      | Private (Recruiter) |
| GET    | /api/applications/job/:jobId/stats                                  | Lấy thống kê applications cho job    | Private (Recruiter) |
| POST   | /api/applications/shortlist                                         | Thêm/bỏ candidate khỏi shortlist     | Private (Recruiter) |
| GET    | /api/applications/shortlisted                                       | Lấy danh sách shortlisted candidates | Private (Recruiter) |
| POST   | /api/applications/compare                                           | So sánh candidates                   | Private (Recruiter) |
| POST   | /api/applications/bulk-update                                       | Cập nhật hàng loạt applications      | Private (Recruiter) |
| GET    | /api/applications/:applicationId/timeline                           | Lấy timeline đầy đủ của application  | Private (Recruiter) |
| GET    | /api/applications/:applicationId/cv                                 | Xem CV chi tiết của applicant        | Private (Recruiter) |
| GET    | /api/applications/:applicationId                                    | Lấy chi tiết application (Recruiter) | Private (Recruiter) |
| PATCH  | /api/applications/:applicationId/status                             | Cập nhật trạng thái application      | Private (Recruiter) |
| PATCH  | /api/applications/:applicationId/stage                              | Cập nhật stage hiện tại              | Private (Recruiter) |
| POST   | /api/applications/:applicationId/stage                              | Tạo stage mới                        | Private (Recruiter) |
| POST   | /api/applications/:applicationId/notes                              | Thêm ghi chú nội bộ                  | Private (Recruiter) |
| POST   | /api/applications/:applicationId/contact                            | Liên hệ candidate                    | Private (Recruiter) |

## SEARCH (/api/search)

| Method | Endpoint                               | Chức năng                       | Access  |
| ------ | -------------------------------------- | ------------------------------- | ------- |
| GET    | /api/search/jobs/list                  | Lấy danh sách jobs cơ bản       | Public  |
| GET    | /api/search/jobs/featured              | Lấy jobs nổi bật                | Public  |
| GET    | /api/search/jobs/popular               | Lấy jobs phổ biến               | Public  |
| GET    | /api/search/jobs/trending              | Lấy jobs đang trending          | Public  |
| GET    | /api/search/jobs/popular-by-location   | Lấy jobs phổ biến theo địa điểm | Public  |
| GET    | /api/search/jobs/latest                | Lấy jobs mới nhất               | Public  |
| GET    | /api/search/jobs/recently-viewed       | Lấy jobs đã xem gần đây         | Private |
| DELETE | /api/search/jobs/recently-viewed       | Xóa lịch sử xem jobs            | Private |
| GET    | /api/search/jobs/recently-viewed/stats | Thống kê lượt xem               | Private |
| GET    | /api/search/jobs                       | Tìm kiếm jobs nâng cao          | Public  |
| GET    | /api/search/suggestions                | Gợi ý tìm kiếm                  | Public  |
| POST   | /api/search/events                     | Ghi nhận sự kiện tìm kiếm       | Public  |
| GET    | /api/search/recent                     | Lịch sử tìm kiếm cá nhân        | Private |
| DELETE | /api/search/recent/:id                 | Xóa lịch sử tìm kiếm cụ thể     | Private |
| DELETE | /api/search/recent                     | Xóa tất cả lịch sử tìm kiếm     | Private |
| GET    | /api/search/popular-queries            | Lấy queries phổ biến            | Public  |
| GET    | /api/search/companies                  | Tìm kiếm công ty                | Public  |
| GET    | /api/search/companies/suggestions      | Gợi ý tìm kiếm công ty          | Public  |
| GET    | /api/search/companies/popular          | Lấy công ty phổ biến            | Public  |

## RESUMES (/api/resumes)

| Method | Endpoint                  | Chức năng                   | Access              |
| ------ | ------------------------- | --------------------------- | ------------------- |
| GET    | /api/resumes/themes       | Lấy danh sách themes có sẵn | Private (Candidate) |
| POST   | /api/resumes/from-profile | Tạo CV từ profile           | Private (Candidate) |
| POST   | /api/resumes              | Tạo CV mới từ đầu           | Private (Candidate) |
| GET    | /api/resumes              | Lấy danh sách CV            | Private (Candidate) |
| GET    | /api/resumes/:id          | Lấy chi tiết CV             | Private (Candidate) |
| PUT    | /api/resumes/:id          | Cập nhật CV                 | Private (Candidate) |
| PATCH  | /api/resumes/:id/default  | Đặt CV làm mặc định         | Private (Candidate) |
| DELETE | /api/resumes/:id          | Xóa CV                      | Private (Candidate) |
| POST   | /api/resumes/upload       | Upload file CV              | Private (Candidate) |
| GET    | /api/resumes/:id/download | Download file CV            | Private (Candidate) |
| POST   | /api/resumes/:id/export   | Export CV sang PDF          | Private (Candidate) |
| GET    | /api/resumes/:id/preview  | Preview CV dạng HTML        | Private (Candidate) |

## SAVED-JOBS (/api/saved-jobs)

| Method | Endpoint                     | Chức năng                 | Access              |
| ------ | ---------------------------- | ------------------------- | ------------------- |
| POST   | /api/saved-jobs              | Lưu job vào favorites     | Private (Candidate) |
| DELETE | /api/saved-jobs/:jobId       | Bỏ lưu job khỏi favorites | Private (Candidate) |
| GET    | /api/saved-jobs              | Lấy danh sách saved jobs  | Private (Candidate) |
| GET    | /api/saved-jobs/check/:jobId | Kiểm tra job đã lưu chưa  | Private (Candidate) |

## UPLOADS (/api/uploads)

| Method | Endpoint                                         | Chức năng                       | Access              |
| ------ | ------------------------------------------------ | ------------------------------- | ------------------- |
| POST   | /api/uploads/avatar                              | Upload avatar profile           | Private (Candidate) |
| POST   | /api/uploads/company-logo/:companyId             | Upload logo công ty             | Private (Recruiter) |
| POST   | /api/uploads/resume/:profileId                   | Upload file CV                  | Private (Candidate) |
| POST   | /api/uploads/application-document/:applicationId | Upload document cho application | Private (Candidate) |

## NOTIFICATIONS (/api/notifications)

| Method | Endpoint                                      | Chức năng                       | Access              |
| ------ | --------------------------------------------- | ------------------------------- | ------------------- |
| GET    | /api/notifications/unread-count               | Lấy số lượng thông báo chưa đọc | Private             |
| PATCH  | /api/notifications/mark-all-read              | Đánh dấu tất cả đã đọc          | Private             |
| GET    | /api/notifications                            | Lấy danh sách thông báo         | Private             |
| PATCH  | /api/notifications/:id/read                   | Đánh dấu thông báo đã đọc       | Private             |
| DELETE | /api/notifications/:id                        | Xóa thông báo                   | Private             |
| POST   | /api/notifications/send-popular-job-alerts    | Gửi alerts về jobs phổ biến     | Private (Admin)     |
| POST   | /api/notifications/send-location-based-alerts | Gửi alerts theo địa điểm        | Private (Recruiter) |
| POST   | /api/notifications/send-search-based-alerts   | Gửi alerts theo tìm kiếm        | Private (Recruiter) |
| GET    | /api/notifications/enhanced-stats             | Thống kê enhanced notifications | Private (Admin)     |

## SKILLS (/api/skills)

| Method | Endpoint               | Chức năng                  | Access |
| ------ | ---------------------- | -------------------------- | ------ |
| GET    | /api/skills            | Tìm kiếm và liệt kê skills | Public |
| GET    | /api/skills/categories | Lấy categories của skills  | Public |

## CATEGORIES (/api/categories)

| Method | Endpoint                | Chức năng                | Access |
| ------ | ----------------------- | ------------------------ | ------ |
| GET    | /api/categories         | Lấy tất cả categories    | Public |
| GET    | /api/categories/grouped | Lấy categories theo nhóm | Public |

## LOCATIONS (/api/locations)

| Method | Endpoint                 | Chức năng                          | Access |
| ------ | ------------------------ | ---------------------------------- | ------ |
| GET    | /api/locations/provinces | Lấy danh sách tỉnh/thành           | Public |
| GET    | /api/locations/districts | Lấy danh sách quận/huyện theo tỉnh | Public |
| GET    | /api/locations/search    | Tìm kiếm locations                 | Public |
| GET    | /api/locations/:id       | Lấy chi tiết location              | Public |

## CONNECTION-INTERESTS (/api/connection-interests)

| Method | Endpoint                        | Chức năng                          | Access                        |
| ------ | ------------------------------- | ---------------------------------- | ----------------------------- |
| GET    | /api/connection-interests/stats | Lấy thống kê connection interests  | Private (Candidate/Recruiter) |
| POST   | /api/connection-interests       | Tạo connection interest mới        | Private (Recruiter)           |
| GET    | /api/connection-interests       | Lấy danh sách connection interests | Private (Candidate/Recruiter) |
| GET    | /api/connection-interests/:id   | Lấy chi tiết connection interest   | Private (Candidate/Recruiter) |
| DELETE | /api/connection-interests/:id   | Xóa connection interest            | Private (Recruiter)           |

## MATCHING (/api/matching)

| Method | Endpoint                            | Chức năng                      | Access              |
| ------ | ----------------------------------- | ------------------------------ | ------------------- |
| GET    | /api/matching/job/:jobId/candidates | Lấy candidates phù hợp cho job | Private (Recruiter) |

## SYNC (/api/sync)

| Method | Endpoint                              | Chức năng                   | Access          |
| ------ | ------------------------------------- | --------------------------- | --------------- |
| GET    | /api/sync/status                      | Lấy thống kê sync           | Private (Admin) |
| POST   | /api/sync/retry                       | Retry tất cả sync thất bại  | Private (Admin) |
| POST   | /api/sync/retry/:entityType/:entityId | Retry sync entity cụ thể    | Private (Admin) |
| POST   | /api/sync/cleanup                     | Dọn dẹp records cũ          | Private (Admin) |
| GET    | /api/sync/failed-summary              | Thống kê sync thất bại      | Private (Admin) |
| GET    | /api/sync/consistency                 | Validate consistency DB-ES  | Private (Admin) |
| POST   | /api/sync/fix-consistency             | Auto-fix consistency issues | Private (Admin) |

## HEALTH (/api/health)

| Method | Endpoint    | Chức năng             | Access |
| ------ | ----------- | --------------------- | ------ |
| GET    | /api/health | Health check endpoint | Public |

## TỔNG KẾT

- **Tổng số endpoint**: 147
- **Danh sách module đã có route**:
  - AUTH (10 endpoints)
  - USER (32 endpoints)
  - ADMIN (11 endpoints)
  - COMPANIES (10 endpoints)
  - JOBS (10 endpoints)
  - APPLICATIONS (20 endpoints)
  - SEARCH (19 endpoints)
  - RESUMES (10 endpoints)
  - SAVED-JOBS (4 endpoints)
  - UPLOADS (4 endpoints)
  - NOTIFICATIONS (10 endpoints)
  - SKILLS (2 endpoints)
  - CATEGORIES (2 endpoints)
  - LOCATIONS (4 endpoints)
  - CONNECTION-INTERESTS (5 endpoints)
  - MATCHING (1 endpoint)
  - SYNC (7 endpoints)
  - HEALTH (1 endpoint)

- **Module có file route nhưng không có endpoint active**: Không có

- **Nhận xét nhanh**:
  - **Module có dấu hiệu thiếu nghiệp vụ**: CONNECTION-INTERESTS (chỉ có 5 endpoints cơ bản)
  - **Module chỉ có CRUD cơ bản**: SKILLS, CATEGORIES, LOCATIONS (chỉ có read operations)
  - **Module có khả năng cần bổ sung endpoint cho use case phổ biến**: SEARCH (đã khá đầy đủ), NOTIFICATIONS (có thể thêm push notifications), MATCHING (có thể mở rộng logic matching)
