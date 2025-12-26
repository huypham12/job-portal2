User: Bạn đóng vai Backend Architect / System Analyst.

Tôi cung cấp cho bạn:

Danh sách các endpoint backend (đã được tổng hợp từ các file \*.route.ts, mô tả rõ method, path và chức năng).

Sơ đồ Use Case (trong hình ảnh đính kèm).

Nhiệm vụ của bạn:

1. Đối chiếu Use Case ↔ Endpoint

Kiểm tra từng use case trong sơ đồ:

Đã được support đầy đủ bởi các endpoint hiện có hay chưa.

Use case nào thiếu endpoint tương ứng.

Endpoint nào tồn tại nhưng không được thể hiện trong use case.

2. Đánh giá tính đúng đắn của sơ đồ Use Case

Actor có được phân vai đúng trách nhiệm (User, Employer, Admin, System…) hay không.

Quan hệ giữa các use case (include / extend / generalization) có hợp lý về mặt nghiệp vụ không.

Use case có bị:

Vẽ quá chi tiết (đáng ra là internal logic)?

Hoặc quá sơ sài (thiếu các hành vi quan trọng)?

3. Phát hiện các vấn đề nghiệp vụ

Use case thiếu so với một Job Portal chuẩn.

Use case trùng lặp hoặc chồng chéo ý nghĩa.

Use case được vẽ nhưng không nên expose thành API.

4. Kết luận & đề xuất

Sơ đồ hiện tại:

✅ Đã phản ánh đúng hệ thống

⚠️ Đúng nhưng chưa đầy đủ

❌ Sai về mặt phân tích nghiệp vụ

Đề xuất:

Use case cần thêm / gộp / tách / loại bỏ.

Endpoint cần bổ sung hoặc chỉnh sửa để khớp use case.

Yêu cầu đầu ra

Trình bày theo bảng:

Use Case | Actor | Endpoint liên quan | Trạng thái | Nhận xét

Kết luận ngắn gọn ở cuối, tập trung vào độ chuẩn của sơ đồ và mức độ bao phủ chức năng.

GitHub Copilot: # Phân tích Use Case ↔ Endpoint - Job Portal System

## 1. BẢNG ĐỐI CHIẾU CHI TIẾT

### Module: Quản lý Ứng tuyển

| Use Case                              | Actor          | Endpoint liên quan                                                          | Trạng thái | Nhận xét             |
| ------------------------------------- | -------------- | --------------------------------------------------------------------------- | ---------- | -------------------- |
| Xem danh sách việc làm đang ứng tuyển | Ứng viên       | `GET /api/applications`                                                     | ✅ Đầy đủ  | Đúng nghiệp vụ       |
| Xem thông tin nhà tuyển dụng          | Ứng viên       | `GET /api/companies/:id`                                                    | ✅ Đầy đủ  | Hợp lý               |
| Xem thông tin việc làm                | Ứng viên       | `GET /api/jobs/:id/public`                                                  | ✅ Đầy đủ  | Đúng                 |
| Nộp đơn ứng tuyển                     | Ứng viên       | `POST /api/applications`                                                    | ✅ Đầy đủ  | Đúng                 |
| Theo dõi trạng thái ứng tuyển         | Ứng viên       | `GET /api/applications/:id`<br>`GET /api/applications/:id/stages`           | ✅ Đầy đủ  | Hợp lý               |
| Rút đơn ứng tuyển                     | Ứng viên       | `DELETE /api/applications/:id`                                              | ✅ Đầy đủ  | Đúng                 |
| Xem danh sách hồ sơ ứng tuyển         | Nhà tuyển dụng | `GET /api/applications/job/:jobId`                                          | ✅ Đầy đủ  | Đúng                 |
| Xem CV                                | Nhà tuyển dụng | `GET /api/applications/:id/cv`                                              | ✅ Đầy đủ  | Đúng                 |
| Liên hệ với ứng viên                  | Nhà tuyển dụng | `POST /api/applications/:id/contact`                                        | ✅ Đầy đủ  | Hợp lý               |
| Cập nhật trạng thái ứng tuyển         | Nhà tuyển dụng | `PATCH /api/applications/:id/status`<br>`PATCH /api/applications/:id/stage` | ✅ Đầy đủ  | Đúng                 |
| So sánh các hồ sơ ứng tuyển           | Nhà tuyển dụng | `POST /api/applications/compare`                                            | ✅ Đầy đủ  | Feature nâng cao tốt |

