import { Client } from '@elastic/elasticsearch'
import { envConfig } from './getEnvConfig'

export interface SearchParams {
  query: string
  filters?: {
    location?: string
    jobType?: string
    experienceLevel?: number
    salaryRange?: [number, number]
    companyId?: string
    skills?: string[]
    tags?: string[]
    workArrangements?: {
      isRemoteAllowed?: boolean
      flexibleHours?: boolean
    }
  }
  page?: number
  limit?: number
  sortBy?: 'relevance' | 'date' | 'salary' | 'experience'
  sortOrder?: 'asc' | 'desc'
  highlight?: boolean
}

export interface SearchResult<T> {
  hits: T[]
  total: number
  took: number
  maxScore: number
  page: number
  totalPages: number
  aggregations?: any
  highlights?: Record<string, string[]>
  suggestions?: Record<string, any[]>
}

export interface BulkOperation {
  index?: string
  id: string
  document?: any
  seqNo?: number
  primaryTerm?: number
}

export interface IndexSettings {
  number_of_shards: number
  number_of_replicas: number
  refresh_interval: string
  max_result_window: number
  analysis: {
    filter: Record<string, any>
    normalizer: Record<string, any>
    analyzer: Record<string, any>
  }
}

export interface JobDocument {
  id: string
  title: string
  description: string
  company_id: string
  company_name?: string
  company_logo_url?: string
  company_size?: number
  location_id: string
  location_name?: string
  location_full_path?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  job_type: string
  experience_level?: number
  status: string
  posted_at: string
  expires_at?: string
  updated_at: string
  skills: string[]
  tags: string[]
  benefits: string[]
  requirements: string[]
  work_arrangements: {
    is_remote_allowed: boolean
    remote_percentage: number
    flexible_hours: boolean
    travel_requirement?: string
    shift_type?: string
  }
  view_count?: number
  application_count?: number
  // Suggester fields
  title_suggest?: {
    input: string[]
    weight?: number
  }
  company_suggest?: {
    input: string[]
    weight?: number
  }
  skills_suggest?: {
    input: string[]
    weight?: number
  }
}

export interface CompanyDocument {
  id: string
  name: string
  description?: string
  size?: number
  logo_url?: string
  industry?: string
  founded_year?: number
  location?: string
  website_url?: string
  linkedin_url?: string
  employee_count_range?: string
  company_type?: string
  benefits: string[]
  job_count: number
  is_verified: boolean
  created_at: string
  updated_at: string
  // Suggester fields
  name_suggest?: {
    input: string[]
    weight?: number
  }
}

export interface ProfileDocument {
  id: string
  user_id: string
  full_name: string
  display_name?: string
  headline?: string
  bio?: string
  desired_job_title?: string
  desired_job_types: string[]
  desired_salary_min?: number
  desired_currency?: string
  years_of_experience?: number
  location_id?: string
  location_name?: string
  location_text?: string
  skills: Array<{
    name: string
    proficiency?: number
    level?: string
  }>
  experiences: Array<{
    company_name: string
    position: string
    duration_months?: number
    is_current: boolean
  }>
  educations: Array<{
    school_name: string
    degree?: string
    field_of_study?: string
  }>
  certifications: Array<{
    name: string
    issuing_org: string
    skills_acquired?: string
  }>
  awards: Array<{
    title: string
    category?: string
    level?: string
  }>
  avatar_url?: string
  linkedin_url?: string
  github_url?: string
  personal_website?: string
  is_looking_for_job: boolean
  created_at: string
  updated_at: string
}

class ElasticsearchService {
  private client: Client
  private readonly indexPrefix: string
  private readonly CHUNK_SIZE = 1000

  constructor() {
    const config = envConfig.elasticsearch

    this.client = new Client({
      node: config.node,
      auth:
        config.enableSecurity && config.username && config.password
          ? {
              username: config.username,
              password: config.password
            }
          : undefined,
      requestTimeout: 60000,
      pingTimeout: 5000,
      sniffOnStart: false,
      maxRetries: 3,
      resurrection_strategy: 'ping'
    })

    this.indexPrefix = config.indexPrefix
  }

