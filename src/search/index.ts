/**
 * Search Module Index
 *
 * Central façade for all search-related functionality.
 * Provides a clean API for services to use search capabilities.
 */

export { buildJobSearchQuery, buildJobSuggestionsQuery, buildPopularJobsQuery } from './jobSearch.builder'
export { buildProfileSearchFunctionScore } from './scoring/score.templates'
export { computeSkillScore } from './scoring/skill.scorer'
export { explainQuery, profileQuery, parseExplainResult } from './debug/explain.util'
export type {
  QueryContext,
  ESQuery,
  SearchResult,
  SearchResponse,
  ScoringComponent,
  ScoringWeights,
  JobDocument,
  ProfileDocument,
  SearchMode
} from './search.types'

/**
 * Search Module Interface
 *
 * This module provides:
 * - Query builders for different search types
 * - Scoring templates and utilities
 * - Debug and profiling tools
 * - Type definitions for search operations
 *
 * Usage:
 * ```ts
 * import { buildJobSearchQuery, explainQuery } from '@/search'
 *
 * const query = buildJobSearchQuery(context)
 * const explanation = await explainQuery('jobs', jobId, query)
 * ```
 */
