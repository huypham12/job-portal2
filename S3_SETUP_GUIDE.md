# Hướng dẫn cấu hình S3 Bucket Policy

## Tình trạng hiện tại

✅ **Upload**: Người dùng đã đăng nhập có thể upload file (có authentication & authorization)
⚠️ **Truy cập file**: Cần cấu hình Bucket Policy để files có thể truy cập public

## Cấu hình Bucket Policy để files có thể truy cập public

### Bước 1: Vào AWS S3 Console

1. Đăng nhập AWS Console
2. Vào S3 → Chọn bucket `job-portal-2025`
3. Chọn tab **Permissions**

### Bước 2: Cấu hình Bucket Policy

Trong phần **Bucket Policy**, paste policy sau (thay `YOUR_ACCOUNT_ID` bằng AWS Account ID của bạn):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowIAMUserFullAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/huypham2"
      },
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::job-portal-2025", "arn:aws:s3:::job-portal-2025/*"]
    },
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::job-portal-2025/*"
    }
  ]
}
```

**Lưu ý**:

- Statement đầu cho phép IAM user `huypham2` upload/delete files
- Statement thứ hai cho phép mọi người (public) đọc files

### Bước 3: Cấu hình Block Public Access (nếu cần)

1. Trong tab **Permissions** → **Block Public Access settings**
2. Nếu muốn files public, bỏ chọn:
   - ✅ "Block public access to buckets and objects granted through new access control lists (ACLs)"
   - ✅ "Block public access to buckets and objects granted through any access control lists (ACLs)"
3. Lưu ý: Nếu dùng Bucket Policy (như trên), không cần bỏ Block Public Access

### Bước 4: Kiểm tra

Sau khi cấu hình:

- ✅ IAM user có thể upload files
- ✅ Mọi người có thể truy cập files qua public URL
- ✅ Files được tổ chức theo cấu trúc thư mục rõ ràng

## Cấu trúc thư mục trên S3

```
job-portal-2025/
├── avatars/
│   └── {userId}/
│       └── {uuid}.jpg
├── companies/
│   └── {companyId}/
│       └── logos/
│           └── {uuid}.png
├── resumes/
│   └── {profileId}/
│       └── {uuid}.pdf
└── applications/
    └── {applicationId}/
        ├── resume/
        ├── cover_letter/
        ├── certificate/
        └── other/
```

## Lấy AWS Account ID

Để lấy AWS Account ID:

1. Click vào tên user ở góc trên bên phải AWS Console
2. Account ID sẽ hiển thị ở đó
3. Hoặc dùng AWS CLI: `aws sts get-caller-identity`

## Nếu muốn files private (chỉ truy cập qua authentication)

Nếu không muốn files public, có thể:

1. Bỏ statement "PublicReadGetObject" trong Bucket Policy
2. Sử dụng presigned URLs (cần implement thêm trong code)
3. Files chỉ có thể truy cập bởi IAM user hoặc qua presigned URLs

# cấu hình quyền truy cập

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::job-portal-2025/*"]
    }
  ]
}
```
