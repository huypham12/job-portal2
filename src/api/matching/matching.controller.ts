import { Request, Response } from 'express'
import { MatchingRequestSchema, MatchingCandidatesResponseSchema, MatchingJobsResponseSchema } from './matching.dto'
import { matchingService } from './matching.service'

export async function matchCandidatesController(req: Request, res: Response) {
  try {
    // Validate request parameters
    const params = MatchingRequestSchema.parse(req.query)
    const jobId = req.params.jobId

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        error: { message: 'Invalid jobId parameter' }
      })
    }

    // Get matching results from service
    const resp = await matchingService.matchCandidatesForJob(jobId, params.size)

    // Validate response against schema before sending
    const validatedResponse = MatchingCandidatesResponseSchema.parse(resp)

    return res.json(validatedResponse)
  } catch (error: any) {
    console.error('Matching candidates controller error:', error)

    if (error?.name === 'ZodError') {
      return res.status(400).json({
        error: {
          message: 'Invalid request parameters',
          details: error.errors
        }
      })
    }

    return res.status(500).json({
      error: { message: 'Internal server error during candidate matching' }
    })
  }
}

export async function matchJobsController(req: Request, res: Response) {
  try {
    // Validate request parameters
    const params = MatchingRequestSchema.parse(req.query)
    const profileId = req.params.profileId

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({
        error: { message: 'Invalid profileId parameter' }
      })
    }

    // Get matching results from service
    const resp = await matchingService.matchJobsForProfile(profileId, params.size)

    // Validate response against schema before sending
    const validatedResponse = MatchingJobsResponseSchema.parse(resp)

    return res.json(validatedResponse)
  } catch (error: any) {
    console.error('Matching jobs controller error:', error)

    if (error?.name === 'ZodError') {
      return res.status(400).json({
        error: {
          message: 'Invalid request parameters',
          details: error.errors
        }
      })
    }

    return res.status(500).json({
      error: { message: 'Internal server error during job matching' }
    })
  }
}
