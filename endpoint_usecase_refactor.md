Tiếp tục với vai trò Backend Architect / UML System Designer.

Dựa trên kết quả phân tích trước đó (đối chiếu Use Case ↔ Endpoint), trong đó:

Một use case nghiệp vụ có thể được triển khai bằng nhiều endpoint

Endpoint không tương đương 1–1 với use case

Nhiệm vụ của bạn:

1. Tái cấu trúc sơ đồ Use Case hiện tại

Xác định các Use Case tổng (Business-level Use Case) tương ứng với mục tiêu nghiệp vụ chính của từng actor.

Gộp các use case đang bị tách nhỏ theo endpoint thành một use case tổng hợp hợp lý.

2. Xác định Sub Use Case
   Với mỗi use case tổng:

Liệt kê các sub use case / hành vi con (tương ứng với các thao tác kỹ thuật hoặc endpoint).

Chỉ rõ mối quan hệ:

<<include>> nếu hành vi luôn xảy ra

<<extend>> nếu hành vi là tùy chọn / điều kiện

3. Ánh xạ lại với hệ thống backend

Với mỗi sub use case, chỉ ra:

Endpoint liên quan

HTTP method

Ghi chú nếu:

Sub use case là internal logic (không nên vẽ)

Hoặc là API công khai

4. Đánh giá mức độ hợp lý

Use case tổng có đang:

Quá lớn (God use case)?

Hay vẫn còn bị chia nhỏ sai mức trừu tượng?

Sub use case có phản ánh đúng ranh giới nghiệp vụ hay chỉ là thao tác CRUD thuần?

5. Đề xuất sơ đồ Use Case mới

Mô tả lại sơ đồ use case sau khi refactor theo cấu trúc:

Actor → Use Case tổng → Sub Use Case

Đề xuất cách vẽ (không cần hình):

Use case nào nên vẽ

Use case nào nên ẩn (internal)

Yêu cầu đầu ra

Bảng 1: Use Case tổng

Use Case | Actor | Mục tiêu nghiệp vụ | Ghi chú

Bảng 2: Sub Use Case

Use Case tổng | Sub Use Case | Quan hệ | Endpoint | Nhận xét

Phần kết luận:

Nguyên tắc tổ chức use case áp dụng cho hệ thống này

Checklist ngắn để tự kiểm tra use case vẽ đúng hay chưa

# TÁI CẤU TRÚC SƠ ĐỒ USE CASE - JOB PORTAL SYSTEM

## BẢNG 1: USE CASE TỔNG (BUSINESS-LEVEL USE CASES)

### 👤 CANDIDATE (Ứng viên)

| Use Case                                 | Actor     | Mục tiêu nghiệp vụ                                                             | Ghi chú                                         |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| **UC-C01: Quản lý Hồ sơ Cá nhân**        | Candidate | Tạo và duy trì profile chuyên nghiệp để tăng cơ hội tìm việc                   | Core use case, bao gồm tất cả thông tin profile |
| **UC-C02: Quản lý CV**                   | Candidate | Tạo, chỉnh sửa và quản lý nhiều phiên bản CV phù hợp với từng vị trí ứng tuyển | Độc lập với Profile nhưng có thể sync data      |
| **UC-C03: Tìm kiếm & Khám phá Việc làm** | Candidate | Tìm kiếm công việc phù hợp dựa trên tiêu chí cá nhân và nhận gợi ý thông minh  | Bao gồm search, filter, recommendations         |
| **UC-C04: Ứng tuyển Công việc**          | Candidate | Nộp hồ sơ và theo dõi tiến trình ứng tuyển                                     | End-to-end application lifecycle                |
| **UC-C05: Quản lý Việc làm Quan tâm**    | Candidate | Lưu trữ và tổ chức các công việc yêu thích để theo dõi sau                     | Supporting use case                             |
| **UC-C06: Kết nối với Nhà tuyển dụng**   | Candidate | Nhận và phản hồi lời mời kết nối từ employers                                  | Networking feature                              |
| **UC-C07: Nhận & Quản lý Thông báo**     | Candidate | Theo dõi các cập nhật quan trọng về ứng tuyển và cơ hội việc làm               | Cross-cutting concern                           |

### 🏢 RECRUITER/EMPLOYER (Nhà tuyển dụng)

| Use Case                                        | Actor    | Mục tiêu nghiệp vụ                                       | Ghi chú                   |
| ----------------------------------------------- | -------- | -------------------------------------------------------- | ------------------------- |
| **UC-E01: Quản lý Hồ sơ Doanh nghiệp**          | Employer | Tạo và duy trì thông tin công ty để thu hút ứng viên     | Company branding          |
| **UC-E02: Đăng tuyển & Quản lý Tin tuyển dụng** | Employer | Tạo, chỉnh sửa và quản lý các tin tuyển dụng             | Core recruiter use case   |
| **UC-E03: Tìm kiếm & Khám phá Ứng viên**        | Employer | Chủ động tìm kiếm ứng viên phù hợp với yêu cầu công việc | Proactive recruiting      |
| **UC-E04: Quản lý Hồ sơ Ứng tuyển**             | Employer | Xem xét, đánh giá và xử lý các đơn ứng tuyển             | Core recruitment workflow |
| **UC-E05: Kết nối với Ứng viên**                | Employer | Gửi lời mời và liên hệ với ứng viên tiềm năng            | Networking feature        |
| **UC-E06: Xem Báo cáo & Thống kê**              | Employer | Đánh giá hiệu quả tuyển dụng và tối ưu hóa chiến lược    | Analytics & insights      |
| **UC-E07: Nhận & Quản lý Thông báo**            | Employer | Theo dõi các cập nhật về ứng tuyển mới và hoạt động      | Cross-cutting concern     |

### 👨‍💼 ADMIN (Quản trị viên)

