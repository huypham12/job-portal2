# DANH SÁCH TẤT CẢ ENDPOINTS - JOB PORTAL API

---

## **1. AUTHENTICATION (`/api/auth`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | Public |
| POST | `/api/auth/login` | Đăng nhập | Public |
| POST | `/api/auth/logout` | Đăng xuất | Private |
| POST | `/api/auth/refresh-token` | Làm mới access token | Private |
| POST | `/api/auth/resend-verify-email` | Gửi lại email xác thực | Public |
| POST | `/api/auth/verify-email` | Xác thực email | Public |
| POST | `/api/auth/forgot-password` | Quên mật khẩu | Public |
| POST | `/api/auth/verify-forgot-password` | Xác thực token quên mật khẩu | Public |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu mới | Public |
| PATCH | `/api/auth/change-password` | Đổi mật khẩu | Private (Verified) |

---

## **2. USER PROFILE (`/api/user`)**

### **2.1. Main User Data**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me` | Lấy thông tin user hiện tại | Private |

### **2.2. Public Profile**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/profiles/:id/public` | Xem profile công khai của candidate | Private (Recruiter) |

### **2.3. Profile Management**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile` | Lấy profile đầy đủ với tất cả sub-entities | Private (Candidate) |
| POST | `/api/user/me/profile` | Tạo profile mới | Private (Candidate) |
| PUT | `/api/user/me/profile` | Cập nhật profile chính | Private (Candidate) |

### **2.4. Profile Experiences**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile/experiences` | Lấy danh sách kinh nghiệm (có pagination) | Private (Candidate) |
| GET | `/api/user/me/profile/experiences/:experienceId` | Lấy chi tiết một kinh nghiệm | Private (Candidate) |
| POST | `/api/user/me/profile/experiences` | Tạo kinh nghiệm mới | Private (Candidate) |
| PUT | `/api/user/me/profile/experiences/:experienceId` | Cập nhật kinh nghiệm | Private (Candidate) |
| DELETE | `/api/user/me/profile/experiences/:experienceId` | Xóa kinh nghiệm | Private (Candidate) |

### **2.5. Profile Educations**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile/educations` | Lấy danh sách học vấn (có pagination) | Private (Candidate) |
| GET | `/api/user/me/profile/educations/:educationId` | Lấy chi tiết một học vấn | Private (Candidate) |
| POST | `/api/user/me/profile/educations` | Tạo học vấn mới | Private (Candidate) |
| PUT | `/api/user/me/profile/educations/:educationId` | Cập nhật học vấn | Private (Candidate) |
| DELETE | `/api/user/me/profile/educations/:educationId` | Xóa học vấn | Private (Candidate) |

### **2.6. Profile Skills**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile/skills` | Lấy danh sách kỹ năng (có pagination) | Private (Candidate) |
| GET | `/api/user/me/profile/skills/:skillId` | Lấy chi tiết một kỹ năng | Private (Candidate) |
| POST | `/api/user/me/profile/skills` | Thêm kỹ năng mới | Private (Candidate) |
| PUT | `/api/user/me/profile/skills/:skillId` | Cập nhật kỹ năng | Private (Candidate) |
| DELETE | `/api/user/me/profile/skills/:skillId` | Xóa kỹ năng | Private (Candidate) |

### **2.7. Profile Certifications**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile/certifications` | Lấy danh sách chứng chỉ (có pagination) | Private (Candidate) |
| GET | `/api/user/me/profile/certifications/:certificationId` | Lấy chi tiết một chứng chỉ | Private (Candidate) |
| POST | `/api/user/me/profile/certifications` | Thêm chứng chỉ mới | Private (Candidate) |
| PUT | `/api/user/me/profile/certifications/:certificationId` | Cập nhật chứng chỉ | Private (Candidate) |
| DELETE | `/api/user/me/profile/certifications/:certificationId` | Xóa chứng chỉ | Private (Candidate) |

### **2.8. Profile Awards**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/user/me/profile/awards` | Lấy danh sách giải thưởng (có pagination) | Private (Candidate) |
| GET | `/api/user/me/profile/awards/:awardId` | Lấy chi tiết một giải thưởng | Private (Candidate) |
| POST | `/api/user/me/profile/awards` | Thêm giải thưởng mới | Private (Candidate) |
| PUT | `/api/user/me/profile/awards/:awardId` | Cập nhật giải thưởng | Private (Candidate) |
| DELETE | `/api/user/me/profile/awards/:awardId` | Xóa giải thưởng | Private (Candidate) |

---

## **3. UPLOADS (`/api/uploads`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/uploads/avatar` | Upload avatar profile (image) | Private (Candidate) |
| POST | `/api/uploads/company-logo/:companyId` | Upload logo công ty (image) | Private (Recruiter) |
| POST | `/api/uploads/resume/:profileId` | Upload file CV (PDF, DOCX) | Private (Candidate) |
| POST | `/api/uploads/application-document/:applicationId` | Upload tài liệu đính kèm cho application (PDF, DOCX, Images) | Private (Candidate) |

---

