# Advanced Seed System - Quality Data Generation

Hệ thống seed nâng cao tạo dữ liệu chất lượng cao cho testing Search & Recommendation systems.

## 🎯 Mục tiêu

Tạo **1000 companies + 5000 jobs + 10000 candidates** với:

- ✅ **20-30% dữ liệu thực tế** mô phỏng thị trường VN
- ✅ **70-80% AI-generated** học patterns từ data thực tế
- ✅ **Realistic matching & user behavior** patterns
- ✅ **Deterministic seeding** (reproducible results)

## 📊 Data Quality Features

### 1. **Skill Distribution**

```typescript
// Phân phối skills theo seniority (thực tế VN market)
Junior (35%): 2-4 skills, proficiency 1-3
Mid (45%): 3-6 skills, proficiency 2-4
Senior (20%): 4-8 skills, proficiency 3-5

// Skills phổ biến vs hiếm
JavaScript, React, Node.js (95% weight)
vs
Kafka, Elasticsearch, ML Ops (15-25% weight)
```

### 2. **Matching Logic**

```typescript
// 4 levels matching với probabilities thực tế
Perfect Match (5%): 90-100% skill match + seniority fit
Good Match (15%): 70-90% skill match
Partial Match (30%): 40-70% skill match
Poor Match (35%): 10-40% skill match
No Match (15%): 0-10% skill match
```

### 3. **User Behavior Simulation**

```typescript
// Realistic funnel: Views >> Saves >> Applications
Job Views: 50-200/user (avg 120)
Saved Jobs: 5-25/user (avg 12)
Applications: 0-5/user (avg 1.5)

// Search behavior
Searches: 20-100/user (avg 45)
Clicks per search: 0-5 (avg 1.2)
```

## ⚠️ Important Notice: Deprecated Files

### Migration to Streaming Seeders

Sau khi tối ưu với streaming processors, một số file seeder cũ đã **deprecated**:

#### ❌ Deprecated Files (Không còn sử dụng)

- `seed-users.ts` → Thay thế bởi `CandidateStreamingProcessor`
- `seed-jobs.ts` → Thay thế bởi `JobStreamingProcessor`
- `seed-company-metadata.ts` → Tích hợp vào `CompanyStreamingProcessor`
- `seed-job-metadata.ts` → Tích hợp vào `JobStreamingProcessor`
- `seed-application-metadata.ts` → Tích hợp vào `UserBehaviorStreamingProcessor`
- `seed-additional-features.ts` → Tích hợp vào main streaming

#### ✅ Files vẫn còn sử dụng

- `seed-locations.ts`, `seed-skills.ts`, `seed-tags.ts` (Foundation data)
- `seed-profile-experiences.ts`, `seed-profile-educations.ts`, etc. (Profile extensions)

#### 🔄 Migration Commands

```bash
# Streaming mode (recommended - 60% faster, 80% less memory)
npm run db:seed:streaming

# Batch mode (legacy - still works)
npm run db:seed:batch

# Cleanup deprecated files
npm run db:seed:cleanup
```

📖 Chi tiết: [`DEPRECATED_SEEDERS.md`](./DEPRECATED_SEEDERS.md) | [`OPTIMIZATION_README.md`](./OPTIMIZATION_README.md)

---

## 🏗️ Kiến trúc hệ thống

```
prisma/seeders/
├── constants.ts          # Data patterns thực tế VN market
├── ai-generator.ts       # AI engine học từ real patterns
├── skill-distribution.ts # Skill matching & seniority logic
├── matching-logic.ts     # Job-candidate matching engine
├── batch-seeder.ts       # Batch processing với transaction
├── seed.ts              # Main orchestration
└── README.md            # This file
```

## 🚀 Cách sử dụng

### 1. **Cài đặt dependencies**

```bash
npm install @faker-js/faker
```

### 2. **Chạy seeding**

```bash
# Từ thư mục project root
npx prisma db seed
```

### 3. **Monitoring progress**

```
🚀 ADVANCED SEED SYSTEM - Quality Data Generation
================================================
Target: 1000 companies, 5000 jobs, 10000 candidates
Data source: 25% real patterns + 75% AI generated
================================================

🏗️  PHASE 1: Seeding Foundation Data
✅ Foundation data seeding completed in 1250ms

🏢 PHASE 2: Generating Companies
📊 Generating 250 real-inspired companies...
🤖 Generating 750 AI-learned companies...
✅ Company generation completed in 15430ms

💼 PHASE 4: Generating Jobs with Matching Logic
📊 5 jobs per company average
✅ Job generation completed in 8920ms

🎯 PHASE 5: Simulating User Behavior & Matching
📊 Generated:
  - 12450 applications
  - 89430 job views
  - 15320 saved jobs
  - 48920 search history entries
✅ User behavior simulation completed in 5670ms
```

## 📈 Data Validation

### **Kiểm tra skill distribution**

```sql
-- Skill phổ biến nhất
SELECT s.name, COUNT(ps.*) as profile_count
FROM skills s
JOIN profile_skills ps ON s.id = ps.skill_id
GROUP BY s.id, s.name
ORDER BY profile_count DESC
LIMIT 10;

-- Seniority distribution
SELECT
  CASE
    WHEN years_of_experience < 2 THEN 'junior'
    WHEN years_of_experience < 5 THEN 'mid'
    ELSE 'senior'
  END as seniority,
  COUNT(*) as count
FROM profiles
GROUP BY seniority;
```

### **Kiểm tra matching quality**

