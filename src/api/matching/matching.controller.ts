import { Request, Response } from 'express'
import { MatchingRequestSchema, MatchingCandidatesResponseSchema } from './matching.dto'
import { matchingService } from './matching.service'

export async function matchCandidatesController(req: Request, res: Response) {
  try {
    console.log(`🔍 [Controller] Starting matching for job ${req.params.jobId}`)
    // Validate request parameters
    const params = MatchingRequestSchema.parse(req.query)
    const jobId = req.params.jobId

    console.log(`🔍 [Controller] Params:`, { jobId, size: params.size, minScore: params.minScore })

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        error: { message: 'Invalid jobId parameter' }
      })
    }

    // Get matching results from service
    const resp = await matchingService.matchCandidatesForJob(jobId, params.size, params.minScore)

    console.log(`🔍 [Controller] Service response:`, { total: resp?.total, candidatesCount: resp?.candidates?.length })

    // Validate response against schema before sending
    const validatedResponse = MatchingCandidatesResponseSchema.parse(resp)

    console.log(`🔍 [Controller] Response validated successfully`)
    return res.json(validatedResponse)
  } catch (error: any) {
    console.error('❌ [Controller] Matching candidates controller error:', error)
    console.error('❌ [Controller] Error stack:', error?.stack)

    if (error?.name === 'ZodError') {
      return res.status(400).json({
        error: {
          message: 'Invalid request parameters',
          details: error.errors
        }
      })
    }

    return res.status(500).json({
      error: {
        message: 'Internal server error during candidate matching',
        details: error?.message
      }
    })
  }
}
