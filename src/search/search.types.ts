/**
 * Search Types and Interfaces
 *
 * Central types for search operations across the application.
 * Used by query builders, scoring modules, and search services.
 */

/**
 * QueryContext - Standardized input for building search queries
 * Contains all possible search parameters from different user contexts
 */
export type QueryContext = {
  // Text search
  q?: string

  // User context (for personalization)
  userSkills?: string[]
  userLocationId?: string
  userExperienceLevel?: number
  userDesiredSalaryMin?: number
  userDesiredSalaryMax?: number
  userPrefersRemote?: boolean
  userPrefersFlexibleHours?: boolean
  userPreferredCategories?: string[]
  userDesiredBenefits?: string[]
  userRemotePercentageMin?: number

  // Filters (mandatory conditions)
  filters?: {
    status?: string
    job_type?: string
    experience_level?: number
    company_id?: string
    location_id?: string
    salary_min?: number
    salary_max?: number
    posted_after?: Date
    posted_before?: Date
    is_remote?: boolean
    flexible_hours?: boolean
    remote_percentage_min?: number
    job_category?: string
    job_category_type?: string
    benefits_type?: string
    tags?: string[]
    skill_names?: string[]
    location_name?: string
    recruiter_id?: string // Optional tenant isolation filter
  }

  // Pagination
  pagination?: {
    page: number
    size: number
  }

  // Search behavior flags
  options?: {
    prioritizeFreshJobs?: boolean
    explain?: boolean
    profile?: boolean
  }
}

/**
 * ESQuery - Type for Elasticsearch query bodies
 * Narrowed down from 'any' for better type safety
 */
export type ESQuery = {
  query?: any
  from?: number
  size?: number
  sort?: any[]
  _source?: string[] | boolean
  highlight?: any
  explain?: boolean
  profile?: boolean
}

/**
 * SearchResult - Standardized search result structure
 */
export type SearchResult<T = any> = {
  id: string
  score?: number
  _source: T
  highlight?: Record<string, string[]>
  explanation?: any
}

/**
 * SearchResponse - Standardized response from search operations
 */
export type SearchResponse<T = any> = {
  total: number
  took_ms: number
  hits: SearchResult<T>[]
  aggregations?: Record<string, any>
}

/**
 * ScoringComponent - Individual scoring factors for explainability
 */
export type ScoringComponent = {
  text: number        // Full-text relevance (0-1)
  skills: number      // Skills matching (0-1)
  location: number    // Location match (0-1)
  experience: number  // Experience compatibility (0-1)
  recency: number     // Job freshness (0-1)
  activity: number    // Profile activity (0-1)
  availability: number // Availability match (0-1)
  work_arrangement: number // Remote/flexible preferences (0-1)
  benefits: number    // Benefits alignment (0-1)
  category: number    // Category preferences (0-1)
}

/**
 * ScoringWeights - Configurable weights for scoring components
 */
export type ScoringWeights = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
  availability: number
  work_arrangement: number
  benefits: number
  category: number
}

/**
 * JobDocument - ES document structure for jobs
 * Mirrors the mapping in elasticsearch.service.ts
 */
export type JobDocument = {
  id: string
  job_id: string
  title: string
  description: string
  skills: string[] // Flat skills for simple matching
  skills_nested?: Array<{
    name: string
    proficiency: number
    level: string
    category?: string
  }>
  company_id: string
  company_name: string
  location_id: string
  location_name: string
  salary_range: {
    min: number
    max: number
  }
  job_type: string
  experience_level: number
  is_remote_allowed: boolean
  flexible_hours: boolean
  remote_percentage: number
  job_category: string
  job_benefits_type: string[]
  status: string
  posted_at: string
  expires_at: string
}

/**
 * ProfileDocument - ES document structure for profiles
 */
export type ProfileDocument = {
  id: string
  profile_id: string
  user_id: string
  full_name: string
  headline: string
  bio: string
  skills_flat: string[]
  skills: Array<{
    name: string
    proficiency: number
    level: string
  }>
  location_id: string
  location_text: string
  desired_salary_min: number
  desired_salary_max: number
  years_of_experience: number
  is_looking_for_job: boolean
  last_active_at: string
}

/**
 * SearchMode - Different search modes for different contexts
 */
export type SearchMode = 'jobs' | 'profiles' | 'companies' | 'applications'
