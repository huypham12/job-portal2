import { Request, Response } from 'express'
import { MatchingRequestSchema } from './matching.dto'
import { matchingService } from './matching.service'

export async function matchCandidatesController(req: Request, res: Response) {
  const params = MatchingRequestSchema.parse(req.body)
  const jobId = req.params.jobId
  const resp = await matchingService.matchCandidatesForJob(jobId, params.size, params.filters)
  return res.json(resp)
}

export async function matchJobsController(req: Request, res: Response) {
  const params = MatchingRequestSchema.parse(req.body)
  const profileId = req.params.profileId
  const resp = await matchingService.matchJobsForProfile(profileId, params.size, params.filters)
  return res.json(resp)
}
