import { Request, Response } from 'express'
import { JobSearchRequestDto } from './search.dto'
import { searchService } from './search.service'

/**
 * Controller: validation is handled by middleware, call service, return response.
 * No business logic should be added here.
 */
export async function searchJobsController(req: Request, res: Response) {
  const query: JobSearchRequestDto = req.validated!.query

  // Extract recruiterId from authenticated user if they are a recruiter
  // This enables tenant isolation for authenticated recruiters while allowing public search for candidates
  const recruiterId = req.decoded_authorization?.role === 'recruiter'
    ? req.decoded_authorization.user_id
    : undefined

  const result = await searchService.searchJobs({
    ...query,
    recruiterId
  })
  return res.json(result)
}