### Module: Quản lý Profile

| Use Case                            | Actor    | Endpoint liên quan                                            | Trạng thái        | Nhận xét                                      |
| ----------------------------------- | -------- | ------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| Tạo Profile                         | Ứng viên | `POST /api/user/me/profile`                                   | ✅ Đầy đủ         | Đúng                                          |
| Chỉnh sửa Profile                   | Ứng viên | `PUT /api/user/me/profile`                                    | ✅ Đầy đủ         | Đúng                                          |
| Xem chi tiết Profile                | Ứng viên | `GET /api/user/me/profile`                                    | ✅ Đầy đủ         | Đúng                                          |
| Theo dõi tiến độ hoàn thành profile | Ứng viên | `GET /api/user/me/profile/completeness`                       | ✅ Đầy đủ         | Feature tốt                                   |
| **[THIẾU] Quản lý kinh nghiệm**     | Ứng viên | `GET/POST/PUT/DELETE /api/user/me/profile/experiences/:id`    | ⚠️ Không thể hiện | Sub-entity quan trọng bị thiếu trong Use Case |
| **[THIẾU] Quản lý học vấn**         | Ứng viên | `GET/POST/PUT/DELETE /api/user/me/profile/educations/:id`     | ⚠️ Không thể hiện | Sub-entity quan trọng bị thiếu                |
| **[THIẾU] Quản lý kỹ năng**         | Ứng viên | `GET/POST/PUT/DELETE /api/user/me/profile/skills/:id`         | ⚠️ Không thể hiện | Sub-entity quan trọng bị thiếu                |
| **[THIẾU] Quản lý chứng chỉ**       | Ứng viên | `GET/POST/PUT/DELETE /api/user/me/profile/certifications/:id` | ⚠️ Không thể hiện | Sub-entity quan trọng bị thiếu                |

### Module: Xem nội dung công khai (Guest)

| Use Case               | Actor | Endpoint liên quan                          | Trạng thái | Nhận xét |
| ---------------------- | ----- | ------------------------------------------- | ---------- | -------- |
| Xem nội dung công khai | Guest | `GET /api/jobs`<br>`GET /api/companies/:id` | ✅ Đầy đủ  | Đúng     |
| Xác thực và định danh  | Guest | Toàn bộ `/api/auth`                         | ✅ Đầy đủ  | Đúng     |

### Module: Quản lý Ứng tuyển (Employer)

| Use Case                         | Actor          | Endpoint liên quan                                                        | Trạng thái        | Nhận xét                    |
| -------------------------------- | -------------- | ------------------------------------------------------------------------- | ----------------- | --------------------------- |
| Quản lý ứng tuyển                | Nhà tuyển dụng | Module `/api/applications` (recruiter part)                               | ✅ Đầy đủ         | Đúng                        |
| Theo dõi việc làm và kết nối     | Nhà tuyển dụng | `GET /api/jobs/:id/stats`<br>`GET /api/connection-interests`              | ✅ Đầy đủ         | Hợp lý                      |
| **[THIẾU] Shortlist candidates** | Nhà tuyển dụng | `POST /api/applications/shortlist`<br>`GET /api/applications/shortlisted` | ⚠️ Không thể hiện | Feature quan trọng bị thiếu |

### Module: Mạng lưới tuyển dụng

