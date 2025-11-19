# Tóm tắt các File Seed đã được tạo

Dựa trên phân tích schema Prisma, đã tạo thêm các file seed còn thiếu để đảm bảo có dữ liệu đầy đủ cho tất cả các bảng trong hệ thống job portal.

## Files Seed đã có sẵn:

1. `seed-locations.ts` - Provinces và Districts
2. `seed-skills.ts` - Kỹ năng
3. `seed-tags.ts` - Thẻ tags cho jobs
4. `seed-users.ts` - Users, Profiles và Companies
5. `seed-jobs.ts` - Job postings
6. `seed-resumes.ts` - Hồ sơ ứng viên
7. `seed-applications.ts` - Đơn ứng tuyển
8. `seed-profile-skills.ts` - Kỹ năng của ứng viên
9. `seed-profile-experiences.ts` - Kinh nghiệm làm việc
10. `seed-profile-educations.ts` - Học vấn

## Files Seed MỚI được tạo:

### 1. `seed-company-metadata.ts`

**Mục đích**: Seed dữ liệu metadata chi tiết cho companies
**Bao gồm**:

- `company_details`: Thông tin chi tiết công ty (industry, founded_year, employee_count, website, headquarters, etc.)
- `company_benefits`: Phúc lợi công ty (health, bonus, vacation, remote, training, etc.)
- `company_cultures`: Văn hóa công ty (work_life_balance, innovation, diversity, etc.)

**Dữ liệu tạo**:

- 20 companies với thông tin chi tiết
- 2-5 benefits mỗi company
- 2-4 culture aspects mỗi company

### 2. `seed-job-metadata.ts`

**Mục đích**: Seed dữ liệu metadata chi tiết cho jobs
**Bao gồm**:

- `job_requirements`: Yêu cầu công việc (education, skill, certification, language)
- `job_benefits`: Phúc lợi của job (health, bonus, vacation, remote, training)
- `job_work_arrangements`: Sắp xếp công việc (remote, flexible_hours, travel, overtime, shift)

**Dữ liệu tạo**:

- 50 jobs với requirements chi tiết (3-7 requirements mỗi job)
- 50 jobs với benefits chi tiết (2-6 benefits mỗi job)
- 50 jobs với work arrangements

### 3. `seed-application-metadata.ts`

**Mục đích**: Seed dữ liệu metadata chi tiết cho applications
**Bao gồm**:

- `application_stages`: Các giai đoạn tuyển dụng (screening, phone_interview, technical_test, final_interview, background_check)
- `application_documents`: Tài liệu đính kèm (cover_letter, portfolio, certificate, transcript, reference_letter)

**Dữ liệu tạo**:

- 100 applications với stages chi tiết (3-5 stages mỗi application)
- 100 applications với documents (0-3 documents mỗi application)

### 4. `seed-additional-features.ts`

**Mục đích**: Seed dữ liệu cho các tính năng bổ sung
**Bao gồm**:

- `connection_interests`: Quan tâm kết nối giữa candidate và recruiter
- `job_views`: Lượt xem job (tạm skip do lỗi Prisma)
- `notifications`: Thông báo cho users
- `activity_logs`: Log hoạt động của users
- `search_history`: Lịch sử tìm kiếm

**Dữ liệu tạo**:

- 20 connection interests
- 200+ notifications
- 500 activity logs
- 450+ search history entries

## Thứ tự chạy Seed:

1. Locations → Skills → Tags → Users → Jobs → Resumes → Applications
2. Profile Skills → Profile Experiences/Educations
3. **Company Metadata** (mới)
4. **Job Metadata** (mới)
5. **Application Metadata** (mới)
6. **Additional Features** (mới)

## Kết quả:

- ✅ Tất cả các bảng chính đều có dữ liệu
- ✅ Các bảng metadata mới đã được seed
- ✅ Seed hoàn thành thành công
- ⚠️ `job_views` tạm skip do vấn đề với Prisma UUID generation
- ⚠️ `session_id` trong search_history để null để tránh lỗi UUID format

## Dữ liệu test accounts:

- **Admin**: admin1@gmail.com / admin@123
- **Recruiter**: recruiter1@gmail.com / P@ssw0rd123
- **Candidate**: candidate1@gmail.com / P@ssw0rd123

## Lưu ý:

- Có thể cần sửa vấn đề `job_views` trong tương lai
- Tất cả dữ liệu đều được tạo ngẫu nhiên phù hợp với schema
- Dữ liệu có đầy đủ foreign key relationships