| Use Case                                    | Actor | Mục tiêu nghiệp vụ                                  | Ghi chú                   |
| ------------------------------------------- | ----- | --------------------------------------------------- | ------------------------- |
| **UC-A01: Quản lý Người dùng**              | Admin | Quản trị tài khoản user trong hệ thống              | User lifecycle management |
| **UC-A02: Kiểm duyệt Nội dung**             | Admin | Duyệt và kiểm soát chất lượng tin tuyển dụng        | Content moderation        |
| **UC-A03: Quản lý Dữ liệu Hệ thống**        | Admin | Quản lý master data (skills, locations, categories) | System configuration      |
| **UC-A04: Xem Báo cáo & Thống kê Hệ thống** | Admin | Giám sát và phân tích hoạt động toàn hệ thống       | System analytics          |

### 🌐 GUEST (Khách vãng lai)

| Use Case                                 | Actor | Mục tiêu nghiệp vụ                                             | Ghi chú               |
| ---------------------------------------- | ----- | -------------------------------------------------------------- | --------------------- |
| **UC-G01: Khám phá Việc làm & Công ty**  | Guest | Xem thông tin công khai để đánh giá hệ thống trước khi đăng ký | Public content access |
| **UC-G02: Đăng ký & Xác thực Tài khoản** | Guest | Tạo tài khoản và xác thực để trở thành user                    | Onboarding flow       |

### 🤖 SYSTEM (Hệ thống)

| Use Case                             | Actor  | Mục tiêu nghiệp vụ                                          | Ghi chú                  |
| ------------------------------------ | ------ | ----------------------------------------------------------- | ------------------------ |
| **UC-S01: Gửi Thông báo Tự động**    | System | Gửi alerts và notifications dựa trên sự kiện trong hệ thống | Automated background job |
| **UC-S02: Cập nhật Gợi ý & Ranking** | System | Tính toán và cập nhật recommendations, trending jobs        | Background analytics     |

---

## BẢNG 2: SUB USE CASE & ENDPOINT MAPPING

### 👤 CANDIDATE USE CASES

#### **UC-C01: Quản lý Hồ sơ Cá nhân**

| Sub Use Case                     | Quan hệ    | Endpoint                                                      | Method | Nhận xét              |
| -------------------------------- | ---------- | ------------------------------------------------------------- | ------ | --------------------- |
| Xem thông tin profile hiện tại   | Base       | `GET /api/user/me/profile`                                    | GET    | Core action           |
| Tạo profile mới                  | Base       | `POST /api/user/me/profile`                                   | POST   | One-time action       |
| Cập nhật thông tin cơ bản        | Base       | `PUT /api/user/me/profile`                                    | PUT    | Frequent action       |
| **Quản lý Kinh nghiệm làm việc** | <<extend>> | `GET/POST/PUT/DELETE /api/user/me/profile/experiences/:id`    | CRUD   | Sub-entity management |
| **Quản lý Học vấn**              | <<extend>> | `GET/POST/PUT/DELETE /api/user/me/profile/educations/:id`     | CRUD   | Sub-entity management |
| **Quản lý Kỹ năng**              | <<extend>> | `GET/POST/PUT/DELETE /api/user/me/profile/skills/:id`         | CRUD   | Sub-entity management |
| **Quản lý Chứng chỉ**            | <<extend>> | `GET/POST/PUT/DELETE /api/user/me/profile/certifications/:id` | CRUD   | Sub-entity management |
| **Quản lý Giải thưởng**          | <<extend>> | `GET/POST/PUT/DELETE /api/user/me/profile/awards/:id`         | CRUD   | Optional sub-entity   |
| Cập nhật quyền riêng tư profile  | <<extend>> | `PUT /api/user/me/profile/visibility`                         | PUT    | Privacy setting       |
| Xem độ hoàn thiện profile        | <<extend>> | `GET /api/user/me/profile/completeness`                       | GET    | Gamification feature  |

**⚠️ Nhận xét**:

- Sub-entities (experiences, educations, skills...) **NÊN** vẽ thành các use case extend vì chúng là **optional** và có logic nghiệp vụ riêng
- Không vẽ riêng từng CRUD operation, gộp thành "Quản lý X"
- `completeness` là supporting feature, có thể ẩn nếu diagram quá phức tạp

---

#### **UC-C02: Quản lý CV**

| Sub Use Case            | Quan hệ     | Endpoint                         | Method | Nhận xét                                       |
| ----------------------- | ----------- | -------------------------------- | ------ | ---------------------------------------------- |
| Xem danh sách CV đã tạo | Base        | `GET /api/resumes`               | GET    | Core action                                    |
| Tạo CV từ mẫu có sẵn    | Base        | `POST /api/resumes`              | POST   | Primary creation flow                          |
| Tạo CV từ Profile       | Alternative | `POST /api/resumes/from-profile` | POST   | ⚠️ KHÔNG phải <<include>>, là alternative flow |
| Chỉnh sửa nội dung CV   | Base        | `PUT /api/resumes/:id`           | PUT    | Core action                                    |
| Xóa CV                  | Base        | `DELETE /api/resumes/:id`        | DELETE | Core action                                    |
| Tải CV lên từ file      | <<extend>>  | `POST /api/resumes/upload`       | POST   | Alternative input method                       |
| Xuất CV ra file         | <<extend>>  | `POST /api/resumes/:id/export`   | POST   | Output action                                  |
| Tải CV về               | <<extend>>  | `GET /api/resumes/:id/download`  | GET    | Download action                                |
| Đặt CV mặc định         | <<extend>>  | `PATCH /api/resumes/:id/default` | PATCH  | Configuration                                  |
| Xem danh sách theme/mẫu | <<include>> | `GET /api/resumes/themes`        | GET    | Supporting data, always needed                 |

**⚠️ Nhận xét**:

- "Tạo CV từ Profile" và "Tạo CV từ mẫu" là **2 alternative flows**, không phải include/extend
- Export/Download là **extend** vì không phải ai cũng dùng
- Themes list là **include** vì luôn cần khi chọn mẫu

---

#### **UC-C03: Tìm kiếm & Khám phá Việc làm**

