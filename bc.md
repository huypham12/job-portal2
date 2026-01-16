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
    },
    analyzed: {
      type: 'text',
      analyzer: 'vi_analyzer'
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


```
