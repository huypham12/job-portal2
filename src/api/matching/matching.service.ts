import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchService } from '../searches/search.service'
import { computeScoreComponents, normalizeScore, DEFAULT_SCORE_WEIGHTS } from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'

/**
 * Use min-max normalization of ES raw _score across the retrieved topN hits
 * to produce a deterministic text score in 0..1. This avoids relying on a
 * global arbitrary MAX and adapts to result set variations.
 */

export const matchingService = {
  /**
   * Return candidates for a job with score_percent and explanation.
   */
  async matchCandidatesForJob(jobId: string, size = 50) {
    // Fetch job payload from ES (lightweight)
    const jobPayload = await elasticsearchService.getById({ index: 'jobs', id: jobId })
    if (!jobPayload) return { jobId, total: 0, candidates: [] }

    const topN = Math.max(size, 200)
    const hits = await searchService.searchProfilesForJob(jobPayload, topN)

    // Compute min/max of ES raw scores for min-max normalization
    const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
    const minScore = rawScores.length ? Math.min(...rawScores) : 0
    const maxScore = rawScores.length ? Math.max(...rawScores) : minScore

    const results = hits.map((h: any) => {
      const src = h._source || {}
      const rawText = typeof h._score === 'number' ? h._score : 0
      let textScoreNorm = 0
      if (maxScore === minScore) {
        textScoreNorm = rawText > 0 ? 1 : 0
      } else {
        textScoreNorm = Math.max(0, Math.min(1, (rawText - minScore) / (maxScore - minScore)))
      }

      const components = computeScoreComponents({
        textScore: textScoreNorm,
        requiredSkills: (jobPayload as any).skills ?? [],
        candidateSkills: src.skills ?? [],
        locationMatch:
          (jobPayload as any).location_id && src.location_id && (jobPayload as any).location_id === src.location_id
            ? 1
            : 0,
        experienceYears: src.years_of_experience ?? 0,
        expectedExperience: (jobPayload as any).experience_level ?? 0,
        postedAtMs: (jobPayload as any).posted_at ? new Date((jobPayload as any).posted_at).getTime() : undefined,
        lastActiveAtMs: src.last_active_at ? new Date(src.last_active_at).getTime() : undefined,
        availabilityStatus: src.availability_status ?? 'OPEN'
      })

      const weightedRaw =
        components.text * DEFAULT_SCORE_WEIGHTS.text +
        components.skills * DEFAULT_SCORE_WEIGHTS.skills +
        components.location * DEFAULT_SCORE_WEIGHTS.location +
        components.experience * DEFAULT_SCORE_WEIGHTS.experience +
        components.recency * DEFAULT_SCORE_WEIGHTS.recency +
        components.activity * DEFAULT_SCORE_WEIGHTS.activity +
        components.availability * DEFAULT_SCORE_WEIGHTS.availability

      const score_percent = normalizeScore(weightedRaw)
      const explanation = formatBreakdown(components, DEFAULT_SCORE_WEIGHTS)

      return {
        id: h.id,
        score_percent,
        explanation,
        _source: src
      }
    })

    // Return top `size` sorted by score_percent desc
    const sorted = results.sort((a, b) => b.score_percent - a.score_percent).slice(0, size)
    return { jobId, total: results.length, candidates: sorted }
  },

  /**
   * Return jobs for a profile with score_percent and explanation.
   */
  async matchJobsForProfile(profileId: string, size = 50) {
    const profilePayload = await elasticsearchService.getById({ index: 'profiles', id: profileId })
    if (!profilePayload) return { profileId, total: 0, jobs: [] }

    const topN = Math.max(size, 200)
    const hits = await searchService.searchJobsForProfile(profilePayload, topN)

    const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
    const minScore = rawScores.length ? Math.min(...rawScores) : 0
    const maxScore = rawScores.length ? Math.max(...rawScores) : minScore

    const results = hits.map((h: any) => {
      const src = h._source || {}
      const rawText = typeof h._score === 'number' ? h._score : 0
      let textScoreNorm = 0
      if (maxScore === minScore) {
        textScoreNorm = rawText > 0 ? 1 : 0
      } else {
        textScoreNorm = Math.max(0, Math.min(1, (rawText - minScore) / (maxScore - minScore)))
      }

      const components = computeScoreComponents({
        textScore: textScoreNorm,
        requiredSkills: src.skills ?? [],
        candidateSkills: (profilePayload as any).skills ?? [],
        locationMatch:
          src.location_id &&
          (profilePayload as any).location_id &&
          src.location_id === (profilePayload as any).location_id
            ? 1
            : 0,
        experienceYears: (profilePayload as any).years_of_experience ?? 0,
        expectedExperience: src.experience_level ?? 0,
        postedAtMs: src.posted_at ? new Date(src.posted_at).getTime() : undefined,
        lastActiveAtMs: (profilePayload as any).last_active_at
          ? new Date((profilePayload as any).last_active_at).getTime()
          : undefined
      })

      const weightedRaw =
        components.text * DEFAULT_SCORE_WEIGHTS.text +
        components.skills * DEFAULT_SCORE_WEIGHTS.skills +
        components.location * DEFAULT_SCORE_WEIGHTS.location +
        components.experience * DEFAULT_SCORE_WEIGHTS.experience +
        components.recency * DEFAULT_SCORE_WEIGHTS.recency +
        components.activity * DEFAULT_SCORE_WEIGHTS.activity +
        components.availability * DEFAULT_SCORE_WEIGHTS.availability

      const score_percent = normalizeScore(weightedRaw)
      const explanation = formatBreakdown(components, DEFAULT_SCORE_WEIGHTS)

      return {
        id: h.id,
        score_percent,
        explanation,
        _source: src
      }
    })

    const sorted = results.sort((a, b) => b.score_percent - a.score_percent).slice(0, size)
    return { profileId, total: results.length, jobs: sorted }
  }
}
