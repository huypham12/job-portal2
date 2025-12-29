/**
 * Elasticsearch Mapping for Jobs v2
 *
 * Improved mapping with nested skills and simplified location structure.
 * Supports better skill matching and scoring capabilities.
 */

import { vietnameseAnalyzers } from '../../config/elasticsearch.service'

export const jobsV2Mapping = {
  mappings: {
    properties: {
      // Core identifiers
      id: { type: 'keyword' },
      job_id: { type: 'keyword' },

      // Title with multiple analyzers for flexible search
      title: {
        type: 'text',
        analyzer: 'vi_title_analyzer', // Specialized analyzer for titles
        search_analyzer: 'vi_search_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
          autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
          suggest: { type: 'completion' },
          raw: { type: 'keyword' },
          analyzed: { type: 'text', analyzer: 'vi_analyzer' }
        }
      },

      // Description
      description: {
        type: 'text',
        analyzer: 'vi_analyzer',
        search_analyzer: 'vi_search_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
        }
      },

      // SKILLS - Major improvement: nested structure for better matching
      skills: {
        type: 'nested',
        properties: {
          name: { type: 'keyword' },           // Skill name (normalized)
          proficiency: { type: 'integer' },    // Proficiency level (1-5)
          level: { type: 'keyword' },          // Experience level (beginner, intermediate, expert)
          category: { type: 'keyword' },       // Skill category (technical, soft, industry)
          category_type: { type: 'keyword' }   // Category type for taxonomy
        }
      },

      // Skills flat - kept for fast queries and backward compatibility
      skills_flat: {
        type: 'keyword'
      },

      // Skills suggest - for autocomplete
      skills_suggest: {
        type: 'completion',
        analyzer: 'simple'
      },

      // Tags and categories
      tags: { type: 'keyword' },
      job_category: { type: 'keyword' },
      job_category_type: { type: 'keyword' }, // industry, technical, work_type

      // Company information
      company_id: { type: 'keyword' },
      company_name: {
        type: 'text',
        analyzer: 'vi_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
          suggest: { type: 'completion' }
        }
      },
      company_size: { type: 'integer' }, // For company reputation scoring

      // Security and ownership
      recruiter_id: { type: 'keyword' },
      recruiter_role: { type: 'keyword' },

      // LOCATION - Simplified structure
      location_id: { type: 'keyword' },
      location_name: {
        type: 'text',
        analyzer: 'vi_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
          autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
        }
      },

      // Hierarchical location (province/district kept for specific use cases)
      location_province: {
        type: 'text',
        analyzer: 'vi_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
        }
      },
      location_district: {
        type: 'text',
        analyzer: 'vi_analyzer',
        fields: {
          keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
        }
      },

      // Salary information
      salary_range: { type: 'text' },
      salary_min: { type: 'integer' },
      salary_max: { type: 'integer' },

      // Job characteristics
      job_type: { type: 'keyword' },
      experience_level: { type: 'integer' },

      // Job requirements (structured)
      job_requirements_title: {
        type: 'text',
        analyzer: 'vi_analyzer'
      },
      job_requirements_years_experience: { type: 'integer' },
      job_requirements_is_required: { type: 'boolean' },

      // Work arrangements - critical for matching
      is_remote_allowed: { type: 'boolean' },
      flexible_hours: { type: 'boolean' },
      remote_percentage: { type: 'integer' },
      travel_requirement: { type: 'keyword' },

      // Benefits - nested for better structure
      job_benefits: {
        type: 'nested',
        properties: {
          benefit_type: { type: 'keyword' },
          value_amount: { type: 'integer' },
          description: { type: 'text', analyzer: 'vi_analyzer' }
        }
      },

      // Benefits flat - for fast filtering
      job_benefits_type: { type: 'keyword' },
      job_benefits_value_amount: { type: 'integer' },

      // Status and lifecycle
      status: { type: 'keyword' },
      posted_at: { type: 'date' },
      expires_at: { type: 'date' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },

      // Metadata and custom fields
      metadata: { type: 'object' },

      // Analytics and tracking
      view_count: { type: 'integer' },
      application_count: { type: 'integer' },
      last_indexed_at: { type: 'date' }
    }
  },

  settings: {
    ...vietnameseAnalyzers,
    analysis: {
      ...vietnameseAnalyzers.analysis,
      analyzer: {
        ...vietnameseAnalyzers.analysis.analyzer,
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'edge_ngram_tokenizer',
          filter: ['lowercase', 'asciifolding_filter']
        }
      },
      tokenizer: {
        edge_ngram_tokenizer: {
          type: 'edge_ngram',
          min_gram: 1,
          max_gram: 15, // Optimized for job titles and skills
          token_chars: ['letter', 'digit', 'whitespace']
        }
      }
    },

    // Index settings for performance
    index: {
      number_of_shards: 3,     // Balanced for search performance
      number_of_replicas: 1,   // Good for availability
      refresh_interval: '30s', // Balanced refresh rate

      // Mapping settings
      mapping: {
        total_fields: {
          limit: 2000  // Increased limit for rich job data
        },
        nested_fields: {
          limit: 100   // Allow nested structures
        }
      }
    }
  }
}

/**
 * Migration helper - transforms v1 documents to v2 format
 */
export function transformJobV1ToV2(v1Document: any): any {
  const v2Document = { ...v1Document }

  // Transform skills from flat array to nested structure
  if (v1Document.skills && Array.isArray(v1Document.skills)) {
    // Keep flat version for backward compatibility
    v2Document.skills_flat = v1Document.skills

    // Create nested structure with default proficiency
    v2Document.skills = v1Document.skills.map((skillName: string) => ({
      name: skillName,
      proficiency: 3, // Default proficiency level
      level: 'intermediate',
      category: 'technical',
      category_type: 'skill'
    }))
  }

  // Transform benefits from flat to nested if needed
  if (v1Document.job_benefits_type && Array.isArray(v1Document.job_benefits_type)) {
    v2Document.job_benefits = v1Document.job_benefits_type.map((benefitType: string) => ({
      benefit_type: benefitType,
      value_amount: v1Document.job_benefits_value_amount || 0,
      description: ''
    }))
  }

  // Add indexing timestamp
  v2Document.last_indexed_at = new Date().toISOString()

  return v2Document
}

/**
 * Validation helper - ensures v2 document conforms to mapping
 */
export function validateJobV2Document(document: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields validation
  if (!document.id) errors.push('Missing required field: id')
  if (!document.job_id) errors.push('Missing required field: job_id')
  if (!document.title) errors.push('Missing required field: title')
  if (!document.company_id) errors.push('Missing required field: company_id')
  if (!document.status) errors.push('Missing required field: status')

  // Skills validation
  if (document.skills && !Array.isArray(document.skills)) {
    errors.push('skills must be an array of nested objects')
  }

  if (document.skills_flat && !Array.isArray(document.skills_flat)) {
    errors.push('skills_flat must be an array of strings')
  }

  // Salary validation
  if (document.salary_min && document.salary_max && document.salary_min > document.salary_max) {
    errors.push('salary_min cannot be greater than salary_max')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