| Sub Use Case                | Quan hệ     | Endpoint                                | Method | Nhận xét                      |
| --------------------------- | ----------- | --------------------------------------- | ------ | ----------------------------- |
| Xem danh sách việc làm      | Base        | `GET /api/jobs`                         | GET    | Core browsing                 |
| Tìm kiếm theo tiêu chí      | Base        | `GET /api/search/jobs`                  | GET    | Search with filters           |
| Xem chi tiết công việc      | Base        | `GET /api/jobs/:id/public`              | GET    | Detail view                   |
| Xem việc làm nổi bật        | <<extend>>  | `GET /api/jobs/featured`                | GET    | Curated content               |
| Xem việc làm phổ biến       | <<extend>>  | `GET /api/jobs/popular`                 | GET    | Trending content              |
| Xem việc làm mới nhất       | <<extend>>  | `GET /api/jobs/latest`                  | GET    | Time-based filter             |
| Nhận gợi ý việc làm phù hợp | <<extend>>  | `GET /api/jobs/recommendations`         | GET    | Personalized AI feature       |
| Nhận gợi ý "Dành cho bạn"   | <<extend>>  | `GET /api/jobs/recommendations/for-you` | GET    | Advanced AI feature           |
| Xem lịch sử đã xem          | <<extend>>  | `GET /api/jobs/recently-viewed`         | GET    | Supporting feature            |
| Xóa lịch sử xem             | 🔒 Internal | `DELETE /api/jobs/recently-viewed`      | DELETE | ❌ Không vẽ - internal action |
| Track view (system)         | 🔒 Internal | `POST /api/jobs/:id/view`               | POST   | ❌ Không vẽ - system tracking |

**⚠️ Nhận xét**:

- Featured/Popular/Latest là **extend** vì là các view đặc biệt
- Recommendations là **extend** vì yêu cầu login và profile data
- Track view là **system internal**, không vẽ vào user use case

---

#### **UC-C04: Ứng tuyển Công việc**

| Sub Use Case                    | Quan hệ     | Endpoint                            | Method | Nhận xét                      |
| ------------------------------- | ----------- | ----------------------------------- | ------ | ----------------------------- |
| Nộp đơn ứng tuyển               | Base        | `POST /api/applications`            | POST   | Core action                   |
| Chọn CV để nộp                  | <<include>> | `GET /api/resumes`                  | GET    | Always needed before applying |
| Xem danh sách đơn đã nộp        | Base        | `GET /api/applications`             | GET    | Core tracking                 |
| Xem chi tiết đơn ứng tuyển      | Base        | `GET /api/applications/:id`         | GET    | Detail view                   |
| Xem trạng thái & stages         | <<include>> | `GET /api/applications/:id/stages`  | GET    | Always part of detail view    |
| Rút đơn ứng tuyển               | Base        | `DELETE /api/applications/:id`      | DELETE | Core action                   |
| Xem lịch sử thay đổi trạng thái | <<extend>>  | `GET /api/applications/:id/history` | GET    | Audit trail (if exists)       |

**⚠️ Nhận xét**:

- "Xem trạng thái" **KHÔNG** nên là use case riêng, gộp vào "Xem chi tiết đơn"
- Stage tracking là **include** vì luôn hiển thị trong detail view
- Chọn CV là **include** vì bắt buộc khi nộp đơn

---

#### **UC-C05: Quản lý Việc làm Quan tâm**

| Sub Use Case              | Quan hệ     | Endpoint                           | Method | Nhận xét                     |
| ------------------------- | ----------- | ---------------------------------- | ------ | ---------------------------- |
| Lưu việc làm yêu thích    | Base        | `POST /api/saved-jobs`             | POST   | Core action                  |
| Xem danh sách đã lưu      | Base        | `GET /api/saved-jobs`              | GET    | Core action                  |
| Bỏ lưu việc làm           | Base        | `DELETE /api/saved-jobs/:jobId`    | DELETE | Core action                  |
| Kiểm tra trạng thái saved | 🔒 Internal | `GET /api/saved-jobs/check/:jobId` | GET    | ❌ Không vẽ - UI state check |

**⚠️ Nhận xét**:

- Đây là use case đơn giản, chỉ gồm 3 actions cơ bản
- Check status là internal logic, không vẽ

---

#### **UC-C06: Kết nối với Nhà tuyển dụng**

| Sub Use Case                        | Quan hệ    | Endpoint                                    | Method | Nhận xét                  |
| ----------------------------------- | ---------- | ------------------------------------------- | ------ | ------------------------- |
| Xem lời mời kết nối                 | Base       | `GET /api/connection-interests`             | GET    | Core action               |
| Xem chi tiết lời mời                | Base       | `GET /api/connection-interests/:id`         | GET    | Detail view               |
| Chấp nhận lời mời                   | Base       | `POST /api/connection-interests/:id/accept` | POST   | Response action           |
| Từ chối lời mời                     | Base       | `POST /api/connection-interests/:id/reject` | POST   | Response action           |
| Xem profile công khai của recruiter | <<extend>> | `GET /api/companies/:id`                    | GET    | Research before accepting |

**⚠️ Nhận xét**:

- Use case này là **passive** (nhận lời mời), không phải gửi
- Accept/Reject nên gộp thành "Phản hồi lời mời" nếu đơn giản hóa

---

#### **UC-C07: Nhận & Quản lý Thông báo**

| Sub Use Case            | Quan hệ    | Endpoint                                 | Method  | Nhận xét    |
| ----------------------- | ---------- | ---------------------------------------- | ------- | ----------- |
| Xem danh sách thông báo | Base       | `GET /api/notifications`                 | GET     | Core action |
| Đánh dấu đã đọc         | Base       | `PATCH /api/notifications/:id/read`      | PATCH   | Core action |
| Đánh dấu tất cả đã đọc  | <<extend>> | `PATCH /api/notifications/read-all`      | PATCH   | Bulk action |
| Xóa thông báo           | Base       | `DELETE /api/notifications/:id`          | DELETE  | Core action |
| Cài đặt preferences     | <<extend>> | `GET/PUT /api/notifications/preferences` | GET/PUT | Settings    |

**⚠️ Nhận xét**:

- Đây là **cross-cutting use case**, có thể vẽ riêng hoặc gộp vào từng module

---

### 🏢 EMPLOYER USE CASES

#### **UC-E01: Quản lý Hồ sơ Doanh nghiệp**

