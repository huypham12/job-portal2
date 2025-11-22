# User API Documentation

Base URL (giả sử): `/api/user`

## MAIN USER DATA

### **GET /api/user/me**

Lấy thông tin cơ bản của user (dùng cho dashboard).

### **GET /api/user/me/profile**

Lấy toàn bộ hồ sơ của ứng viên, bao gồm các entity con (skills, experiences, educations…).

---

## 📝 PROFILE MANAGEMENT

### **PUT /api/user/me/profile**

Cập nhật thông tin chính của profile.

---

## 💼 PROFILE EXPERIENCES

### **POST /api/user/me/profile/experiences**

Tạo experience mới.

### **PUT /api/user/me/profile/experiences/:experienceId**

Cập nhật experience.

### **DELETE /api/user/me/profile/experiences/:experienceId**

Xóa experience.

---

## 🎓 PROFILE EDUCATIONS

### **POST /api/user/me/profile/educations**

Thêm mới education.

### **PUT /api/user/me/profile/educations/:educationId**

Cập nhật education.

### **DELETE /api/user/me/profile/educations/:educationId**

Xóa education.

---

## 🛠️ PROFILE SKILLS

### **POST /api/user/me/profile/skills**

Thêm skill.

### **PUT /api/user/me/profile/skills/:skillId**

Cập nhật skill.

### **DELETE /api/user/me/profile/skills/:skillId**

Xóa skill.

---

## 📜 PROFILE CERTIFICATIONS

### **POST /api/user/me/profile/certifications**

Tạo certification.

### **PUT /api/user/me/profile/certifications/:certificationId**

Cập nhật certification.

### **DELETE /api/user/me/profile/certifications/:certificationId**

Xóa certification.

---

## 🏆 PROFILE AWARDS

### **POST /api/user/me/profile/awards**

Tạo award.

### **PUT /api/user/me/profile/awards/:awardId**

Cập nhật award.

### **DELETE /api/user/me/profile/awards/:awardId**

Xóa award.

---

# Company API Documentation

Base URL: `/api/companies`

---

## 🏢 Company Management (Recruiter Only)

### **POST /api/companies**

Tạo hồ sơ doanh nghiệp mới.
**Access:** Private (Recruiter)

---

### **GET /api/companies/my-company**

Lấy hồ sơ doanh nghiệp của recruiter đang đăng nhập.
**Access:** Private (Recruiter)

---

### **PATCH /api/companies/my-company**

Cập nhật hồ sơ doanh nghiệp.
**Access:** Private (Recruiter)

---

## 🧩 Company Details

### **PATCH /api/companies/my-company/details**

Cập nhật thông tin chi tiết của doanh nghiệp.
**Access:** Private (Recruiter)

---

## 🎁 Company Benefits

### **POST /api/companies/my-company/benefits**

Thêm phúc lợi mới cho doanh nghiệp.
**Access:** Private (Recruiter)

---

### **PATCH /api/companies/my-company/benefits/:id**

Cập nhật phúc lợi doanh nghiệp theo ID.
**Access:** Private (Recruiter)

---

### **DELETE /api/companies/my-company/benefits/:id**

Xóa phúc lợi doanh nghiệp theo ID.
**Access:** Private (Recruiter)

---

## 🎭 Company Culture

### **POST /api/companies/my-company/cultures**

Thêm văn hóa doanh nghiệp.
**Access:** Private (Recruiter)

---

## 🌍 Public Company APIs

### **GET /api/companies**

Tìm kiếm & lọc danh sách công ty.
**Access:** Public
Query options: `name`, `industry`, `size_min`, `size_max`, `page`, `limit`

---

### **GET /api/companies/:id**

Lấy chi tiết một công ty theo ID.
**Access:** Public
Query optional: `details=true|false`

---