## **4. RESUMES (`/api/resumes`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/resumes/themes` | Lấy danh sách themes có sẵn | Private (Candidate) |
| POST | `/api/resumes/from-profile` | Tạo CV từ profile (include ALL profile data) | Private (Candidate) |
| POST | `/api/resumes` | Tạo CV mới từ đầu (manual input) | Private (Candidate) |
| GET | `/api/resumes` | Lấy danh sách CV của user | Private (Candidate) |
| GET | `/api/resumes/:id` | Lấy chi tiết CV | Private (Candidate) |
| PUT | `/api/resumes/:id` | Cập nhật CV | Private (Candidate) |
| PATCH | `/api/resumes/:id/default` | Đặt CV làm mặc định | Private (Candidate) |
| DELETE | `/api/resumes/:id` | Xóa CV | Private (Candidate) |
| POST | `/api/resumes/upload` | Upload CV file (PDF/DOCX) với tự động parse | Private (Candidate) |
| GET | `/api/resumes/:id/download` | Download CV file | Private (Candidate) |
| POST | `/api/resumes/:id/export` | Export CV sang PDF với template tùy chọn | Private (Candidate) |
| GET | `/api/resumes/:id/preview` | Preview CV dạng HTML | Private (Candidate) |

---

## **5. JOBS (`/api/jobs`)**

### **5.1. Public Routes**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/jobs` | Lấy danh sách jobs active với filters | Public |
| GET | `/api/jobs/featured` | Lấy featured jobs | Public |
| GET | `/api/jobs/latest` | Lấy latest jobs | Public |
| GET | `/api/jobs/:id/public` | Xem chi tiết job (public view) | Public |
| POST | `/api/jobs/:id/view` | Track job view (có thể anonymous hoặc authenticated) | Public |

### **5.2. Employer Routes**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/jobs` | Tạo job posting mới | Private (Recruiter) |
| GET | `/api/jobs/my-jobs` | Lấy tất cả jobs đã đăng bởi employer | Private (Recruiter) |
| GET | `/api/jobs/:id/manage` | Lấy chi tiết job để quản lý (employer view) | Private (Recruiter) |
| GET | `/api/jobs/:id/stats` | Lấy thống kê job (views, applications) | Private (Recruiter) |
| PUT | `/api/jobs/:id` | Cập nhật job posting | Private (Recruiter) |
| PATCH | `/api/jobs/:id/status` | Cập nhật job status (open/close) | Private (Recruiter) |
| DELETE | `/api/jobs/:id` | Soft delete job posting | Private (Recruiter) |

---

## **6. ADMIN (`/api/admin`)**

### **6.1. User Management**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/admin/users` | Xem danh sách tất cả người dùng (có filters) | Private (Admin) |
| GET | `/api/admin/users/:userId` | Xem chi tiết user | Private (Admin) |
| PATCH | `/api/admin/users/:userId` | Admin cập nhật user (Khóa, Mở khóa, đổi Role) | Private (Admin) |
| DELETE | `/api/admin/users/:userId` | Admin xóa vĩnh viễn user | Private (Admin) |

### **6.2. Job Management**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/admin/jobs` | Lấy danh sách tất cả công việc với phân trang và bộ lọc | Private (Admin) |
| GET | `/api/admin/jobs/pending` | Lấy danh sách tin chờ duyệt | Private (Admin) |
| GET | `/api/admin/jobs/:id` | Lấy chi tiết một công việc (admin view) | Private (Admin) |
| PATCH | `/api/admin/jobs/:id/approve` | Duyệt tin tuyển dụng → Sync ES | Private (Admin) |
| PATCH | `/api/admin/jobs/:id/reject` | Từ chối tin tuyển dụng | Private (Admin) |
| PATCH | `/api/admin/jobs/:id/label` | Gán nhãn cho tin (Hot/Urgent/Featured) | Private (Admin) |
| DELETE | `/api/admin/jobs/:id/violation` | Gỡ tin vi phạm (soft delete) | Private (Admin) |
| POST | `/api/admin/jobs/:id/restore` | Khôi phục tin đã xóa | Private (Admin) |

---

## **7. SKILLS (`/api/skills`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/skills` | Search và list tất cả skills có sẵn cho autocomplete | Public |
| GET | `/api/skills/categories` | Lấy tất cả skill categories để filter | Public |

---

## **8. COMPANIES (`/api/companies`)**

### **8.1. Company Management (Recruiter)**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/companies` | Nhà tuyển dụng tạo hồ sơ doanh nghiệp | Private (Recruiter) |
| GET | `/api/companies/me` | Nhà tuyển dụng xem hồ sơ doanh nghiệp của mình | Private (Recruiter) |
| PATCH | `/api/companies/me` | Nhà tuyển dụng cập nhật hồ sơ doanh nghiệp | Private (Recruiter) |

### **8.2. Company Details**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/companies/me/details` | Xem thông tin chi tiết công ty | Private (Recruiter) |
| POST | `/api/companies/me/details` | Tạo thông tin chi tiết công ty | Private (Recruiter) |
| PATCH | `/api/companies/me/details` | Cập nhật thông tin chi tiết công ty | Private (Recruiter) |
| DELETE | `/api/companies/me/details` | Xóa thông tin chi tiết công ty | Private (Recruiter) |