| Use Case                                  | Actor          | Endpoint liên quan                                        | Trạng thái | Nhận xét               |
| ----------------------------------------- | -------------- | --------------------------------------------------------- | ---------- | ---------------------- |
| Lưu job                                   | Ứng viên       | `POST /api/saved-jobs`<br>`DELETE /api/saved-jobs/:jobId` | ✅ Đầy đủ  | Đúng                   |
| Bỏ lưu job                                | Ứng viên       | `DELETE /api/saved-jobs/:jobId`                           | ✅ Đầy đủ  | Đúng                   |
| Xem danh sách job đã lưu                  | Ứng viên       | `GET /api/saved-jobs`                                     | ✅ Đầy đủ  | Đúng                   |
| Xem danh sách lời mời đã gửi              | Ứng viên       | **THIẾU ENDPOINT**                                        | ❌ Thiếu   | Use case không rõ ràng |
| Gửi lời mời kết nối với ứng viên          | Nhà tuyển dụng | `POST /api/connection-interests`                          | ✅ Đầy đủ  | Đúng                   |
| Xem danh sách nhà tuyển dụng muốn kết nối | Ứng viên       | `GET /api/connection-interests`                           | ✅ Đầy đủ  | Đúng                   |
| Xem hồ sơ công khai của ứng viên          | Nhà tuyển dụng | `GET /api/user/profiles/:id/public`                       | ✅ Đầy đủ  | Đúng                   |

### Module: Tìm kiếm & Gợi ý

| Use Case                          | Actor          | Endpoint liên quan                                                              | Trạng thái        | Nhận xét                     |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------- | ----------------- | ---------------------------- |
| Tìm kiếm (Việc làm)               | Ứng viên       | `GET /api/search/jobs`                                                          | ⚠️ Access chưa rõ | Cần xác nhận Public/Private  |
| Tìm kiếm (Công ty)                | Ứng viên       | **THIẾU ENDPOINT**                                                              | ❌ Thiếu          | Cần bổ sung search companies |
| Xem lịch sử tìm kiếm              | Ứng viên       | `GET /api/search/recent`                                                        | ⚠️ Access chưa rõ | Nên là Private               |
| Xóa lịch sử tìm kiếm              | Ứng viên       | `DELETE /api/search/recent`                                                     | ⚠️ Access chưa rõ | Nên là Private               |
| Xem việc làm nổi bật              | Ứng viên       | `GET /api/jobs/featured`<br>`GET /api/jobs/popular`<br>`GET /api/jobs/trending` | ✅ Đầy đủ         | Đúng                         |
| Nhận đề xuất ứng viên             | Nhà tuyển dụng | `GET /api/jobs/:id/suggested-candidates`                                        | ✅ Đầy đủ         | Đúng                         |
| Nhận đề xuất việc làm cá nhân hóa | Ứng viên       | `GET /api/jobs/recommendations`<br>`GET /api/jobs/recommendations/for-you`      | ✅ Đầy đủ         | Feature tốt                  |
| Tìm kiếm ứng viên                 | Nhà tuyển dụng | **THIẾU ENDPOINT**                                                              | ❌ Thiếu          | Cần bổ sung candidate search |

### Module: Quản lý Tài khoản (Admin)

| Use Case                | Actor | Endpoint liên quan                | Trạng thái | Nhận xét |
| ----------------------- | ----- | --------------------------------- | ---------- | -------- |
| Khóa tài khoản          | Admin | `PATCH /api/admin/users/:userId`  | ✅ Đầy đủ  | Đúng     |
| Xóa tài khoản           | Admin | `DELETE /api/admin/users/:userId` | ✅ Đầy đủ  | Đúng     |
| Xem thông tin tài khoản | Admin | `GET /api/admin/users/:userId`    | ✅ Đầy đủ  | Đúng     |
| Xem danh sách tài khoản | Admin | `GET /api/admin/users`            | ✅ Đầy đủ  | Đúng     |

### Module: Quản lý Hồ sơ Doanh nghiệp

| Use Case                        | Actor          | Endpoint liên quan                                             | Trạng thái        | Nhận xét                       |
| ------------------------------- | -------------- | -------------------------------------------------------------- | ----------------- | ------------------------------ |
| Xem thông tin doanh nghiệp      | Nhà tuyển dụng | `GET /api/companies/me`                                        | ✅ Đầy đủ         | Đúng                           |
| Tạo hồ sơ doanh nghiệp          | Nhà tuyển dụng | `POST /api/companies`                                          | ✅ Đầy đủ         | Đúng                           |
| Cập nhật thông tin doanh nghiệp | Nhà tuyển dụng | `PATCH /api/companies/me`<br>`PATCH /api/companies/me/details` | ✅ Đầy đủ         | Đúng                           |
| **[THIẾU] Quản lý phúc lợi**    | Nhà tuyển dụng | `GET/POST/PATCH/DELETE /api/companies/me/benefits`             | ⚠️ Không thể hiện | Sub-entity quan trọng bị thiếu |