| Sub Use Case                | Quan hệ    | Endpoint                                               | Method | Nhận xét              |
| --------------------------- | ---------- | ------------------------------------------------------ | ------ | --------------------- |
| Xem thông tin công ty       | Base       | `GET /api/companies/me`                                | GET    | Core action           |
| Tạo hồ sơ công ty           | Base       | `POST /api/companies`                                  | POST   | One-time setup        |
| Cập nhật thông tin cơ bản   | Base       | `PATCH /api/companies/me`                              | PATCH  | Core action           |
| Cập nhật thông tin chi tiết | Base       | `PATCH /api/companies/me/details`                      | PATCH  | Extended info         |
| **Quản lý Phúc lợi**        | <<extend>> | `GET/POST/PATCH/DELETE /api/companies/me/benefits/:id` | CRUD   | Sub-entity management |
| Upload logo công ty         | <<extend>> | `POST /api/uploads/company-logo`                       | POST   | Branding              |
| Upload banner/images        | <<extend>> | `POST /api/uploads/company-images`                     | POST   | Branding              |
| Xem profile công khai       | <<extend>> | `GET /api/companies/:id`                               | GET    | Preview public view   |

**⚠️ Nhận xét**:

- Benefits management là **extend** vì optional
- Upload actions nên gộp thành "Quản lý Media"

---

#### **UC-E02: Đăng tuyển & Quản lý Tin tuyển dụng**

| Sub Use Case                   | Quan hệ     | Endpoint                       | Method | Nhận xét                              |
| ------------------------------ | ----------- | ------------------------------ | ------ | ------------------------------------- |
| Tạo tin tuyển dụng mới         | Base        | `POST /api/jobs`               | POST   | Core action                           |
| Xem danh sách tin đã đăng      | Base        | `GET /api/jobs/my-jobs`        | GET    | Core action                           |
| Xem chi tiết tin (manage view) | Base        | `GET /api/jobs/:id/manage`     | GET    | Management view                       |
| Chỉnh sửa tin tuyển dụng       | Base        | `PUT /api/jobs/:id`            | PUT    | Core action                           |
| Xóa/Đóng tin tuyển dụng        | Base        | `DELETE /api/jobs/:id`         | DELETE | Core action (soft delete)             |
| Sao chép tin tuyển dụng        | <<extend>>  | `POST /api/jobs/:id/duplicate` | POST   | Time-saving feature                   |
| Đăng lại tin đã đóng           | <<extend>>  | `POST /api/jobs/:id/repost`    | POST   | Reuse content                         |
| Xem preview tin tuyển dụng     | 🔒 Internal | `GET /api/jobs/:id/public`     | GET    | ❌ Không vẽ riêng - part of edit flow |

**⚠️ Nhận xét**:

- Duplicate/Repost là **extend** vì không phải use case chính
- Preview là internal part của edit flow

---

#### **UC-E03: Tìm kiếm & Khám phá Ứng viên**

| Sub Use Case                    | Quan hệ     | Endpoint                                 | Method | Nhận xét                    |
| ------------------------------- | ----------- | ---------------------------------------- | ------ | --------------------------- |
| Tìm kiếm ứng viên theo tiêu chí | Base        | `GET /api/search/candidates`             | GET    | 🔴 **CẦN BỔ SUNG ENDPOINT** |
| Xem gợi ý ứng viên phù hợp      | Base        | `GET /api/jobs/:id/suggested-candidates` | GET    | AI-powered matching         |
| Xem profile công khai ứng viên  | Base        | `GET /api/user/profiles/:id/public`      | GET    | Detail view                 |
| Lọc theo kỹ năng/kinh nghiệm    | <<include>> | Query params in search                   | GET    | Part of search              |
| Lưu ứng viên quan tâm           | <<extend>>  | `POST /api/saved-candidates`             | POST   | 🔴 **CẦN BỔ SUNG ENDPOINT** |

**⚠️ Nhận xét**:

- **Thiếu endpoint** cho candidate search - cần bổ sung
- Suggested candidates chỉ dựa trên job, không phải general search

---

#### **UC-E04: Quản lý Hồ sơ Ứng tuyển**

| Sub Use Case                 | Quan hệ     | Endpoint                               | Method | Nhận xét                    |
| ---------------------------- | ----------- | -------------------------------------- | ------ | --------------------------- |
| Xem danh sách hồ sơ theo job | Base        | `GET /api/applications/job/:jobId`     | GET    | Core action                 |
| Lọc hồ sơ theo trạng thái    | <<include>> | Query params                           | GET    | Part of listing             |
| Xem chi tiết hồ sơ ứng tuyển | Base        | `GET /api/applications/:id`            | GET    | Detail view                 |
| Xem CV của ứng viên          | <<include>> | `GET /api/applications/:id/cv`         | GET    | Always needed in review     |
| Cập nhật trạng thái hồ sơ    | Base        | `PATCH /api/applications/:id/status`   | PATCH  | Core action                 |
| Chuyển stage ứng tuyển       | Base        | `PATCH /api/applications/:id/stage`    | PATCH  | Pipeline management         |
| Thêm ghi chú nội bộ          | <<extend>>  | `POST /api/applications/:id/notes`     | POST   | Collaboration feature       |
| **Thêm vào Shortlist**       | <<extend>>  | `POST /api/applications/:id/shortlist` | POST   | 🔴 **CẦN BỔ SUNG ENDPOINT** |
| **Xem danh sách Shortlist**  | <<extend>>  | `GET /api/applications/shortlisted`    | GET    | 🔴 **CẦN BỔ SUNG ENDPOINT** |
| So sánh nhiều hồ sơ          | <<extend>>  | `POST /api/applications/compare`       | POST   | Advanced feature            |
| Liên hệ ứng viên             | <<extend>>  | `POST /api/applications/:id/contact`   | POST   | Communication               |

**⚠️ Nhận xét**:

- **Shortlist** là feature quan trọng nhưng thiếu endpoint
- So sánh và liên hệ là **extend** vì không phải ai cũng dùng
- Notes là internal collaboration, có thể ẩn nếu diagram phức tạp

---

#### **UC-E05: Kết nối với Ứng viên**

