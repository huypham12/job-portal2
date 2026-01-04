import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchService } from '../searches/search.service'
import { redisService } from '../../config/redis.service'
import { computeScoreComponents, normalizeScore, DEFAULT_SCORE_WEIGHTS } from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'
import { buildJobSearchQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'

/**
 * Use min-max normalization of ES raw _score across the retrieved topN hits
 * to produce a deterministic text score in 0..1. This avoids relying on a
 * global arbitrary MAX and adapts to result set variations.
 */

export const matchingService = {
  /**
   * Return candidates for a job with enhanced scoring and explanation
   * Automatic matching based on job requirements - no manual filters needed
   */
  async matchCandidatesForJob(jobId: string, size = 50) {
    const cacheKey = `matching:candidates:job:${jobId}:size:${size}`
    const cacheHit = await redisService.get(cacheKey)
    if (cacheHit) {
      return JSON.parse(cacheHit)
    }

    try {
      // Sử dụng phương thức enhanced từ ES service - automatic matching from job content only
      const result = await elasticsearchService.matchCandidatesForJobEnhanced(jobId, size)

      // elasticsearchService.normalizeSearchResponse returns { took, total, hits }
      // where hits = [{ id, _source, _score }, ...]. Normalize to the expected
      // matching response shape used by frontend.
      const hits = Array.isArray((result as any).hits) ? (result as any).hits : []

      // Min-max normalization for consistent scoring across results
      const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
      const minScore = rawScores.length ? Math.min(...rawScores) : 0
      const maxScore = rawScores.length ? Math.max(...rawScores) : minScore

      const candidates = hits.map((h: any) => {
        const scoreRaw = typeof h._score === 'number' ? h._score : 0

        // Normalize score to 0-100 range
        let score_percent = 0
        if (maxScore === minScore) {
          score_percent = scoreRaw > 0 ? 100 : 0
        } else {
          score_percent = Math.max(0, Math.min(100, Math.round(((scoreRaw - minScore) / (maxScore - minScore)) * 100)))
        }

        return {
          id: h.id,
          score_percent,
          _score: h._score,
          _source: h._source,
          explanation: {
            // For candidates, we provide basic score info since detailed matching
            // logic is based on job requirements and candidate profiles
            text_match: scoreRaw > 0 ? Math.max(0, Math.min(100, Math.round(scoreRaw * 100))) : 0,
            overall_score: score_percent
          }
        }
      })

      const filteredResult = {
        jobId,
        total: typeof (result as any).total === 'number' ? (result as any).total : candidates.length,
        candidates: candidates.slice(0, size)
      }

      // Cache results for 30 minutes
      try {
        await redisService.set(cacheKey, JSON.stringify(filteredResult), 30 * 60)
      } catch (e) {
        // Non-fatal
      }

      return filteredResult
    } catch (error) {
      console.error(`Enhanced candidate matching failed for job ${jobId}:`, error)
      throw error
    }
  }
}