```sql
-- Application rate by matching score
SELECT
  CASE
    WHEN matching_score >= 0.9 THEN 'perfect'
    WHEN matching_score >= 0.7 THEN 'good'
    WHEN matching_score >= 0.5 THEN 'partial'
    WHEN matching_score >= 0.3 THEN 'poor'
    ELSE 'no_match'
  END as match_type,
  COUNT(*) as applications,
  ROUND(AVG(matching_score), 2) as avg_score
FROM applications a
JOIN profiles p ON a.profile_id = p.id
-- Add matching_score column to profiles for this analysis
GROUP BY match_type;
```

### **Kiểm tra user behavior funnel**

```sql
-- Views >> Saves >> Applications funnel
SELECT
  'job_views' as metric,
  COUNT(*) as count
FROM job_views
UNION ALL
SELECT
  'saved_jobs' as metric,
  COUNT(*) as count
FROM saved_jobs
UNION ALL
SELECT
  'applications' as metric,
  COUNT(*) as count
FROM applications;
```

## 🎛️ Configuration

### **Tùy chỉnh quy mô data**

```typescript
// prisma/seeders/seed.ts
const SEED_CONFIG = {
  COMPANIES_COUNT: 1000, // Số companies
  JOBS_COUNT: 5000, // Số jobs
  CANDIDATES_COUNT: 10000, // Số candidates

  REAL_DATA_RATIO: 0.25, // Tỷ lệ data thực tế
  AI_GENERATED_RATIO: 0.75, // Tỷ lệ AI generated

  BATCH_SIZE: 50, // Batch size cho processing
  ENABLE_TRANSACTIONS: true,
  CONTINUE_ON_ERROR: true
}
```

### **Tùy chỉnh skill patterns**

```typescript
// prisma/seeders/constants.ts
export const SKILLS_DATABASE = [
  // Thêm/bớt skills, điều chỉnh weight
  { name: 'JavaScript', weight: 95, seniority: { junior: 60, mid: 80, senior: 90 } }
  // ...
]
```

## 🔧 Testing Scenarios

### **Search Testing**

```typescript
// Test search với data đa dạng
const searchQueries = [
  'react developer', // Skill phổ biến
  'kafka engineer', // Skill hiếm
  'senior backend', // Seniority search
  'hanoi startup' // Location + company type
]
```

### **Recommendation Testing**

```typescript
// Test recommendation với matching scores
const candidate = await getCandidateWithSkills(['React', 'Node.js'])
const recommendations = await getJobRecommendations(candidate.id)
// Expected: High matching scores, diverse job types
```

### **Matching Algorithm Validation**

```typescript
// Validate matching algorithm accuracy
const testCases = [
  { candidate: juniorReactDev, job: seniorReactJob, expectedScore: 0.3 },
  { candidate: seniorFullstackDev, job: midFullstackJob, expectedScore: 0.8 }
  // ...
]
```

## 🚨 Troubleshooting

### **Out of Memory (OOM)**

```typescript
// Giảm batch size
const SEED_CONFIG = {
  BATCH_SIZE: 25 // Giảm từ 50 xuống 25
  // ...
}
```

### **Foreign Key Constraint Errors**

```typescript
// Đảm bảo thứ tự seeding đúng
// 1. locations, skills, tags
// 2. users, companies
// 3. profiles, jobs
// 4. applications, job_views, etc.
```

### **Slow Seeding**

```typescript
// Tắt transactions cho speed (ít safe hơn)
const SEED_CONFIG = {
  ENABLE_TRANSACTIONS: false
  // ...
}
```

## ⚙️ Configuration Options

### Data Management

```bash
# Clear all existing data before seeding (fresh start)
CLEAR_EXISTING_DATA=true npm run seed

# Default: append to existing data (incremental seeding)
npm run seed
```

### Environment Variables

```typescript
CLEAR_EXISTING_DATA = true // Xóa toàn bộ data cũ trước khi seed
USER_BEHAVIOR_CANDIDATE_LIMIT = 500 // Giới hạn số candidates cho user behavior (default: 300)
BATCH_SIZE = 100 // Batch size cho bulk inserts (default: 50)
ENABLE_TRANSACTIONS = true // Sử dụng transactions (default: true)
CONTINUE_ON_ERROR = true // Tiếp tục nếu có lỗi (default: true)
```

### ⚠️ **WARNING: CLEAR_EXISTING_DATA**

Khi set `CLEAR_EXISTING_DATA=true`:

- **Xóa hoàn toàn** tất cả data trong database
- **Không thể khôi phục** dữ liệu đã xóa
- **Thời gian**: Có thể mất vài phút tùy scale data
- **Khuyến nghị**: Chỉ dùng khi cần fresh seeding

## 📋 Quality Assurance Checklist

- [ ] **Skill distribution** đúng theo seniority ratios
- [ ] **Company data** đa dạng industry và size
- [ ] **Job-candidate matching** có noise và realism
- [ ] **User behavior** theo funnel views >> saves >> applications
- [ ] **Search data** đủ đa dạng cho testing algorithms
- [ ] **Performance** seeding trong < 5 phút
- [ ] **Deterministic** results khi re-run với cùng seed

## 🎉 Success Metrics

Sau khi seeding xong, bạn sẽ có:

- **1000+ companies** với culture và benefits thực tế VN
- **5000+ jobs** với requirements và compensation matching market
- **10000+ candidates** với skills, experience, education hoàn chỉnh
- **100k+ interactions** (views, saves, applications, searches)
- **Realistic matching distribution** để test recommendation algorithms
- **Searchable data** với đủ diversity để validate search quality

Dữ liệu này sẽ cho phép bạn:

- ✅ Test search algorithms với queries đa dạng
- ✅ Evaluate recommendation systems với matching scores
- ✅ Validate ranking algorithms với realistic user behavior
- ✅ Performance test với data scale thực tế
- ✅ A/B test different algorithms với same dataset
