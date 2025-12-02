# 🔍 Elasticsearch Setup Guide

## Professional Vietnamese Search Engine Integration

This guide covers setting up Elasticsearch 8+ with professional Vietnamese text processing for the Job Portal application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Options](#installation-options)
3. [Configuration](#configuration)
4. [Vietnamese Analyzer Setup](#vietnamese-analyzer-setup)
5. [Professional Features](#professional-features)
6. [CLI Commands](#cli-commands)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (recommended)
- Or Elasticsearch 8.0+ installed locally

## 🚀 Installation Options

### Option 1: Docker Compose (Recommended)

```yaml
# Add to your docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: job-portal-elasticsearch
    environment:
      - discovery.type=single-node
      - 'ES_JAVA_OPTS=-Xms512m -Xmx1024m'
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
    ports:
      - '9200:9200'
      - '9300:9300'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - job-portal-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: job-portal-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - '5601:5601'
    depends_on:
      - elasticsearch
    networks:
      - job-portal-network

volumes:
  elasticsearch_data:

networks:
  job-portal-network:
    driver: bridge
```

### Option 2: Local Installation

#### macOS (Homebrew)

```bash
brew tap elastic/tap
brew install elastic/tap/elasticsearch-full
```

#### Windows (Chocolatey)

```powershell
choco install elasticsearch
```

#### Ubuntu/Debian

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install elasticsearch
```

## ⚙️ Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
ELASTICSEARCH_INDEX_PREFIX=job_portal
ELASTIC_ENABLE_SECURITY=false
```

### 2. Docker Compose Setup

```bash
# Start Elasticsearch
docker-compose up elasticsearch -d

# Check status
curl http://localhost:9200
```

### 3. Local Installation Configuration

Edit `/usr/local/etc/elasticsearch/elasticsearch.yml`:

```yaml
# Basic Configuration
cluster.name: job-portal-cluster
node.name: job-portal-node-1
path.data: /usr/local/var/lib/elasticsearch/
path.logs: /usr/local/var/log/elasticsearch/

# Network Configuration
network.host: localhost
http.port: 9200

# Discovery Configuration (single node)
discovery.type: single-node

# Security Configuration (for development)
xpack.security.enabled: false
xpack.security.enrollment.enabled: false

# Performance Settings
indices.memory.index_buffer_size: 10%
indices.fielddata.cache.size: 30%
```

## 🇻🇳 Vietnamese Analyzer Setup

Our professional implementation includes:

### Advanced Text Processing

- **Vietnamese stop words**: Comprehensive list of Vietnamese and English stop words
- **ASCII folding**: Converts accented characters (ă, â, ê, ô, ư) to unaccented equivalents
- **Stemming**: Light English stemming for mixed Vietnamese-English content
- **N-gram analysis**: Edge n-gram for autocomplete functionality

### Multi-field Mapping Strategy

```json
{
  "title": {
    "type": "text",
    "analyzer": "vi_analyzer",
    "search_analyzer": "vi_search_analyzer",
    "boost": 4,
    "fields": {
      "keyword": { "type": "keyword", "normalizer": "lc_normalizer" },
      "raw": { "type": "keyword" },
      "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" }
    }
  }
}
```

## 🌟 Professional Features

### 1. Optimistic Concurrency Control

- Version-based conflict resolution
- Automatic retry on version conflicts
- Data consistency guarantees

### 2. Bulk Operations

- Chunked processing (1000 records per batch)
- Parallel processing with controlled concurrency
- Comprehensive error handling and reporting

### 3. Completion Suggesters

- Real-time autocomplete for job titles
- Company name suggestions
- Skill-based suggestions
- Weighted suggestions by relevance

### 4. Advanced Search Capabilities

- Multi-match queries with field boosting
- Fuzzy matching with AUTO fuzziness
- Range queries for salary and experience
- Nested queries for complex objects

## 🛠️ CLI Commands

### Initialize Elasticsearch

```bash
# Initialize indices with Vietnamese analyzer
npm run es:init
```

### Data Synchronization

```bash
# Sync all data from database
npm run es:sync

# Check synchronization statistics
npm run es:stats
```

### Health Monitoring

```bash
# Check Elasticsearch health
npm run es:health
```

### Reset (Development Only)

```bash
# Reset all indices (DANGER: deletes all data)
npm run es:reset
```

## 🔍 Search Examples

### Job Search with Vietnamese Support

```javascript
// Search for "lập trình viên javascript"
const results = await elasticsearchService.searchJobs({
  query: 'lập trình viên javascript',
  filters: {
    location: 'Ho Chi Minh City',
    jobType: 'full-time',
    experienceLevel: 3,
    salaryRange: [15000000, 30000000],
    skills: ['JavaScript', 'React', 'Node.js'],
    workArrangements: {
      isRemoteAllowed: true,
      flexibleHours: true
    }
  },
  page: 1,
  limit: 20,
  sortBy: 'relevance',
  highlight: true
})
```

### Company Search

```javascript
// Search for "công ty công nghệ"
const companies = await elasticsearchService.searchCompanies({
  query: 'công ty công nghệ',
  industry: 'technology',
  size: 'medium',
  isVerified: true,
  page: 1,
  limit: 10
})
```

### Autocomplete Suggestions

```javascript
// Get suggestions for "lap trinh"
const suggestions = await elasticsearchService.getSuggestions('jobs', 'title', 'lap trinh', 10)
```

## 🚀 Production Deployment

### 1. Security Configuration

Enable security for production:

```yaml
# elasticsearch.yml
xpack.security.enabled: true
xpack.security.authc:
  realms:
    native:
      native1:
        order: 0
```

### 2. Performance Tuning

```yaml
# elasticsearch.yml
# Memory allocation (adjust based on your server)
ES_JAVA_OPTS: '-Xms2g -Xmx2g'

# Thread pool settings
thread_pool.write.queue_size: 1000
thread_pool.search.queue_size: 2000

# Index settings
indices.memory.index_buffer_size: 30%
indices.fielddata.cache.size: 40%
```

### 3. Monitoring Setup

```yaml
# Add to docker-compose.yml for production
metricbeat:
  image: docker.elastic.co/beats/metricbeat:8.11.0
  environment:
    - ELASTICSEARCH_HOST=elasticsearch:9200
  volumes:
    - /proc:/hostfs/proc:ro
    - /sys/fs/cgroup:/hostfs/sys/fs/cgroup:ro
    - /:/hostfs:ro
```

### 4. Backup Strategy

```bash
# Create snapshot repository
PUT /_snapshot/backup_repository
{
  "type": "fs",
  "settings": {
    "location": "/mount/backups/elasticsearch"
  }
}

# Create daily snapshots
PUT /_snapshot/backup_repository/daily-%3Cnow%2Fd%3E
{
  "indices": "job_portal_*",
  "include_global_state": false
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Failed

```bash
# Check if Elasticsearch is running
curl -X GET "localhost:9200/"

# Check Docker container status
docker ps | grep elasticsearch

# Check logs
docker logs job-portal-elasticsearch
```

#### 2. Out of Memory

```bash
# Increase JVM heap size
export ES_JAVA_OPTS="-Xms1g -Xmx2g"

# Or in docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms1g -Xmx2g"
```

#### 3. Index Mapping Conflicts

```bash
# Delete and recreate index
npm run es:reset

# Or manually
curl -X DELETE "localhost:9200/job_portal_jobs"
npm run es:init
```

#### 4. Vietnamese Text Not Tokenizing Correctly

Check analyzer configuration:

```bash
# Test Vietnamese analyzer
curl -X GET "localhost:9200/job_portal_jobs/_analyze" -H 'Content-Type: application/json' -d'
{
  "analyzer": "vi_analyzer",
  "text": "Lập trình viên JavaScript tại Hồ Chí Minh"
}'
```

#### 5. Slow Search Performance

Optimize queries:

```javascript
// Use specific fields instead of _all
{
  "multi_match": {
    "query": "search term",
    "fields": ["title^4", "description^1"],
    "type": "best_fields"
  }
}

// Use filters instead of queries when possible
{
  "bool": {
    "must": [...],
    "filter": [
      { "term": { "job_type": "full-time" } },
      { "range": { "salary_min": { "gte": 1000 } } }
    ]
  }
}
```

### Performance Monitoring

```bash
# Check cluster health
curl "localhost:9200/_cluster/health?pretty"

# Check node stats
curl "localhost:9200/_nodes/stats?pretty"

# Check index stats
curl "localhost:9200/job_portal_*/_stats?pretty"

# Monitor search performance
curl "localhost:9200/_nodes/stats/indices/search?pretty"
```

## 📊 Metrics and Monitoring

### Key Metrics to Monitor

1. **Search Performance**
   - Query time
   - Index time
   - Throughput (queries/second)

2. **Resource Usage**
   - JVM heap usage
   - CPU utilization
   - Disk I/O

3. **Index Health**
   - Document count
   - Index size
   - Shard allocation

### Kibana Dashboard Setup

Access Kibana at `http://localhost:5601` and create dashboards for:

- Search analytics
- User behavior tracking
- Performance monitoring
- Error logging

## 🎯 Best Practices

1. **Index Management**
   - Use index templates
   - Implement index lifecycle management
   - Regular performance optimization

2. **Query Optimization**
   - Use filters for exact matches
   - Implement query caching
   - Optimize field mappings

3. **Security**
   - Enable authentication in production
   - Use HTTPS in production
   - Implement proper access controls

4. **Backup and Recovery**
   - Regular snapshot creation
   - Test restore procedures
   - Monitor backup health

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Elasticsearch official documentation
3. Check application logs: `docker logs job-portal-elasticsearch`
4. Monitor Kibana dashboards for insights

---

**🌟 Professional Vietnamese Search Engine Ready!**

Your Job Portal now supports advanced Vietnamese text search with professional-grade features including optimistic concurrency, bulk operations, and intelligent autocomplete.
