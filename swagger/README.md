# Job Portal API Documentation

Cấu trúc Swagger documentation đã được tổ chức lại thành modular để dễ quản lý và maintain.

## Cấu trúc thư mục

```
swagger/
├── main.yaml                    # File chính - điểm vào của toàn bộ API
├── README.md                    # Tài liệu hướng dẫn
├── paths/                       # Định nghĩa các endpoints theo domain
│   ├── auth.yaml               # Authentication endpoints
│   ├── user.yaml               # User management endpoints
│   ├── admin.yaml              # Admin endpoints
│   ├── jobs.yaml               # Job endpoints
│   ├── companies.yaml          # Company endpoints
│   ├── saved-jobs.yaml         # Saved jobs endpoints
│   ├── skills.yaml             # Skills endpoints
│   ├── uploads.yaml            # Upload endpoints
│   ├── resumes.yaml            # Resume endpoints
│   ├── applications.yaml       # Application endpoints
│   ├── connection-interests.yaml # Connection interest endpoints
│   ├── notifications.yaml      # Notification endpoints
│   ├── searches.yaml           # Search endpoints
│   ├── locations.yaml          # Location endpoints
│   └── matching.yaml           # Matching algorithms endpoints
└── components/
    ├── security.yaml           # Security schemes (Bearer auth)
    └── schemas/                # Schema definitions theo domain
        ├── common.yaml         # Common schemas (Error, SuccessResponse, UserRole)
        ├── auth.yaml           # Auth schemas
        ├── user.yaml           # User schemas
        ├── admin.yaml          # Admin schemas
        ├── jobs.yaml           # Job schemas
        ├── companies.yaml      # Company schemas
        ├── saved-jobs.yaml     # Saved jobs schemas
        ├── resumes.yaml        # Resume schemas
        ├── applications.yaml   # Application schemas
        └── connection-interests.yaml # Connection interest schemas
```

## Cách sử dụng

### 1. File chính: main.yaml

File `main.yaml` là điểm vào chính của toàn bộ API documentation. Nó sử dụng `$ref` để reference đến các file khác:

- **paths**: Reference đến các file trong thư mục `paths/`
- **components**: Reference đến security schemes và schemas

### 2. Cấu trúc theo domain

Mỗi domain có file riêng để dễ quản lý:

- **auth.yaml**: Đăng ký, đăng nhập, đổi mật khẩu
- **user.yaml**: Quản lý profile người dùng
- **jobs.yaml**: Quản lý tin tuyển dụng
- **companies.yaml**: Quản lý thông tin công ty
- **applications.yaml**: Quản lý đơn ứng tuyển
- etc.

### 3. Components và Schemas

- **security.yaml**: Định nghĩa Bearer authentication
- **common.yaml**: Các schema dùng chung (Error, SuccessResponse, enums)
- Các file schema khác theo domain

## Ưu điểm của cấu trúc mới

1. **Modular**: Mỗi domain được tách riêng, dễ maintain
2. **Git-friendly**: Ít conflict khi merge
3. **Reusable**: Có thể reference schemas giữa các file
4. **Scalable**: Dễ thêm domain mới
5. **Performance**: Có thể load từng phần khi cần

## Công cụ hỗ trợ

### Swagger Editor

Để edit và validate swagger files:

```bash
# Cài đặt swagger-editor
npm install -g swagger-editor

# Chạy editor
swagger-editor main.yaml
```

### Swagger UI

Để xem documentation:

```bash
# Cài đặt swagger-ui
npm install -g swagger-ui

# Chạy UI
swagger-ui main.yaml
```

### Validate swagger

```bash
# Sử dụng swagger-cli để validate
npm install -g swagger-cli
swagger-cli validate main.yaml
```

## Quy tắc đặt tên

1. **File paths**: `{domain}.yaml` (vd: `auth.yaml`, `jobs.yaml`)
2. **File schemas**: `{domain}.yaml` (vd: `auth.yaml`, `jobs.yaml`)
3. **Path naming**: Sử dụng kebab-case cho multi-word (vd: `saved-jobs.yaml`, `connection-interests.yaml`)
4. **Schema naming**: PascalCase cho object names, camelCase cho properties

## Best Practices

1. **Consistent naming**: Sử dụng naming convention nhất quán
2. **Detailed descriptions**: Mô tả chi tiết cho từng endpoint và schema
3. **Examples**: Cung cấp examples cho request/response
4. **Validation**: Sử dụng proper validation rules
5. **Security**: Đánh dấu đúng security requirements
6. **Tags**: Gán tags phù hợp cho grouping

## Migration từ file cũ

File `swagger.yaml` cũ đã được split thành cấu trúc mới. Để sử dụng:

1. Sử dụng `main.yaml` làm entry point
2. Các tool Swagger sẽ tự động resolve `$ref`
3. Không cần thay đổi gì ở phía consumer

## Troubleshooting

### Lỗi $ref không tìm thấy

- Kiểm tra path trong `$ref` có đúng không
- Đảm bảo file được reference tồn tại
- Kiểm tra syntax YAML

### Lỗi validation

- Chạy `swagger-cli validate main.yaml` để check
- Fix các lỗi syntax hoặc missing references
- Đảm bảo tất cả required fields có mặt

### Performance issues

- Nếu file quá lớn, có thể split thêm schemas
- Sử dụng external references cho large schemas
- Cache swagger files khi build
