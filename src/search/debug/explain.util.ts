/**
 * Search Explain & Debug Utilities
 *
 * Provides tools for debugging Elasticsearch queries and understanding scoring.
 */

import { elasticsearchService } from '../../config/elasticsearch.service'

/**
 * Explain a document's score for a given query
 */
export async function explainQuery(
  indexName: string,
  documentId: string,
  query: any
): Promise<{
  documentId: string
  index: string
  explanation: any
  score: number
  parsedExplanation?: ParsedExplanation
}> {
  try {
    const explanation = await elasticsearchService.explainQuery(indexName, documentId, query)

    return {
      documentId,
      index: indexName,
      explanation,
      score: explanation._explanation?.value || 0,
      parsedExplanation: parseExplainResult(explanation._explanation)
    }
  } catch (error) {
    console.error(`Failed to explain query for ${indexName}/${documentId}:`, error)
    throw error
  }
}

/**
 * Profile a query to understand performance characteristics
 */
export async function profileQuery(
  indexName: string,
  query: any
): Promise<{
  query: any
  profile: any
  summary: QueryProfileSummary
}> {
  try {
    const profile = await elasticsearchService.profileQuery(indexName, query)

    return {
      query,
      profile,
      summary: summarizeProfile(profile)
    }
  } catch (error) {
    console.error(`Failed to profile query for ${indexName}:`, error)
    throw error
  }
}

/**
 * Parse Elasticsearch explanation into readable format
 */
export function parseExplainResult(
  explanation: any,
  depth: number = 0
): ParsedExplanation {
  if (!explanation) {
    return {
      description: 'No explanation available',
      score: 0,
      details: []
    }
  }

  const parsed: ParsedExplanation = {
    description: explanation.description || 'Unknown',
    score: explanation.value || 0,
    details: []
  }

  // Parse details recursively
  if (explanation.details && Array.isArray(explanation.details)) {
    parsed.details = explanation.details.map((detail: any) =>
      parseExplainResult(detail, depth + 1)
    )
  }

  return parsed
}

/**
 * Summarize query profile for performance analysis
 */
function summarizeProfile(profile: any): QueryProfileSummary {
  const summary: QueryProfileSummary = {
    totalTimeMs: 0,
    breakdown: {
      query: [],
      fetch: []
    },
    bottlenecks: [],
    recommendations: []
  }

  try {
    // Extract timing information
    if (profile.shards) {
      let totalTime = 0
      for (const shard of profile.shards) {
        if (shard.query && shard.query.time_in_nanos) {
          totalTime += shard.query.time_in_nanos / 1_000_000 // Convert to ms
        }
        if (shard.fetch && shard.fetch.time_in_nanos) {
          totalTime += shard.fetch.time_in_nanos / 1_000_000
        }
      }
      summary.totalTimeMs = totalTime
    }

    // Analyze bottlenecks
    if (profile.shards) {
      for (const shard of profile.shards) {
        if (shard.query) {
          const queryTimeMs = shard.query.time_in_nanos / 1_000_000
          if (queryTimeMs > 100) {
            summary.bottlenecks.push(`Slow query on shard ${shard.id}: ${queryTimeMs}ms`)
          }
        }
      }
    }

    // Generate recommendations
    if (summary.totalTimeMs > 500) {
      summary.recommendations.push('Query is slow (>500ms). Consider optimization.')
    }

    if (summary.bottlenecks.length > 0) {
      summary.recommendations.push('Consider query restructuring or index optimization.')
    }

  } catch (error) {
    console.warn('Failed to parse profile summary:', error)
  }

  return summary
}

/**
 * Analyze common search issues and provide suggestions
 */
export function analyzeSearchIssues(
  query: any,
  results: any[],
  explanation?: ParsedExplanation
): SearchIssueAnalysis {
  const analysis: SearchIssueAnalysis = {
    issues: [],
    suggestions: [],
    severity: 'low'
  }

  // Check for empty results
  if (!results || results.length === 0) {
    analysis.issues.push('No results returned')
    analysis.suggestions.push('Check query syntax and filters')
    analysis.suggestions.push('Verify index contains relevant documents')
    analysis.severity = 'high'
  }

  // Check for over-boosting
  if (query.bool?.should && query.bool.should.length > 10) {
    analysis.issues.push('Too many should clauses may cause scoring confusion')
    analysis.suggestions.push('Consider consolidating related boost conditions')
    analysis.severity = 'medium'
  }

  // Check for missing minimum_should_match
  if (query.bool?.should && query.bool.should.length > 0 && !query.bool.minimum_should_match) {
    analysis.issues.push('Should clauses without minimum_should_match can return irrelevant results')
    analysis.suggestions.push('Add minimum_should_match parameter')
    analysis.severity = 'medium'
  }

  // Check explanation for scoring issues
  if (explanation) {
    if (explanation.score === 0) {
      analysis.issues.push('Document scored 0 - may not match query')
      analysis.suggestions.push('Check if document matches mandatory (must) clauses')
      analysis.severity = 'high'
    }

    // Check for extremely high scores
    if (explanation.score > 10) {
      analysis.issues.push('Very high score may indicate over-boosting')
      analysis.suggestions.push('Review boost values in query')
      analysis.severity = 'medium'
    }
  }

  return analysis
}