### **8.3. Company Benefits**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/companies/me/benefits` | Xem danh sách phúc lợi công ty | Private (Recruiter) |
| POST | `/api/companies/me/benefits` | Thêm phúc lợi cho công ty | Private (Recruiter) |
| PATCH | `/api/companies/me/benefits/:id` | Cập nhật phúc lợi công ty | Private (Recruiter) |
| DELETE | `/api/companies/me/benefits/:id` | Xóa phúc lợi công ty | Private (Recruiter) |

### **8.4. Public Company**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/companies/:id` | (Public) Xem chi tiết hồ sơ doanh nghiệp bằng ID | Public |

---

## **9. SAVED JOBS (`/api/saved-jobs`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/saved-jobs` | Lưu job vào favorites | Private (Candidate) |
| DELETE | `/api/saved-jobs/:jobId` | Xóa job khỏi favorites | Private (Candidate) |
| GET | `/api/saved-jobs` | Lấy danh sách saved jobs với pagination và filters | Private (Candidate) |
| GET | `/api/saved-jobs/check/:jobId` | Kiểm tra job đã được lưu chưa | Private (Candidate) |

---

## **10. APPLICATIONS (`/api/applications`)**

### **10.1. Candidate Routes**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| POST | `/api/applications` | Tạo application mới | Private (Candidate) |
| GET | `/api/applications` | Lấy danh sách applications với pagination và filters | Private (Candidate) |
| GET | `/api/applications/:id` | Lấy chi tiết application theo ID | Private (Candidate) |
| GET | `/api/applications/:id/stages` | Lấy lịch sử stages của application | Private (Candidate) |
| GET | `/api/applications/:id/documents` | Lấy documents của application | Private (Candidate) |
| POST | `/api/applications/:id/documents` | Upload thêm document cho application | Private (Candidate) |
| DELETE | `/api/applications/:id` | Rút lại application | Private (Candidate) |

### **10.2. Recruiter Routes**
| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/applications/job/:jobId` | Lấy tất cả applications cho một job cụ thể | Private (Recruiter) |
| GET | `/api/applications/job/:jobId/stats` | Lấy thống kê applications cho một job | Private (Recruiter) |
| POST | `/api/applications/bulk-update` | Bulk update nhiều applications | Private (Recruiter) |
| GET | `/api/applications/:id/cv` | Xem chi tiết CV của applicant | Private (Recruiter) |
| PATCH | `/api/applications/:id/status` | Cập nhật application status | Private (Recruiter) |
| PATCH | `/api/applications/:id/stage` | Cập nhật application stage hiện có | Private (Recruiter) |
| POST | `/api/applications/:id/stage` | Tạo application stage mới (ví dụ: schedule interview) | Private (Recruiter) |
| POST | `/api/applications/:id/notes` | Thêm internal notes cho application | Private (Recruiter) |
| POST | `/api/applications/:id/contact` | Liên hệ candidate qua email/notification | Private (Recruiter) |

---

## **11. NOTIFICATIONS (`/api/notifications`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/notifications/unread-count` | Lấy số lượng notifications chưa đọc | Private |
| PATCH | `/api/notifications/mark-all-read` | Đánh dấu tất cả notifications là đã đọc | Private |
| GET | `/api/notifications` | Lấy danh sách notifications có pagination | Private |
| PATCH | `/api/notifications/:id/read` | Đánh dấu một notification là đã đọc | Private |
| DELETE | `/api/notifications/:id` | Xóa một notification | Private |

---

## **12. CONNECTION INTERESTS (`/api/connection-interests`)**

| Method | Endpoint | Chức năng | Access |
|--------|----------|-----------|--------|
| GET | `/api/connection-interests/stats` | Lấy thống kê connection interest | Private (Candidate/Recruiter) |
| POST | `/api/connection-interests` | Tạo connection interest mới | Private (Recruiter) |
| GET | `/api/connection-interests` | Lấy danh sách connection interests với filters | Private (Candidate/Recruiter) |
| GET | `/api/connection-interests/:id` | Lấy chi tiết connection interest theo ID | Private (Candidate/Recruiter) |
| PATCH | `/api/connection-interests/:id/respond` | Phản hồi connection interest (accept/reject) | Private (Candidate) |
| DELETE | `/api/connection-interests/:id` | Xóa connection interest | Private (Recruiter) |

---

## **13. SEARCH (`/api/search`)**

**Lưu ý:** File route này hiện đang bị comment, không có endpoint active.

---

## **TỔNG KẾT**

- **Tổng số endpoints:** ~120+
- **Public endpoints:** ~10
- **Private endpoints:** ~110+
- **Modules:** 13 modules chính

### **Phân loại theo quyền truy cập:**
- **Public:** Không cần authentication
- **Private (Candidate):** Cần authentication + role Candidate
- **Private (Recruiter):** Cần authentication + role Recruiter
- **Private (Admin):** Cần authentication + role Admin
- **Private:** Cần authentication (bất kỳ role nào)

---

**Ngày tạo:** $(date)
**Phiên bản API:** 1.0
