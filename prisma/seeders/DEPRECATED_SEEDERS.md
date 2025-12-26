# Deprecated Seeders - Không còn sử dụng

## Tổng quan

Sau khi tối ưu seeding system với streaming processors, một số file seeder cũ không còn cần thiết và có thể gây conflict. Các file này đã được đánh dấu là **DEPRECATED** và sẽ được remove trong version tiếp theo.

## Danh sách file deprecated

### 📦 Đã move vào `archive/` folder

Các file sau đã được move vào thư mục `archive/` để tránh confusion:

#### ❌ Legacy User/Job Seeders

**Không còn sử dụng - thay thế bởi streaming processors**

- `seed-users.ts` → `archive/seed-users.ts` - Thay thế bởi `CandidateStreamingProcessor`
- `seed-jobs.ts` → `archive/seed-jobs.ts` - Thay thế bởi `JobStreamingProcessor`

#### ❌ Metadata Seeders

**Không còn sử dụng - logic đã tích hợp vào main seeders**

- `seed-company-metadata.ts` → `archive/seed-company-metadata.ts` - Metadata đã được tạo bởi `CompanyStreamingProcessor`
- `seed-job-metadata.ts` → `archive/seed-job-metadata.ts` - Metadata đã được tạo bởi `JobStreamingProcessor`
- `seed-application-metadata.ts` → `archive/seed-application-metadata.ts` - Metadata đã được tạo bởi `UserBehaviorStreamingProcessor`
- `seed-additional-features.ts` → `archive/seed-additional-features.ts` - Features đã được tích hợp vào main streaming

### ❌ Old Profile Extensions

**Không còn sử dụng trong streaming mode**

- `seed-profile-skills.ts` - **CẢNH BÁO**: Vẫn được sử dụng trong batch mode, nhưng skip trong streaming mode vì đã được xử lý bởi `CandidateStreamingProcessor`

## File vẫn còn sử dụng

### ✅ Foundation Data (Vẫn cần thiết)

- `seed-locations.ts` - Tạo dữ liệu locations
- `seed-skills.ts` - Tạo dữ liệu skills
- `seed-tags.ts` - Tạo dữ liệu tags

### ✅ Profile Extensions (Vẫn cần thiết)

- `seed-profile-experiences.ts` - Tạo profile experiences
- `seed-profile-educations.ts` - Tạo profile educations
- `seed-profile-certifications.ts` - Tạo profile certifications
- `seed-profile-awards.ts` - Tạo profile awards

## Migration Guide

### Nếu bạn đang dùng batch mode (legacy)

```bash
# Vẫn hoạt động bình thường
npm run db:seed:batch
```

### Nếu bạn đang dùng streaming mode (recommended)

```bash
# Sử dụng streaming processors
npm run db:seed:streaming

# Hoặc
npm run db:seed  # Mặc định là streaming
```

### Nếu cần chạy seeder cũ riêng lẻ

```bash
# Chỉ chạy khi thực sự cần thiết
npx tsx prisma/seeders/seed-users.ts
npx tsx prisma/seeders/seed-jobs.ts
```

## Cleanup Recommendations

### Immediate Actions (Nên làm ngay)

1. **Không sử dụng** các file deprecated trong code mới
2. **Cập nhật documentation** để reference streaming seeders
3. **Test thoroughly** với streaming mode trước khi deploy

### Future Actions (Version tiếp theo)

1. **Move deprecated files** vào thư mục `archive/` hoặc `legacy/`
2. **Remove deprecated files** hoàn toàn
3. **Update import statements** trong các file còn lại

## Troubleshooting

### Conflict với profile skills

**Vấn đề**: `seed-profile-skills.ts` tạo duplicate data trong streaming mode

**Giải pháp**: Đã được fix trong code - streaming mode sẽ skip profile skills seeding

### Missing metadata

**Vấn đề**: Một số metadata không được tạo trong streaming mode

**Giải pháp**: Metadata đã được tích hợp vào streaming processors

### Performance issues

**Vấn đề**: Legacy seeders chạy chậm

**Giải pháp**: Sử dụng streaming mode với performance optimizations

## Contact

Nếu gặp vấn đề với migration, vui lòng check:

- `OPTIMIZATION_README.md` - Chi tiết về optimizations
- `streaming-processors.ts` - Implementation của streaming processors
- `seed.ts` - Main seeding orchestration