### Module: Quản lý Đăng tin

| Use Case                     | Actor          | Endpoint liên quan                                     | Trạng thái | Nhận xét           |
| ---------------------------- | -------------- | ------------------------------------------------------ | ---------- | ------------------ |
| Đăng tin tuyển dụng          | Nhà tuyển dụng | `POST /api/jobs`                                       | ✅ Đầy đủ  | Đúng               |
| Chỉnh sửa tin tuyển dụng     | Nhà tuyển dụng | `PUT /api/jobs/:id`                                    | ✅ Đầy đủ  | Đúng               |
| Xóa tin tuyển dụng           | Nhà tuyển dụng | `DELETE /api/jobs/:id`                                 | ✅ Đầy đủ  | Đúng (soft delete) |
| Xem danh sách tin đã đăng    | Nhà tuyển dụng | `GET /api/jobs/my-jobs`                                | ✅ Đầy đủ  | Đúng               |
| Duyệt tin tuyển dụng         | Admin          | `PATCH /api/admin/jobs/:id/approve`                    | ✅ Đầy đủ  | Đúng               |
| Gỡ tin vi phạm               | Admin          | `DELETE /api/admin/jobs/:id/violation`                 | ✅ Đầy đủ  | Đúng               |
| Gán nhãn tin tuyển dụng      | Admin          | `PATCH /api/admin/jobs/:id/label`                      | ✅ Đầy đủ  | Đúng               |
| Xem danh sách tin tuyển dụng | Admin          | `GET /api/admin/jobs`<br>`GET /api/admin/jobs/pending` | ✅ Đầy đủ  | Đúng               |

### Module: Quản lý CV

| Use Case                | Actor    | Endpoint liên quan                                                | Trạng thái | Nhận xét                    |
| ----------------------- | -------- | ----------------------------------------------------------------- | ---------- | --------------------------- |
| Tạo CV từ Profile       | Ứng viên | `POST /api/resumes/from-profile`                                  | ✅ Đầy đủ  | Feature tốt                 |
| Tạo CV theo mẫu         | Ứng viên | `POST /api/resumes`<br>`GET /api/resumes/themes`                  | ✅ Đầy đủ  | Đúng (include relationship) |
| Chỉnh sửa CV            | Ứng viên | `PUT /api/resumes/:id`                                            | ✅ Đầy đủ  | Đúng                        |
| Xóa CV                  | Ứng viên | `DELETE /api/resumes/:id`                                         | ✅ Đầy đủ  | Đúng                        |
| Tải lên CV              | Ứng viên | `POST /api/resumes/upload`                                        | ✅ Đầy đủ  | Đúng (auto parse)           |
| Xuất CV                 | Ứng viên | `POST /api/resumes/:id/export`<br>`GET /api/resumes/:id/download` | ✅ Đầy đủ  | Đúng                        |
| Đặt CV làm CV mặc định  | Ứng viên | `PATCH /api/resumes/:id/default`                                  | ✅ Đầy đủ  | Feature tốt                 |
| Xem danh sách CV đã tạo | Ứng viên | `GET /api/resumes`                                                | ✅ Đầy đủ  | Đúng                        |

### Module: Báo cáo & Thống kê

| Use Case                                  | Actor          | Endpoint liên quan                       | Trạng thái | Nhận xét                            |
| ----------------------------------------- | -------------- | ---------------------------------------- | ---------- | ----------------------------------- |
| Xem báo cáo hiệu quả đăng tin             | Nhà tuyển dụng | `GET /api/jobs/:id/stats`                | ✅ Đầy đủ  | Đúng                                |
| Xem báo cáo hồ sơ ứng tuyển               | Nhà tuyển dụng | `GET /api/applications/job/:jobId/stats` | ✅ Đầy đủ  | Đúng                                |
| **[THIẾU] Dashboard tổng quan**           | Nhà tuyển dụng | **THIẾU ENDPOINT**                       | ❌ Thiếu   | Cần endpoint dashboard analytics    |
| **[THIẾU] Báo cáo doanh thu/gói dịch vụ** | Admin          | **THIẾU ENDPOINT**                       | ❌ Thiếu   | Module Payment/Subscription chưa có |

