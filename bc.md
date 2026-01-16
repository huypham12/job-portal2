```json
{
  "job_id": 102345,
  "title 1": "Senior Backend Node.js Developer",
  "title_suggest": "Senior Backend Node.js Developer",
  "description": "Chúng tôi đang tìm kiếm Senior Backend Developer có kinh nghiệm Node.js, TypeScript, Redis và Elasticsearch."
}

{
  "job_id": 102345,
  "title 2": "Nhà Phát Triển Backend Node.js Cao Cấp",
  "title_suggest": "Senior Backend Node.js Developer",
  "description": "Chúng tôi đang tìm kiếm Senior Backend Developer có kinh nghiệm Node.js, TypeScript, Redis và Elasticsearch."
}


{
  "job": {
    "id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
    "title": "Senior Backend Developer",
    "description": "Phát triển hệ thống backend cho nền tảng tuyển dụng.",
    "salary_range": {
      "min": 2000,
      "max": 3500,
      "currency": "USD"
    },
    "job_type": "full_time",
    "experience_level": 3,
  },
  "job_skills": [
    {
      "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
      "skill_id": "d4e5f6a7-1111-4b22-8c33-123456789abc" // Node.js
    },
    {
      "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
      "skill_id": "e5f6a7b8-2222-4c33-9d44-23456789abcd" // PostgreSQL
    }
  ],
  "job_categories": [
    {
      "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
      "category_id": "f6a7b8c9-3333-4d44-8e55-3456789abcde" // Backend
    }
  ],
  "job_requirements": [
    {
      "id": "a111b222-c333-4d44-8e55-3456789abcde",
      "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
      "requirement_type": "technical",
      "title": "Kinh nghiệm Node.js",
      "description": "Tối thiểu 3 năm kinh nghiệm phát triển với Node.js.",
      "is_required": true,
      "level": "senior",
      "years_experience": 3,
      "created_at": "2026-01-16T08:00:00.000Z"
    }
  ],
  "job_benefits": [
    {
      "id": "b222c333-d444-4e55-8f66-456789abcdef",
      "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
      "benefit_type": "insurance",
      "title": "Bảo hiểm sức khỏe",
      "description": "Được tham gia bảo hiểm sức khỏe toàn diện.",
      "value_amount": 10000000,
      "value_currency": "VND",
      "created_at": "2026-01-16T08:00:00.000Z"
    }
  ],
  "job_work_arrangements": {
    "id": "c333d444-e555-4f66-9a77-56789abcdef0",
    "job_id": "b1e8c7f2-1234-4a56-9abc-1234567890ab",
    "is_remote_allowed": true,
    "remote_percentage": 100,
    "flexible_hours": true,
    "travel_requirement": "Không yêu cầu",
    "overtime_expected": false,
    "shift_type": "day",
    "created_at": "2026-01-16T08:00:00.000Z"
  }
}
```

```ts
title: {
  type: 'text',
  analyzer: 'vi_title_analyzer',
  search_analyzer: 'vi_search_analyzer',
  fields: {
    keyword: {
      type: 'keyword',
      normalizer: 'lc_normalizer'
    },
    autocomplete: {
      type: 'text',
      analyzer: 'autocomplete_analyzer'
    }
  }
}
```

```tree
Cluster
└── Node
    └── Index (jobs_index – logic)
        └── Shard (primary / replica)
            └── Lucene Index
                ├── Documents (_source)
                │   └── JSON gốc của document
                └── Segment
                    └── Inverted Index
                        └── token → docID



(root)
 | ... (mỗi kí tự là một transition)
 ├── d
 │    ├── e
 │    │    ├── s → i → g → n → e → r (designer)
 │    │    └── v → e → l → o → p → e r (developer)
 │    └── i → r → e → c → t → o → r (director)
 └── e
      ├── v → e → n → t → ␠ → m → a → n → a → g → e → r (envent manager)
      └── l → e → c → t → r → i → c → a → l → ␠ → e → n → g → i → n → e → e → r
          (electrical engineer)
 ....
Elasticsearch Cluster
│
├── Index (LOGIC): jobs
│   │
│   ├── Mapping
│   │    ├── title        : text (analyzer = standard)
│   │    ├── description  : text (analyzer = standard)
│   │    ├── salary       : integer
│   │    └── created_at   : date
│   │
│   └── Analyzers
         └── standard
 (PHYSICAL)
    ├── Primary Shard
         │
         └── Lucene Index
              │
              ├── Segment_1
              │    ├── Inverted Index
              │    ├── Stored Fields (_source)
              │    └── Doc Values
              │
              └── Segment_N

```