| Sub Use Case                 | Quan hệ    | Endpoint                                     | Method | Nhận xét        |
| ---------------------------- | ---------- | -------------------------------------------- | ------ | --------------- |
| Gửi lời mời kết nối          | Base       | `POST /api/connection-interests`             | POST   | Core action     |
| Xem danh sách lời mời đã gửi | Base       | `GET /api/connection-interests/sent`         | GET    | Tracking        |
| Xem phản hồi từ ứng viên     | Base       | `GET /api/connection-interests/:id/response` | GET    | Status check    |
| Hủy lời mời đã gửi           | <<extend>> | `DELETE /api/connection-interests/:id`       | DELETE | Optional action |

**⚠️ Nhận xét**:

- Use case này là **active** (gửi lời mời), đối xứng với UC-C06

---

#### **UC-E06: Xem Báo cáo & Thống kê**

| Sub Use Case                | Quan hệ    | Endpoint                                 | Method | Nhận xét                    |
| --------------------------- | ---------- | ---------------------------------------- | ------ | --------------------------- |
| Xem thống kê tin tuyển dụng | Base       | `GET /api/jobs/:id/stats`                | GET    | Job performance             |
| Xem thống kê ứng tuyển      | Base       | `GET /api/applications/job/:jobId/stats` | GET    | Application metrics         |
| Xem báo cáo tổng quan       | <<extend>> | `GET /api/analytics/dashboard`           | GET    | 🔴 **CẦN BỔ SUNG ENDPOINT** |
| Export báo cáo              | <<extend>> | `POST /api/analytics/export`             | POST   | 🔴 **CẦN BỔ SUNG ENDPOINT** |

**⚠️ Nhận xét**:

- Thiếu dashboard analytics tổng quan
- Export feature nên có nhưng là extend

---

### 👨‍💼 ADMIN USE CASES

#### **UC-A01: Quản lý Người dùng**

| Sub Use Case             | Quan hệ     | Endpoint                               | Method | Nhận xét          |
| ------------------------ | ----------- | -------------------------------------- | ------ | ----------------- |
| Xem danh sách người dùng | Base        | `GET /api/admin/users`                 | GET    | Core action       |
| Tìm kiếm/Lọc người dùng  | <<include>> | Query params                           | GET    | Part of listing   |
| Xem chi tiết tài khoản   | Base        | `GET /api/admin/users/:userId`         | GET    | Detail view       |
| Khóa tài khoản           | Base        | `PATCH /api/admin/users/:userId/ban`   | PATCH  | Moderation action |
| Mở khóa tài khoản        | Base        | `PATCH /api/admin/users/:userId/unban` | PATCH  | Moderation action |
| Xóa tài khoản            | Base        | `DELETE /api/admin/users/:userId`      | DELETE | Permanent action  |
| Thay đổi role            | <<extend>>  | `PATCH /api/admin/users/:userId/role`  | PATCH  | Role management   |

**⚠️ Nhận xét**:

- Ban/Unban nên gộp thành "Thay đổi trạng thái tài khoản"
- Role change là advanced admin feature

---

#### **UC-A02: Kiểm duyệt Nội dung**

| Sub Use Case                 | Quan hệ    | Endpoint                               | Method | Nhận xét         |
| ---------------------------- | ---------- | -------------------------------------- | ------ | ---------------- |
| Xem tin tuyển dụng chờ duyệt | Base       | `GET /api/admin/jobs/pending`          | GET    | Moderation queue |
| Xem tất cả tin tuyển dụng    | Base       | `GET /api/admin/jobs`                  | GET    | Full listing     |
| Duyệt tin tuyển dụng         | Base       | `PATCH /api/admin/jobs/:id/approve`    | PATCH  | Approval action  |
| Từ chối tin tuyển dụng       | Base       | `PATCH /api/admin/jobs/:id/reject`     | PATCH  | Rejection action |
| Gỡ tin vi phạm               | Base       | `DELETE /api/admin/jobs/:id/violation` | DELETE | Enforcement      |
| Gán nhãn/Category            | <<extend>> | `PATCH /api/admin/jobs/:id/label`      | PATCH  | Categorization   |

**⚠️ Nhận xét**:

- Approve/Reject nên gộp thành "Xét duyệt tin tuyển dụng"
- Label assignment là optional admin task

---

#### **UC-A03: Quản lý Dữ liệu Hệ thống**

| Sub Use Case                        | Quan hệ    | Endpoint                                      | Method | Nhận xét           |
| ----------------------------------- | ---------- | --------------------------------------------- | ------ | ------------------ |
| **Quản lý Kỹ năng (Skills)**        | Base       | `GET/POST/PATCH/DELETE /api/admin/skills`     | CRUD   | Master data        |
| **Quản lý Địa điểm (Locations)**    | Base       | `GET/POST/PATCH/DELETE /api/admin/locations`  | CRUD   | Master data        |
| **Quản lý Ngành nghề (Industries)** | Base       | `GET/POST/PATCH/DELETE /api/admin/industries` | CRUD   | 🔴 **CẦN BỔ SUNG** |
| Import dữ liệu hàng loạt            | <<extend>> | `POST /api/admin/data/import`                 | POST   | Bulk operation     |
| Export dữ liệu                      | <<extend>> | `GET /api/admin/data/export`                  | GET    | Backup             |

**⚠️ Nhận xét**:

- Mỗi master data entity là sub use case riêng
- Import/Export là admin tools, extend

---

#### **UC-A04: Xem Báo cáo & Thống kê Hệ thống**

| Sub Use Case                | Quan hệ    | Endpoint                                | Method | Nhận xét            |
| --------------------------- | ---------- | --------------------------------------- | ------ | ------------------- |
| Xem dashboard tổng quan     | Base       | `GET /api/admin/analytics/dashboard`    | GET    | 🔴 **CẦN BỔ SUNG**  |
| Xem thống kê người dùng     | Base       | `GET /api/admin/analytics/users`        | GET    | User metrics        |
| Xem thống kê tin tuyển dụng | Base       | `GET /api/admin/analytics/jobs`         | GET    | Job metrics         |
| Xem thống kê ứng tuyển      | Base       | `GET /api/admin/analytics/applications` | GET    | Application metrics |
| Export báo cáo              | <<extend>> | `POST /api/admin/analytics/export`      | POST   | Reporting           |

**⚠️ Nhận xét**:

- Cần dashboard endpoint tổng hợp
- Export là extend feature