  // Connection and health check methods
  async checkConnection(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health()
      console.log('✅ Elasticsearch connection successful:', health.status)
      return true
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error)
      return false
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping()
      return response.statusCode === 200
    } catch (error) {
      console.error('Elasticsearch ping failed:', error)
      return false
    }
  }

  // Index management with professional Vietnamese analyzer
  async initializeIndices(): Promise<void> {
    const indices = ['jobs', 'companies', 'profiles']

    for (const index of indices) {
      const indexName = this.getIndexName(index)

      try {
        const exists = await this.client.indices.exists({ index: indexName })

        if (!exists) {
          await this.client.indices.create({
            index: indexName,
            body: this.getIndexConfiguration(index)
          })
          console.log(`✅ Created index: ${indexName}`)
        } else {
          // Update mapping for existing index
          await this.updateIndexMapping(indexName, index)
          console.log(`ℹ️  Updated mapping for: ${indexName}`)
        }
      } catch (error) {
        console.error(`❌ Failed to initialize index ${indexName}:`, error)
      }
    }
  }

  private async updateIndexMapping(indexName: string, type: string): Promise<void> {
    try {
      const mapping = this.getIndexMappings(type)
      await this.client.indices.putMapping({
        index: indexName,
        body: mapping
      })
    } catch (error) {
      console.error(`Failed to update mapping for ${indexName}:`, error)
    }
  }

  async deleteIndex(type: string): Promise<boolean> {
    const indexName = this.getIndexName(type)

    try {
      await this.client.indices.delete({ index: indexName })
      console.log(`🗑️  Deleted index: ${indexName}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete index ${indexName}:`, error)
      return false
    }
  }

  async refreshIndex(type: string): Promise<void> {
    const indexName = this.getIndexName(type)
    await this.client.indices.refresh({ index: indexName })
  }

  // Optimistic concurrency with bulk operations
  async bulkUpsert(operations: BulkOperation[], indexType: string): Promise<boolean> {
    if (operations.length === 0) return true

    const chunks = this.chunkArray(operations, this.CHUNK_SIZE)
    let successCount = 0

    for (const chunk of chunks) {
      try {
        const bulkBody = []

        for (const op of chunk) {
          const action: any = {
            index: {
              _index: this.getIndexName(indexType),
              _id: op.id
            }
          }

          // Add optimistic concurrency control if available
          if (op.seqNo !== undefined && op.primaryTerm !== undefined) {
            action.index.if_seq_no = op.seqNo
            action.index.if_primary_term = op.primaryTerm
          }

          bulkBody.push(action)
          bulkBody.push(op.document)
        }

        const response = await this.client.bulk({
          body: bulkBody,
          refresh: 'wait_for'
        })

        if (response.errors) {
          console.error(
            'Bulk upsert errors:',
            response.items?.filter((item: any) => item.index?.error)
          )
        } else {
          successCount += chunk.length
        }
      } catch (error) {
        console.error(`Bulk upsert chunk failed:`, error)
      }
    }

    console.log(`📦 Bulk upserted ${successCount}/${operations.length} documents`)
    return successCount === operations.length
  }

  async bulkDelete(ids: string[], indexType: string): Promise<boolean> {
    if (ids.length === 0) return true

    const chunks = this.chunkArray(ids, this.CHUNK_SIZE)
    let successCount = 0

    for (const chunk of chunks) {
      try {
        const bulkBody = []

        for (const id of chunk) {
          bulkBody.push({
            delete: {
              _index: this.getIndexName(indexType),
              _id: id
            }
          })
        }

        const response = await this.client.bulk({
          body: bulkBody,
          refresh: 'wait_for'
        })

        if (response.errors) {
          console.error(
            'Bulk delete errors:',
            response.items?.filter((item: any) => item.delete?.error)
          )
        } else {
          successCount += chunk.length
        }
      } catch (error) {
        console.error(`Bulk delete chunk failed:`, error)
      }
    }

    console.log(`🗑️  Bulk deleted ${successCount}/${ids.length} documents`)
    return successCount === ids.length
  }

  // Individual document operations with optimistic concurrency
  async indexDocument(type: string, id: string, document: any, seqNo?: number, primaryTerm?: number): Promise<boolean> {
    const indexName = this.getIndexName(type)

    try {
      const params: any = {
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for'
      }

      if (seqNo !== undefined && primaryTerm !== undefined) {
        params.if_seq_no = seqNo
        params.if_primary_term = primaryTerm
      }

      await this.client.index(params)
      console.log(`📝 Indexed document ${type}:${id}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to index document ${type}:${id}:`, error)
      return false
    }
  }

  async updateDocument(
    type: string,
    id: string,
    document: Partial<any>,
    seqNo?: number,
    primaryTerm?: number
  ): Promise<boolean> {
    const indexName = this.getIndexName(type)

    try {
      const params: any = {
        index: indexName,
        id,
        body: { doc: document },
        refresh: 'wait_for'
      }

      if (seqNo !== undefined && primaryTerm !== undefined) {
        params.if_seq_no = seqNo
        params.if_primary_term = primaryTerm
      }

      await this.client.update(params)
      console.log(`✏️  Updated document ${type}:${id}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to update document ${type}:${id}:`, error)
      return false
    }
  }

  async deleteDocument(type: string, id: string): Promise<boolean> {
    const indexName = this.getIndexName(type)

    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for'
      })
      console.log(`🗑️  Deleted document ${type}:${id}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to delete document ${type}:${id}:`, error)
      return false
    }
  }

  async getDocument<T>(
    type: string,
    id: string
  ): Promise<{ document: T | null; seqNo?: number; primaryTerm?: number }> {
    const indexName = this.getIndexName(type)

    try {
      const response = await this.client.get({
        index: indexName,
        id
      })
      return {
        document: response._source as T,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term
      }
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return { document: null }
      }
      console.error(`❌ Failed to get document ${type}:${id}:`, error)
      throw error
    }
  }

  // Professional search with multi-match, highlighting, and completion
  async searchJobs(params: SearchParams): Promise<SearchResult<JobDocument>> {
    const indexName = this.getIndexName('jobs')
    const {
      query,
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      highlight = true
    } = params

    const searchBody: any = {
      query: this.buildJobQuery(query, filters),
      from: (page - 1) * limit,
      size: Math.min(limit, 1000),
      track_total_hits: true,
      _source: {
        excludes: ['title_suggest', 'company_suggest', 'skills_suggest']
      }
    }

    // Add sorting
    if (sortBy === 'relevance' && query) {
      searchBody.sort = [{ _score: { order: 'desc' } }, { posted_at: { order: 'desc' } }]
    } else {
      searchBody.sort = this.buildJobSort(sortBy, sortOrder)
    }

    // Add highlighting
    if (highlight && query) {
      searchBody.highlight = {
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fields: {
          title: { fragment_size: 150, number_of_fragments: 1 },
          description: { fragment_size: 200, number_of_fragments: 2 },
          company_name: { fragment_size: 100, number_of_fragments: 1 },
          skills: { fragment_size: 50, number_of_fragments: 3 }
        }
      }
    }

    try {
      const response = await this.client.search({
        index: indexName,
        body: searchBody
      })

      const hits = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight || {}
      }))

      const total = typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total

      return {
        hits,
        total,
        took: response.took,
        maxScore: response.hits.max_score || 0,
        page,
        totalPages: Math.ceil(total / limit),
        aggregations: response.aggregations,
        highlights: this.extractHighlights(response.hits.hits)
      }
    } catch (error) {
      console.error('❌ Job search failed:', error)
      throw error
    }
  }

  // Completion suggester for autocomplete
  async getSuggestions(indexType: string, field: string, prefix: string, size = 10): Promise<any[]> {
    const indexName = this.getIndexName(indexType)

    try {
      const response = await this.client.search({
        index: indexName,
        body: {
          suggest: {
            autocomplete: {
              prefix,
              completion: {
                field: `${field}_suggest`,
                size,
                skip_duplicates: true
              }
            }
          },
          size: 0
        }
      })

      return response.suggest?.autocomplete?.[0]?.options || []
    } catch (error) {
      console.error('❌ Suggestions failed:', error)
      return []
    }
  }

  // Utility methods
  private getIndexName(type: string): string {
    return `${this.indexPrefix}_${type}`
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private extractHighlights(hits: any[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {}
    hits.forEach((hit, index) => {
      if (hit.highlight) {
        highlights[index.toString()] = hit.highlight
      }
    })
    return highlights
  }

  // Professional Vietnamese analyzer configuration
  private getIndexConfiguration(type: string): any {
    return {
      settings: this.getIndexSettings(),
      mappings: this.getIndexMappings(type)
    }
  }

  private getIndexSettings(): IndexSettings {
    return {
      number_of_shards: 1,
      number_of_replicas: 0,
      refresh_interval: '1s',
      max_result_window: 20000,
      analysis: {
        filter: {
          vi_stop: {
            type: 'stop',
            stopwords: [
              'của',
              'và',
              'là',
              'có',
              'được',
              'cho',
              'với',
              'từ',
              'trong',
              'về',
              'tại',
              'theo',
              'để',
              'những',
              'các',
              'một',
              'này',
              'đó',
              'khi',
              'nếu',
              'như',
              'đã',
              'sẽ',
              'bị',
              'bởi',
              'the',
              'a',
              'an',
              'and',
              'or',
              'but',
              'in',
              'on',
              'at',
              'to',
              'for',
              'of',
              'with',
              'by'
            ]
          },
          vi_stem: {
            type: 'stemmer',
            language: 'light_english'
          },
          asciifolding_filter: {
            type: 'asciifolding',
            preserve_original: true
          },
          edge_ngram_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 20
          }
        },
        normalizer: {
          lc_normalizer: {
            type: 'custom',
            filter: ['lowercase', 'asciifolding']
          }
        },
        analyzer: {
          vi_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'asciifolding_filter', 'vi_stop', 'vi_stem']
          },
          vi_search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'asciifolding_filter', 'vi_stop']
          },
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'asciifolding_filter', 'edge_ngram_filter']
          }
        }
      }
    }
  }

  private getIndexMappings(type: string): any {
    switch (type) {
      case 'jobs':
        return this.getJobMapping()
      case 'companies':
        return this.getCompanyMapping()
      case 'profiles':
        return this.getProfileMapping()
      default:
        throw new Error(`Unknown index type: ${type}`)
    }
  }

  private getJobMapping(): any {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer',
          boost: 4,
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
          }
        },
        description: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer',
          boost: 1
        },
        company_id: { type: 'keyword' },
        company_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer',
          boost: 3,
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
          }
        },
        company_logo_url: { type: 'keyword' },
        company_size: { type: 'integer' },
        location_id: { type: 'keyword' },
        location_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' }
          }
        },
        location_full_path: {
          type: 'text',
          analyzer: 'vi_analyzer'
        },
        salary_min: { type: 'integer' },
        salary_max: { type: 'integer' },
        salary_currency: { type: 'keyword' },
        job_type: { type: 'keyword' },
        experience_level: { type: 'integer' },
        status: { type: 'keyword' },
        posted_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        expires_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        updated_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        skills: {
          type: 'text',
          analyzer: 'vi_analyzer',
          boost: 2,
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' }
          }
        },
        tags: { type: 'keyword' },
        benefits: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        requirements: {
          type: 'text',
          analyzer: 'vi_analyzer'
        },
        work_arrangements: {
          properties: {
            is_remote_allowed: { type: 'boolean' },
            remote_percentage: { type: 'integer' },
            flexible_hours: { type: 'boolean' },
            travel_requirement: { type: 'keyword' },
            shift_type: { type: 'keyword' }
          }
        },
        view_count: { type: 'integer' },
        application_count: { type: 'integer' },
        // Completion suggesters
        title_suggest: {
          type: 'completion',
          analyzer: 'vi_analyzer'
        },
        company_suggest: {
          type: 'completion',
          analyzer: 'vi_analyzer'
        },
        skills_suggest: {
          type: 'completion',
          analyzer: 'vi_analyzer'
        }
      }
    }
  }

  private getCompanyMapping(): any {
    return {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer',
          boost: 4,
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
          }
        },
        description: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer'
        },
        size: { type: 'integer' },
        logo_url: { type: 'keyword' },
        industry: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword', normalizer: 'lc_normalizer' } }
        },
        founded_year: { type: 'integer' },
        location: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        website_url: { type: 'keyword' },
        linkedin_url: { type: 'keyword' },
        employee_count_range: { type: 'keyword' },
        company_type: { type: 'keyword' },
        benefits: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        job_count: { type: 'integer' },
        is_verified: { type: 'boolean' },
        created_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        updated_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        // Completion suggester
        name_suggest: {
          type: 'completion',
          analyzer: 'vi_analyzer'
        }
      }
    }
  }

  private getProfileMapping(): any {
    return {
      properties: {
        id: { type: 'keyword' },
        user_id: { type: 'keyword' },
        full_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            raw: { type: 'keyword' }
          }
        },
        display_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        headline: {
          type: 'text',
          analyzer: 'vi_analyzer'
        },
        bio: {
          type: 'text',
          analyzer: 'vi_analyzer'
        },
        desired_job_title: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        desired_job_types: { type: 'keyword' },
        desired_salary_min: { type: 'integer' },
        desired_currency: { type: 'keyword' },
        years_of_experience: { type: 'integer' },
        location_id: { type: 'keyword' },
        location_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        location_text: {
          type: 'text',
          analyzer: 'vi_analyzer'
        },
        skills: {
          type: 'nested',
          properties: {
            name: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            proficiency: { type: 'integer' },
            level: { type: 'keyword' }
          }
        },
        experiences: {
          type: 'nested',
          properties: {
            company_name: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            position: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            duration_months: { type: 'integer' },
            is_current: { type: 'boolean' }
          }
        },
        educations: {
          type: 'nested',
          properties: {
            school_name: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            degree: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            field_of_study: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            }
          }
        },
        certifications: {
          type: 'nested',
          properties: {
            name: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            issuing_org: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            skills_acquired: {
              type: 'text',
              analyzer: 'vi_analyzer'
            }
          }
        },
        awards: {
          type: 'nested',
          properties: {
            title: {
              type: 'text',
              analyzer: 'vi_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            category: { type: 'keyword' },
            level: { type: 'keyword' }
          }
        },
        avatar_url: { type: 'keyword' },
        linkedin_url: { type: 'keyword' },
        github_url: { type: 'keyword' },
        personal_website: { type: 'keyword' },
        is_looking_for_job: { type: 'boolean' },
        created_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
        updated_at: { type: 'date', format: 'strict_date_optional_time||epoch_millis' }
      }
    }
  }

  private buildJobQuery(query: string, filters: any): any {
    const must = []
    const filter = []

    // Multi-match query with boosting
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^4',
            'title.autocomplete^2',
            'company_name^3',
            'company_name.autocomplete^1.5',
            'skills^2',
            'description^1'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 1,
          max_expansions: 50,
          operator: 'or'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    // Apply filters
    filter.push({ term: { status: 'active' } })

    if (filters.location) {
      filter.push({
        bool: {
          should: [{ term: { location_id: filters.location } }, { match: { location_name: filters.location } }]
        }
      })
    }

    if (filters.jobType) {
      filter.push({ term: { job_type: filters.jobType } })
    }

    if (filters.companyId) {
      filter.push({ term: { company_id: filters.companyId } })
    }

    if (filters.experienceLevel !== undefined) {
      filter.push({
        range: {
          experience_level: {
            lte: filters.experienceLevel + 1,
            gte: Math.max(0, filters.experienceLevel - 1)
          }
        }
      })
    }

    if (filters.salaryRange && filters.salaryRange.length === 2) {
      const [min, max] = filters.salaryRange
      filter.push({
        bool: {
          should: [{ range: { salary_min: { gte: min, lte: max } } }, { range: { salary_max: { gte: min, lte: max } } }]
        }
      })
    }

    if (filters.skills && filters.skills.length > 0) {
      filter.push({
        bool: {
          should: filters.skills.map((skill) => ({
            term: { 'skills.keyword': skill }
          })),
          minimum_should_match: 1
        }
      })
    }

    if (filters.workArrangements?.isRemoteAllowed) {
      filter.push({ term: { 'work_arrangements.is_remote_allowed': true } })
    }

    if (filters.workArrangements?.flexibleHours) {
      filter.push({ term: { 'work_arrangements.flexible_hours': true } })
    }

    return {
      bool: {
        must,
        filter
      }
    }
  }

  private buildJobSort(sortBy: string, sortOrder: string): any[] {
    switch (sortBy) {
      case 'date':
        return [{ posted_at: { order: sortOrder } }]
      case 'salary':
        return [{ salary_max: { order: sortOrder, missing: '_last' } }]
      case 'experience':
        return [{ experience_level: { order: sortOrder, missing: '_last' } }]
      default:
        return [{ posted_at: { order: 'desc' } }]
    }
  }

  getClient(): Client {
    return this.client
  }

  async close(): Promise<void> {
    await this.client.close()
    console.log('🔌 Elasticsearch client closed')
  }
}

export const elasticsearchService = new ElasticsearchService()

// Initialize on startup
;(async () => {
  try {
    const connected = await elasticsearchService.checkConnection()
    if (connected) {
      await elasticsearchService.initializeIndices()
      console.log('🚀 Elasticsearch service initialized successfully')
    }
  } catch (error) {
    console.error('❌ Elasticsearch initialization failed:', error)
  }
})()
