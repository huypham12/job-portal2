```json
{
  "job_id": 102345,
  "title": "Senior Backend Node.js Developer",
  "title_suggest": "Senior Backend Node.js Developer",
  "description": "Chúng tôi đang tìm kiếm Senior Backend Developer có kinh nghiệm Node.js, TypeScript, Redis và Elasticsearch."
}

{
  "job_id": 102345,
  "title": "Nhà Phát Triển Backend Node.js Cao Cấp",
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
