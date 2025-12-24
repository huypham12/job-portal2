import { jobRepo } from './job.repo'
import { resumeRepo } from '../resumes/resume.repo'
import { searchService } from '../searches/search.service'
import {
  MatchCandidatesRequestDto,
  MatchCandidatesResponseDto,
  MatchJobsRequestDto,
  MatchJobsResponseDto,
} from './matching.dto'
import { computeScoreComponents, normalizeScore } from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'
import { metrics } from '../../shared/utils/metrics.util'

const defaultWeights = {
  text: 0.35,
  skills: 0.3,
  location: 0.15,
  experience: 0.1,
  recency: 0.05,
  activity: 0.05,
}

/**
 * Matching service: orchestrates retrieval and server-side scoring for candidates for a job.
 * - Retrieves job via jobRepo
 * - Uses searchService.searchProfilesForJob(job, topN) to get candidate ids + ES scores
 * - Fetches canonical profile data via resumeRepo.getProfilesByIds
 * - Computes deterministic components via computeScoreComponents
 * - Aggregates weighted score, normalizes to percent, returns breakdown
 */
export const matchingService = {
  async matchCandidatesForJob(jobId: string, dto: MatchCandidatesRequestDto): Promise<MatchCandidatesResponseDto> {
    const stopTimer = metrics.startTimer('matching.matchCandidates.duration')
    const job = await jobRepo.getById(jobId)
    if (!job) {
      stopTimer()
      throw new Error('job not found')
    }

    const topN = Math.min(200, (dto.size ?? 10) * 20) // retrieve a reasonable candidate pool

    const esHits = await searchService.searchProfilesForJob(job, topN)

    // extract ids preserving ES order
    const profileIds = esHits.map((h: any) => h.id).filter(Boolean)
    if (profileIds.length === 0) {
      return { job_id: jobId, total: 0, candidates: [] }
    }

    const profiles = await resumeRepo.getProfilesByIds(profileIds)
    const profileMap = profiles.reduce((acc: any, p: any) => {
      if (p && p.id) acc[p.id] = p
      return acc
    }, {})

    // normalize text score based on top hit score (simple heuristic)
    const maxScore = Math.max(1, ...esHits.map((h: any) => (h._score ?? 0)))

    const candidates = esHits
      .map((h: any) => {
        const profile = profileMap[h.id]
        if (!profile) return null

        const textScoreNorm = Math.max(0, Math.min(1, (h._score ?? 0) / maxScore))

        // compute simple location match: exact ->1, remote allowed ->0.6, else 0.2
        const jobAllowsRemote = Boolean(job.metadata && (job.metadata as any).is_remote_allowed)
        let locationMatch = 0.2
        if (job.locationId && profile.locationId && job.locationId === profile.locationId) {
          locationMatch = 1
        } else if (jobAllowsRemote) {
          locationMatch = 0.6
        }

        const components = computeScoreComponents({
          textScore: textScoreNorm,
          requiredSkills: job.skills ?? [],
          candidateSkills: profile.skills ?? [],
          locationMatch,
          experienceYears: profile.yearsOfExperience ?? 0,
          expectedExperience: job.experienceLevel ?? 0,
          postedAtMs: job.postedAtMs,
          lastActiveAtMs: profile.lastActiveAtMs,
        })

        const raw =
          components.text * defaultWeights.text +
          components.skills * defaultWeights.skills +
          components.location * defaultWeights.location +
          components.experience * defaultWeights.experience +
          components.recency * defaultWeights.recency +
          components.activity * defaultWeights.activity

        const clamped = Math.max(0, Math.min(1, raw))
        const percent = normalizeScore(clamped)
        const breakdown = formatBreakdown(components, defaultWeights)

        return {
          id: profile.id,
          score_percent: percent,
          explanation: breakdown,
          _source: profile,
        }
      })
      .filter(Boolean)
      .slice(0, dto.size ?? 10)

    stopTimer()

    return {
      job_id: jobId,
      total: candidates.length,
      candidates: candidates as any[],
    }
  },
  /**
   * matchJobsForProfile
   *
   * - Retrieves profile via resumeRepo.getById
   * - Uses searchService.searchJobsForProfile(profile, topN) to get job ids + ES scores
   * - Fetches job data via jobRepo.getTopJobsByIds
   * - Computes same score components (from candidate perspective) and returns jobs with breakdown
   */
  async matchJobsForProfile(profileId: string, dto: MatchJobsRequestDto): Promise<MatchJobsResponseDto> {
    const stopTimer = metrics.startTimer('matching.matchJobs.duration')
    const profile = await resumeRepo.getById(profileId)
    if (!profile) {
      stopTimer()
      throw new Error('profile not found')
    }

    const topN = Math.min(200, (dto.size ?? 10) * 20)
    const esHits = await (searchService as any).searchJobsForProfile(profile, topN)

    const jobIds = esHits.map((h: any) => h.id).filter(Boolean)
    if (jobIds.length === 0) {
      return { profile_id: profileId, total: 0, jobs: [] }
    }

    // fetch jobs from repo (stub)
    let jobs: any[] = []
    try {
      jobs = await jobRepo.getTopJobsByIds(jobIds)
    } catch (e) {
      // fallback: attempt to fetch individually if batch not implemented
      jobs = await Promise.all(jobIds.map((id: string) => jobRepo.getById(id)))
    }

    const jobMap = jobs.reduce((acc: any, j: any) => {
      if (j && j.id) acc[j.id] = j
      return acc
    }, {})

    const maxScore = Math.max(1, ...esHits.map((h: any) => (h._score ?? 0)))

    const result = esHits
      .map((h: any) => {
        const job = jobMap[h.id]
        if (!job) return null

        const textScoreNorm = Math.max(0, Math.min(1, (h._score ?? 0) / maxScore))

        const jobAllowsRemote = Boolean(job.metadata && (job.metadata as any).is_remote_allowed)
        let locationMatch = 0.2
        if (job.locationId && profile.locationId && job.locationId === profile.locationId) {
          locationMatch = 1
        } else if (jobAllowsRemote) {
          locationMatch = 0.6
        }

        const components = computeScoreComponents({
          textScore: textScoreNorm,
          requiredSkills: job.skills ?? [],
          candidateSkills: profile.skills ?? [],
          locationMatch,
          experienceYears: profile.yearsOfExperience ?? 0,
          expectedExperience: job.experienceLevel ?? 0,
          postedAtMs: job.postedAtMs,
          lastActiveAtMs: profile.lastActiveAtMs,
        })

        const raw =
          components.text * defaultWeights.text +
          components.skills * defaultWeights.skills +
          components.location * defaultWeights.location +
          components.experience * defaultWeights.experience +
          components.recency * defaultWeights.recency +
          components.activity * defaultWeights.activity

        const clamped = Math.max(0, Math.min(1, raw))
        const percent = normalizeScore(clamped)
        const breakdown = formatBreakdown(components, defaultWeights)

        return {
          id: job.id,
          score_percent: percent,
          explanation: breakdown,
          _source: job,
        }
      })
      .filter(Boolean)
      .slice(0, dto.size ?? 10)

    stopTimer()

    return {
      profile_id: profileId,
      total: result.length,
      jobs: result as any[],
    }
  },
}


