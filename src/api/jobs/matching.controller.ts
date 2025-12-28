import { Request, Response } from 'express'
import { MatchCandidatesRequestSchema, MatchJobsRequestSchema } from './matching.dto'
import { matchingService } from './matching.service'

/**
 * POST /api/matching/job/:jobId/candidates
 * - Validates body using Zod
 * - Calls matchingService.matchCandidatesForJob
 */
export async function matchCandidatesController(req: Request, res: Response) {
  const jobId = req.params.jobId
  const parsed = MatchCandidatesRequestSchema.parse(req.body)
  const resp = await matchingService.matchCandidatesForJob(jobId, parsed)
  return res.json(resp)
}

/**
 * POST /api/matching/profile/:profileId/jobs
 * - Validates body using Zod
 * - Calls matchingService.matchJobsForProfile
 */
export async function matchJobsForProfileController(req: Request, res: Response) {
  const profileId = req.params.profileId
  const parsed = MatchJobsRequestSchema.parse(req.body)
  const resp = await matchingService.matchJobsForProfile(profileId, parsed)
  return res.json(resp)
}