---

## 2. PHÂN TÍCH TÍNH ĐÚNG ĐẮN CỦA SƠ ĐỒ USE CASE

### ✅ Điểm Mạnh

1. **Phân vai Actor rõ ràng**:
   - Ứng viên, Nhà tuyển dụng, Admin, Guest được tách biệt đúng
   - System actor cho các tác vụ tự động (notifications, alerts)

2. **Các module chính được cover đầy đủ**:
   - Auth & Account Management
   - Profile & CV Management
   - Job Posting & Application
   - Search & Recommendations
   - Company Management

3. **Relationship hợp lý**:
   - "Tạo CV từ Profile" `<<include>>` "Tạo CV theo mẫu" ✅
   - Use case phân cấp đúng (ví dụ: Quản lý Profile → các sub-use cases)

### ⚠️ Vấn đề Cần Cải Thiện

#### A. Use Case thiếu so với Endpoint

| Use Case thiếu                   | Endpoint tương ứng                      | Mức độ quan trọng |
| -------------------------------- | --------------------------------------- | ----------------- |
| **Quản lý Kinh nghiệm làm việc** | `/api/user/me/profile/experiences/*`    | 🔴 Cao            |
| **Quản lý Học vấn**              | `/api/user/me/profile/educations/*`     | 🔴 Cao            |
| **Quản lý Kỹ năng**              | `/api/user/me/profile/skills/*`         | 🔴 Cao            |
| **Quản lý Chứng chỉ**            | `/api/user/me/profile/certifications/*` | 🟡 Trung bình     |
| **Quản lý Giải thưởng**          | `/api/user/me/profile/awards/*`         | 🟢 Thấp           |
| **Quản lý Phúc lợi công ty**     | `/api/companies/me/benefits/*`          | 🟡 Trung bình     |
| **Shortlist Candidates**         | `/api/applications/shortlist*`          | 🔴 Cao            |
| **Bulk Operations (Jobs)**       | `/api/jobs/bulk-*`                      | 🟡 Trung bình     |
| **Tìm kiếm Công ty**             | Chưa có endpoint                        | 🟡 Trung bình     |
| **Tìm kiếm Ứng viên**            | Chưa có endpoint                        | 🔴 Cao            |
| **Upload Avatar/Logo**           | `/api/uploads/*`                        | 🟡 Trung bình     |
| **Track Job Views**              | `POST /api/jobs/:id/view`               | 🟢 Thấp           |
| **Recently Viewed Jobs**         | `/api/jobs/recently-viewed*`            | 🟡 Trung bình     |

#### B. Use Case được vẽ quá chi tiết (Internal Logic)

| Use Case                        | Vấn đề                                     | Đề xuất                                         |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| "Theo dõi trạng thái ứng tuyển" | Quá chi tiết, chỉ là GET data              | Gộp vào "Xem danh sách việc làm đang ứng tuyển" |
| "Xem lịch sử tìm kiếm"          | Internal feature, không cần use case riêng | Gộp vào "Tìm kiếm"                              |

#### C. Use Case mơ hồ hoặc không đúng nghiệp vụ

| Use Case                       | Vấn đề                                                     | Sửa đề xuất                         |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------------- |
| "Xem danh sách lời mời đã gửi" | Không rõ là "lời mời ứng tuyển" hay "connection interest"? | Tách thành 2 use case riêng hoặc bỏ |
| "Xác thực và định danh"        | Quá kỹ thuật, không phải business use case                 | Đổi thành "Đăng nhập/Đăng ký"       |

#### D. Relationship sai hoặc thiếu

| Vấn đề                                  | Hiện tại       | Nên là                                          |
| --------------------------------------- | -------------- | ----------------------------------------------- |
| "Tạo CV từ Profile" → "Tạo CV theo mẫu" | `<<include>>`  | ❌ Sai. Đây là 2 luồng riêng biệt (alternative) |
| Profile sub-entities                    | Không thể hiện | Nên có `<<extend>>` từ "Chỉnh sửa Profile"      |

---

## 3. PHÁT HIỆN VẤN ĐỀ NGHIỆP VỤ

### ❌ Module/Feature hoàn toàn thiếu