/**
 * Generate a human-readable explanation of scoring factors
 */
export function generateReadableExplanation(explanation: ParsedExplanation): string {
  const lines: string[] = []

  function formatExplanation(exp: ParsedExplanation, indent: number = 0): void {
    const prefix = '  '.repeat(indent)
    lines.push(`${prefix}${exp.description} = ${exp.score.toFixed(4)}`)

    if (exp.details && exp.details.length > 0) {
      for (const detail of exp.details) {
        formatExplanation(detail, indent + 1)
      }
    }
  }

  formatExplanation(explanation)
  return lines.join('\n')
}

/**
 * Extract top scoring factors from explanation
 */
export function extractTopScoringFactors(
  explanation: ParsedExplanation,
  maxFactors: number = 5
): Array<{ description: string; score: number; percentage: number }> {
  const factors: Array<{ description: string; score: number }> = []

  function collectFactors(exp: ParsedExplanation): void {
    if (exp.score > 0) {
      factors.push({
        description: exp.description,
        score: exp.score
      })
    }

    if (exp.details) {
      for (const detail of exp.details) {
        collectFactors(detail)
      }
    }
  }

  collectFactors(explanation)

  // Sort by score descending and take top factors
  const topFactors = factors
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFactors)

  // Calculate percentages
  const totalScore = explanation.score
  return topFactors.map(factor => ({
    ...factor,
    percentage: totalScore > 0 ? (factor.score / totalScore) * 100 : 0
  }))
}

/**
 * Compare two queries to understand performance differences
 */
export function compareQueries(
  query1: { query: any; profile?: any },
  query2: { query: any; profile?: any }
): QueryComparison {
  const comparison: QueryComparison = {
    query1: {
      totalTimeMs: query1.profile?.shards?.[0]?.query?.time_in_nanos / 1_000_000 || 0,
      complexity: estimateQueryComplexity(query1.query)
    },
    query2: {
      totalTimeMs: query2.profile?.shards?.[0]?.query?.time_in_nanos / 1_000_000 || 0,
      complexity: estimateQueryComplexity(query2.query)
    },
    improvement: 0,
    analysis: ''
  }

  comparison.improvement = comparison.query1.totalTimeMs - comparison.query2.totalTimeMs

  if (comparison.improvement > 0) {
    comparison.analysis = `Query 2 is ${comparison.improvement.toFixed(2)}ms faster`
  } else if (comparison.improvement < 0) {
    comparison.analysis = `Query 1 is ${Math.abs(comparison.improvement).toFixed(2)}ms faster`
  } else {
    comparison.analysis = 'Queries have similar performance'
  }

  return comparison
}

/**
 * Estimate query complexity (rough heuristic)
 */
function estimateQueryComplexity(query: any): number {
  let complexity = 0

  function countComplexity(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      complexity++

      if (Array.isArray(obj)) {
        complexity += obj.length
      } else {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            countComplexity(obj[key])
          }
        }
      }
    }
  }

  countComplexity(query)
  return complexity
}

/**
 * Types for explain and debug utilities
 */

export interface ParsedExplanation {
  description: string
  score: number
  details: ParsedExplanation[]
}

export interface QueryProfileSummary {
  totalTimeMs: number
  breakdown: {
    query: Array<{ type: string; timeMs: number }>
    fetch: Array<{ type: string; timeMs: number }>
  }
  bottlenecks: string[]
  recommendations: string[]
}

export interface SearchIssueAnalysis {
  issues: string[]
  suggestions: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface QueryComparison {
  query1: {
    totalTimeMs: number
    complexity: number
  }
  query2: {
    totalTimeMs: number
    complexity: number
  }
  improvement: number
  analysis: string
}
