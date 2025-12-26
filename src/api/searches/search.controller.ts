import { Request, Response } from 'express'
import { JobSearchRequestDto } from './search.dto'
import { searchService } from './search.service'

/**
 * Controller: validation is handled by middleware, call service, return response.
 * No business logic should be added here.
 */
export async function searchJobsController(req: Request, res: Response) {
  const query: JobSearchRequestDto = req.validated!.query
  const result = await searchService.searchJobs(query)
  return res.json(result)
}