1. **Notification System** (🔴 Rất quan trọng)
   - Endpoint đã có (`/api/notifications`) nhưng **không có use case nào**
   - Thiếu: "Xem thông báo", "Đánh dấu đã đọc", "Cài đặt thông báo"

2. **Matching System** (🟡 Quan trọng)
   - Endpoint có (`/api/matching`) nhưng không rõ access control
   - Use case "Nhận đề xuất" chỉ đủ phần surface, thiếu logic sâu

3. **Locations Module** (🟡 Quan trọng)
   - Endpoint có (`/api/locations`) nhưng không có use case
   - Nên có: "Quản lý địa điểm" (cho admin seeding data)

4. **Skills Management** (🟡 Quan trọng)
   - Endpoint có (`/api/skills`) nhưng không có use case admin
   - Thiếu: "Quản lý danh mục kỹ năng" (admin CRUD skills)

5. **Payment & Subscription** (🔴 Nếu có monetization)
   - Hoàn toàn thiếu cả endpoint lẫn use case
   - Cần: "Mua gói dịch vụ", "Quản lý thanh toán", "Gia hạn gói"

6. **Messaging System** (🟡 Nếu có chat)
   - Thiếu hoàn toàn
   - Connection Interest chỉ là "gửi quan tâm", không có messaging

### ⚠️ Use case trùng lặp/chồng chéo

| Use Case 1                 | Use Case 2                        | Vấn đề                                              |
| -------------------------- | --------------------------------- | --------------------------------------------------- |
| "Xem danh sách job đã lưu" | "Lưu job" / "Bỏ lưu job"          | Nên gộp thành 1 use case "Quản lý Saved Jobs"       |
| "Tạo hồ sơ doanh nghiệp"   | "Cập nhật thông tin doanh nghiệp" | Profile creation thường là 1 lần, sau đó chỉ update |

### 🔍 Use case không nên expose thành API

| Use Case | Lý do                                         |
| -------- | --------------------------------------------- |
| N/A      | Tất cả use case hiện tại đều hợp lý để có API |

---

## 4. KẾT LUẬN & ĐỀ XUẤT

### 📊 Đánh giá tổng quan

**Trạng thái**: ⚠️ **Đúng nhưng chưa đầy đủ** (75/100 điểm)

| Tiêu chí                       | Điểm | Nhận xét                                         |
| ------------------------------ | ---- | ------------------------------------------------ |
| **Phân vai Actor**             | 9/10 | Rõ ràng, đúng trách nhiệm                        |
| **Coverage Module chính**      | 7/10 | Thiếu Notifications, Matching, Skills Management |
| **Sub-entities trong Profile** | 4/10 | Thiếu hầu hết sub-entities quan trọng            |
| **Relationship logic**         | 6/10 | Có 1 số relationship không chính xác             |
| **Tính đầy đủ nghiệp vụ**      | 7/10 | Thiếu Payment, Messaging, Advanced Search        |

### 🎯 Đề xuất ưu tiên

#### Priority 1 (🔴 Bắt buộc)

1. **Bổ sung Use Case cho Profile Sub-entities**

   ```
   - Quản lý Kinh nghiệm làm việc (CRUD)
   - Quản lý Học vấn (CRUD)
   - Quản lý Kỹ năng (CRUD)
   - Quản lý Chứng chỉ (CRUD)
   ```

2. **Thêm Notification System Use Cases**

   ```
   - Xem danh sách thông báo
   - Đánh dấu thông báo đã đọc
   - Cài đặt preferences nhận thông báo
   ```

3. **Bổ sung Candidate Search cho Recruiter**

   ```
   Endpoint cần thêm: GET /api/search/candidates
   Use Case: "Tìm kiếm ứng viên" (Nhà tuyển dụng)
   ```

4. **Thêm Shortlist Management Use Case**
   ```
   - Thêm ứng viên vào shortlist
   - Quản lý danh sách ứng viên shortlist
   ```

#### Priority 2 (🟡 Nên có)

5. **Company Search Use Case**

   ```
   Endpoint cần thêm: GET /api/search/companies
   Use Case: "Tìm kiếm công ty" (Ứng viên)
   ```