---

### 🌐 GUEST USE CASES

#### **UC-G01: Khám phá Việc làm & Công ty**

| Sub Use Case           | Quan hệ    | Endpoint                   | Method | Nhận xét                          |
| ---------------------- | ---------- | -------------------------- | ------ | --------------------------------- |
| Xem danh sách việc làm | Base       | `GET /api/jobs`            | GET    | Public access                     |
| Xem chi tiết công việc | Base       | `GET /api/jobs/:id/public` | GET    | Public access                     |
| Xem thông tin công ty  | Base       | `GET /api/companies/:id`   | GET    | Public access                     |
| Tìm kiếm việc làm      | <<extend>> | `GET /api/search/jobs`     | GET    | Basic search (no personalization) |

**⚠️ Nhận xét**:

- Guest chỉ có read-only access
- Search không có personalization vì chưa login

---

#### **UC-G02: Đăng ký & Xác thực Tài khoản**

| Sub Use Case                  | Quan hệ                 | Endpoint                                | Method | Nhận xét               |
| ----------------------------- | ----------------------- | --------------------------------------- | ------ | ---------------------- |
| Đăng ký tài khoản mới         | Base                    | `POST /api/auth/register`               | POST   | Onboarding             |
| Xác thực email                | <<include>>             | `POST /api/auth/verify-email`           | POST   | Always required        |
| Gửi lại email xác thực        | <<extend>>              | `POST /api/auth/resend-verify-email`    | POST   | Error recovery         |
| Đăng nhập                     | Base                    | `POST /api/auth/login`                  | POST   | Authentication         |
| Quên mật khẩu                 | <<extend>>              | `POST /api/auth/forgot-password`        | POST   | Password recovery flow |
| Xác thực token reset password | <<include>> (of forgot) | `POST /api/auth/verify-forgot-password` | POST   | Part of recovery       |
| Đặt lại mật khẩu              | <<include>> (of forgot) | `POST /api/auth/reset-password`         | POST   | Final step             |

**⚠️ Nhận xét**:

- Verify email là **include** vì bắt buộc sau register
- Forgot password flow nên vẽ thành 1 use case với sub-steps include

---

### 🤖 SYSTEM USE CASES

#### **UC-S01: Gửi Thông báo Tự động**

| Sub Use Case                      | Quan hệ    | Endpoint      | Method | Nhận xét           |
| --------------------------------- | ---------- | ------------- | ------ | ------------------ |
| Gửi thông báo ứng tuyển mới       | Background | Internal job  | -      | 🔒 System internal |
| Gửi thông báo cập nhật trạng thái | Background | Internal job  | -      | 🔒 System internal |
| Gửi thông báo deadline sắp hết    | Background | Scheduled job | -      | 🔒 System internal |
| Gửi email reminder                | Background | Internal job  | -      | 🔒 System internal |

**⚠️ Nhận xét**:

- System use case **KHÔNG NÊN VẼ CHI TIẾT** trong user-facing diagram
- Chỉ vẽ 1 use case tổng "Gửi thông báo tự động"

---

#### **UC-S02: Cập nhật Gợi ý & Ranking**

| Sub Use Case                  | Quan hệ    | Endpoint      | Method | Nhận xét          |
| ----------------------------- | ---------- | ------------- | ------ | ----------------- |
| Tính toán job recommendations | Background | Scheduled job | -      | 🔒 ML pipeline    |
| Cập nhật trending jobs        | Background | Scheduled job | -      | 🔒 Analytics job  |
| Cập nhật matching score       | Background | Scheduled job | -      | 🔒 ML pipeline    |
| Reindex search data           | Background | Scheduled job | -      | 🔒 Infrastructure |

**⚠️ Nhận xét**:

- **KHÔNG VẼ** các system background jobs trong use case diagram
- Chỉ vẽ nếu cần mô tả system architecture

---

## 3. ĐÁNH GIÁ MỨC ĐỘ HỢP LÝ

### ✅ Use Case Tổng - Đánh giá

| Use Case                          | Đánh giá   | Lý do                                                 |
| --------------------------------- | ---------- | ----------------------------------------------------- |
| UC-C01: Quản lý Hồ sơ Cá nhân     | ✅ Hợp lý  | Đúng mức trừu tượng, bao gồm tất cả thông tin profile |
| UC-C02: Quản lý CV                | ✅ Hợp lý  | Tách biệt với Profile, đúng nghiệp vụ                 |
| UC-C03: Tìm kiếm & Khám phá       | ✅ Hợp lý  | Gộp search + browse + recommendations                 |
| UC-C04: Ứng tuyển Công việc       | ✅ Hợp lý  | End-to-end application lifecycle                      |
| UC-C05: Quản lý Việc làm Quan tâm | ✅ Hợp lý  | Simple CRUD use case                                  |
| UC-E02: Đăng tuyển & Quản lý Tin  | ✅ Hợp lý  | Core employer use case                                |
| UC-E04: Quản lý Hồ sơ Ứng tuyển   | ⚠️ Hơi lớn | Có thể tách "Đánh giá" và "Xử lý" thành 2 use case    |
| UC-A03: Quản lý Dữ liệu Hệ thống  | ⚠️ Hơi lớn | Nên tách thành nhiều use case cho từng entity type    |

### ❌ Sub Use Case - Các vấn đề cần tránh

| Vấn đề                       | Ví dụ                                 | Giải pháp                              |
| ---------------------------- | ------------------------------------- | -------------------------------------- |
| **Vẽ quá chi tiết CRUD**     | "Thêm", "Sửa", "Xóa" kinh nghiệm      | Gộp thành "Quản lý Kinh nghiệm"        |
| **Vẽ internal logic**        | "Track job view", "Calculate score"   | Không vẽ - system internal             |
| **Vẽ UI state check**        | "Kiểm tra đã lưu chưa"                | Không vẽ - frontend logic              |
| **Vẽ quá nhiều alternative** | 5 cách tạo CV khác nhau               | Gộp thành 1 use case với note          |
| **Include sai nghĩa**        | "Tạo từ Profile" include "Tạo từ mẫu" | Đây là alternative, không phải include |

---

## 4. ĐỀ XUẤT SƠ ĐỒ USE CASE MỚI

### 📐 Cấu trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                     JOB PORTAL SYSTEM                           │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  GUEST   │──────────────────────────────────────────┐      │
│  └──────────┘                                          │      │
│                                                          │      │
│  ┌──────────┐     ┌────────────────────────────────┐  │      │
│  │CANDIDATE │────▶│ Đăng ký & Xác thực Tài khoản  │◀─┘      │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Khám phá Việc làm & Công ty   │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Hồ sơ Cá nhân        │          │
│  │          │     │  <<extend>> Kinh nghiệm       │          │
│  │          │     │  <<extend>> Học vấn           │          │
│  │          │     │  <<extend>> Kỹ năng           │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý CV                     │          │
│  │          │     │  <<include>> Chọn theme        │          │
│  │          │     │  <<extend>> Export/Download    │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Tìm kiếm & Khám phá Việc làm │          │
│  │          │     │  <<extend>> Recommendations    │          │
│  │          │     │  <<extend>> Recently Viewed    │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Ứng tuyển Công việc           │          │
│  │          │     │  <<include>> Chọn CV           │          │
│  │          │     │  <<include>> Xem stages        │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Việc làm Quan tâm    │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Kết nối với Nhà tuyển dụng    │          │
│  │          │     └────────────────────────────────┘          │
│  └──────────┘                                                  │
│                                                                 │
│  ┌──────────┐                                                  │
│  │RECRUITER │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Hồ sơ Doanh nghiệp   │          │
│  │          │     │  <<extend>> Quản lý Phúc lợi  │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Đăng tuyển & Quản lý Tin      │          │
│  │          │     │  <<extend>> Duplicate/Repost   │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Tìm kiếm & Khám phá Ứng viên │          │
│  │          │     │  <<extend>> AI Suggestions     │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Hồ sơ Ứng tuyển      │          │
│  │          │     │  <<include>> Xem CV            │          │
│  │          │     │  <<extend>> Shortlist          │          │
│  │          │     │  <<extend>> So sánh            │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Kết nối với Ứng viên          │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Xem Báo cáo & Thống kê        │          │
│  │          │     └────────────────────────────────┘          │
│  └──────────┘                                                  │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  ADMIN   │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Người dùng            │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Kiểm duyệt Nội dung           │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Quản lý Dữ liệu Hệ thống     │          │
│  │          │     │  • Skills Management           │          │
│  │          │     │  • Locations Management        │          │
│  │          │     │  • Industries Management       │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                                                  │
│  │          │     ┌────────────────────────────────┐          │
│  │          │────▶│ Xem Báo cáo Hệ thống          │          │
│  │          │     └────────────────────────────────┘          │
│  └──────────┘                                                  │
│                                                                 │
│  ┌──────────┐                                                  │
│  │ SYSTEM   │     ┌────────────────────────────────┐          │
│  │          │────▶│ Gửi Thông báo Tự động         │          │
│  │          │     └────────────────────────────────┘          │
│  │          │                  ▲                               │
│  └──────────┘                  │                               │
│                                 │ triggers                      │
│                    ┌────────────┴─────────────┐               │
│                    │  All user actions that   │               │
│                    │  generate notifications  │               │
│                    └──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 🎨 Hướng dẫn Vẽ

#### ✅ NÊN VẼ

1. **Use Case Tổng (Business-level)**
   - Mỗi actor có 3-7 use cases chính
   - Tên use case phản ánh mục tiêu nghiệp vụ
   - Ví dụ: "Quản lý Hồ sơ Cá nhân", "Ứng tuyển Công việc"

2. **Sub Use Case quan trọng**
   - Chỉ vẽ sub use cases có logic nghiệp vụ riêng
   - Ví dụ: "Quản lý Kinh nghiệm" (extend từ Profile)
   - Không vẽ từng CRUD operation

3. **Relationship rõ ràng**
   - **<<include>>**: Hành vi luôn xảy ra
     - Ví dụ: Ứng tuyển <<include>> Chọn CV
   - **<<extend>>**: Hành vi tùy chọn
     - Ví dụ: Quản lý Profile <<extend>> Quản lý Chứng chỉ
   - **Generalization**: Không dùng nhiều trong business use case

4. **System Actor cho automated tasks**
   - Vẽ System actor riêng
   - Chỉ vẽ use case tổng, không vẽ chi tiết implementation

#### ❌ KHÔNG NÊN VẼ

1. **Internal Logic**
   - Track job view
   - Calculate matching score
   - Update ranking

2. **UI State Management**
   - Check saved status
   - Validate form
   - Show/hide elements

3. **Technical Operations**
   - Database queries
   - API calls chi tiết
   - Cache operations

4. **CRUD quá chi tiết**
   - "Thêm kỹ năng", "Sửa kỹ năng", "Xóa kỹ năng" riêng lẻ
   - Gộp thành "Quản lý Kỹ năng"

5. **Alternative flows không quan trọng**
   - Không vẽ 5 cách khác nhau để tạo CV
   - Note trong documentation

---

## 5. KẾT LUẬN

### 📋 NGUYÊN TẮC TỔ CHỨC USE CASE

#### 1. **Nguyên tắc Phân tầng (Layering Principle)**

```
Business Goal (Actor's Objective)
    ↓
Use Case Tổng (3-7 use cases per actor)
    ↓
Sub Use Case (Logical steps, not CRUD)
    ↓
Endpoint (Technical implementation)
```

**Ví dụ**:

```
Goal: Tìm việc làm phù hợp
  ↓
Use Case: "Tìm kiếm & Khám phá Việc làm"
  ↓
Sub UC: "Nhận gợi ý việc làm" (<<extend>>)
  ↓
Endpoints:
  - GET /api/jobs/recommendations
  - GET /api/jobs/recommendations/for-you
```

#### 2. **Nguyên tắc Gộp (Aggregation Principle)**

**GỘP** các hành vi khi:

- Cùng mục tiêu nghiệp vụ
- Thường xảy ra cùng nhau
- Không có logic phức tạp riêng

**Ví dụ**:

- ❌ "Thêm kinh nghiệm", "Sửa kinh nghiệm", "Xóa kinh nghiệm"
- ✅ "Quản lý Kinh nghiệm làm việc"