6. **Skills & Locations Admin Management**

   ```
   Use Case: "Quản lý danh mục kỹ năng" (Admin)
   Use Case: "Quản lý địa điểm" (Admin)
   ```

7. **Upload Management**

   ```
   Use Case: "Upload Avatar/Documents" (tích hợp vào các use case hiện có)
   ```

8. **Recently Viewed Jobs**
   ```
   Use Case: "Xem lịch sử việc làm đã xem" (Ứng viên)
   ```

#### Priority 3 (🟢 Nice to have)

9. **Payment & Subscription Module** (nếu có monetization)

   ```
   - Mua gói dịch vụ
   - Quản lý lịch sử thanh toán
   - Nâng cấp/Gia hạn gói
   ```

10. **Messaging System** (nếu có chat feature)
    ```
    - Gửi tin nhắn cho ứng viên/recruiter
    - Xem lịch sử tin nhắn
    ```

### 🔧 Chỉnh sửa Use Case hiện có

| Use Case                        | Action           | Lý do                                           |
| ------------------------------- | ---------------- | ----------------------------------------------- |
| "Tạo CV từ Profile"             | Sửa relationship | Không phải `<<include>>` mà là alternative flow |
| "Xác thực và định danh"         | Đổi tên          | → "Đăng nhập/Đăng ký tài khoản"                 |
| "Xem danh sách lời mời đã gửi"  | Làm rõ hoặc bỏ   | Không rõ nghiệp vụ                              |
| "Theo dõi trạng thái ứng tuyển" | Gộp              | → Vào "Xem chi tiết ứng tuyển"                  |

### 📋 Endpoint cần bổ sung

```typescript
// Priority 1
GET / api / search / candidates // Tìm kiếm ứng viên
GET / api / notifications // Lấy danh sách thông báo (đã có)
POST / api / notifications / preferences // Cài đặt thông báo

// Priority 2
GET / api / search / companies // Tìm kiếm công ty
POST / api / admin / skills // Admin CRUD skills
POST / api / admin / locations // Admin CRUD locations

// Priority 3
POST / api / payments / checkout // Thanh toán
GET / api / subscriptions / my - plan // Xem gói hiện tại
POST / api / messages // Gửi tin nhắn
```

---

## 5. RECOMMENDATION: Use Case Diagram V2

Nên tổ chức lại theo **module-based packages**:

```
📦 Authentication & Account
  ├─ Đăng nhập/Đăng ký
  ├─ Quên/Đặt lại mật khẩu
  └─ Quản lý tài khoản (Admin)

📦 Profile Management (Candidate)
  ├─ Quản lý thông tin cơ bản
  ├─ Quản lý Kinh nghiệm <<extend>>
  ├─ Quản lý Học vấn <<extend>>
  ├─ Quản lý Kỹ năng <<extend>>
  └─ Theo dõi độ hoàn thiện profile

📦 CV Management
  ├─ Tạo CV (theo mẫu/từ profile)
  ├─ Quản lý CV
  └─ Export/Download CV

📦 Job & Application
  ├─ Tìm kiếm & Xem việc làm
  ├─ Nộp đơn ứng tuyển
  ├─ Theo dõi ứng tuyển
  └─ Quản lý saved jobs

📦 Employer Operations
  ├─ Quản lý hồ sơ doanh nghiệp
  ├─ Đăng & Quản lý tin tuyển dụng
  ├─ Quản lý ứng tuyển (shortlist, review, contact)
  ├─ Tìm kiếm ứng viên
  └─ Xem báo cáo & thống kê

📦 Networking
  ├─ Connection Interests
  ├─ Xem profile công khai
  └─ [Future] Messaging

📦 Notifications & Alerts
  ├─ Xem thông báo
  ├─ Cài đặt thông báo
  └─ [System] Gửi alerts tự động

📦 Admin Operations
  ├─ Quản lý tài khoản
  ├─ Duyệt tin tuyển dụng
  └─ Quản lý master data (skills, locations)
```

---

**Tóm lại**: Sơ đồ Use Case hiện tại đã capture được ~70% nghiệp vụ cốt lõi, nhưng thiếu nhiều sub-features quan trọng (Profile sub-entities, Notifications, Candidate Search). Cần update diagram và bổ sung endpoints để đạt mức hoàn thiện 95%+.