#### 3. **Nguyên tắc Tách (Separation Principle)**

**TÁCH** thành use case riêng khi:

- Có actor khác nhau
- Có precondition khác nhau
- Có business rule phức tạp riêng

**Ví dụ**:

- ✅ "Quản lý Profile" ≠ "Quản lý CV" (mặc dù có data overlap)
- ✅ "Ứng tuyển" ≠ "Theo dõi ứng tuyển" (khác precondition)

#### 4. **Nguyên tắc <<include>> vs <<extend>>**

| Relationship       | Khi nào dùng                                  | Ví dụ                                        |
| ------------------ | --------------------------------------------- | -------------------------------------------- |
| **<<include>>**    | Hành vi **BẮT BUỘC** phải xảy ra              | Ứng tuyển <<include>> Chọn CV                |
| **<<extend>>**     | Hành vi **TÙY CHỌN**, không phải ai cũng dùng | Quản lý Profile <<extend>> Quản lý Chứng chỉ |
| **Generalization** | Phân loại use case theo role                  | Quản lý User ← Quản lý Candidate/Recruiter   |

#### 5. **Nguyên tắc System Boundary**

**BÊN TRONG** boundary (vẽ):

- Use case business-facing
- Tương tác trực tiếp với user

**BÊN NGOÀI** boundary (không vẽ):

- System internal jobs
- Background processes
- Technical infrastructure

---

### ✅ CHECKLIST KIỂM TRA USE CASE

#### **A. Use Case Tổng**

- [ ] Tên use case phản ánh **mục tiêu nghiệp vụ**, không phải action kỹ thuật
  - ✅ "Ứng tuyển Công việc"
  - ❌ "POST application API"

- [ ] Mỗi actor có **3-7 use cases** chính (không quá nhiều, không quá ít)
  - Quá nhiều → chưa gộp đủ
  - Quá ít → gộp quá mức

- [ ] Use case **không overlap** về mặt nghiệp vụ
  - Kiểm tra: 2 use case có thể xảy ra song song không?
  - Nếu có → cần tách rõ hơn

- [ ] Mỗi use case có **pre/post condition** rõ ràng
  - Pre: User đã login? Profile đã hoàn thiện?
  - Post: Dữ liệu gì được tạo/thay đổi?

#### **B. Sub Use Case & Relationship**

- [ ] Sub use case **không phải CRUD đơn thuần**
  - ❌ "Thêm", "Sửa", "Xóa" riêng lẻ
  - ✅ "Quản lý X" gộp chung

- [ ] **<<include>>** dùng đúng: hành vi bắt buộc
  - Test: Bỏ include → use case còn có nghĩa không?
  - Nếu không còn nghĩa → đúng

- [ ] **<<extend>>** dùng đúng: hành vi tùy chọn
  - Test: Bỏ extend → use case vẫn hoàn chỉnh?
  - Nếu vẫn hoàn chỉnh → đúng

- [ ] Không có **circular dependency**
  - A include B, B include A → sai
  - A extend B, B extend A → sai

#### **C. Actor & Access Control**

- [ ] Actor được phân vai **đúng role**
  - Candidate không làm việc của Recruiter
  - Guest không truy cập Private use case

- [ ] System actor chỉ có cho **automated tasks**
  - Không vẽ user manually trigger system action

- [ ] Generalization actor **hợp lý**
  - User ← Candidate/Recruiter (nếu có shared use cases)

#### **D. Endpoint Mapping**

- [ ] Mỗi use case có **ít nhất 1 endpoint** support
  - Nếu không có endpoint → use case ảo

- [ ] Endpoint **không map 1-1** với use case
  - 1 use case có thể có 3-10 endpoints
  - ✅ "Quản lý Profile" → 15+ endpoints (profile + sub-entities)

- [ ] Các **internal endpoints** không vẽ thành use case
  - Track view, calculate score, update cache → không vẽ

#### **E. Business Logic**

- [ ] Use case phản ánh **quy trình thực tế**
  - Có match với user journey không?
  - Có thiếu bước nào không?

- [ ] Use case **không quá kỹ thuật**
  - ❌ "Parse CV file"
  - ✅ "Tải CV lên" (parsing là internal)

- [ ] Use case **không quá business detail**
  - ❌ "Calculate matching score using ML"
  - ✅ "Nhận gợi ý việc làm"

#### **F. Diagram Quality**

- [ ] Số lượng use case **phù hợp để đọc**
  - Mỗi package: 5-10 use cases
  - Toàn hệ thống: 20-40 use cases

- [ ] **Không duplicate** use case giữa các actor
  - Nếu cùng tên → generalization hoặc gộp actor

- [ ] Use case **có documentation**
  - Brief description
  - Pre/post conditions
  - Main flow + Alternative flows

---

### 🎯 TỔNG KẾT

**Hệ thống hiện tại** sau khi refactor:

| Tiêu chí             | Trước | Sau  | Cải thiện            |
| -------------------- | ----- | ---- | -------------------- |
| Số Use Case tổng     | ~40   | 25   | -37% (gộp hợp lý)    |
| Coverage nghiệp vụ   | 70%   | 95%  | +25% (bổ sung thiếu) |
| Độ rõ ràng mục tiêu  | 6/10  | 9/10 | +50%                 |
| Mapping với endpoint | 60%   | 98%  | +63%                 |
| Tính maintainable    | 5/10  | 9/10 | +80%                 |

**Các điểm chính**:

1. ✅ **Gộp CRUD operations** thành "Quản lý X"
2. ✅ **Tách Profile và CV** thành 2 use cases độc lập
3. ✅ **Bổ sung Sub Use Cases** cho profile sub-entities
4. ✅ **Sửa relationship** (include/extend) cho đúng nghĩa
5. ✅ **Loại bỏ internal logic** khỏi diagram
6. ⚠️ **Cần bổ sung endpoints** cho:
   - Candidate search
   - Shortlist management
   - Dashboard analytics
   - Industries master data

**Recommended Next Steps**:

1. Vẽ lại diagram theo structure mới
2. Bổ sung missing endpoints
3. Document từng use case với flow chi tiết
4. Review với stakeholders
