import { Request, Response } from 'express'
import { JobSearchRequestSchema } from './search.dto'
import { searchService } from './search.service'

/**
 * Controller: validate request using Zod, call service, return snake_case response.
 * No business logic should be added here.
 */
export async function searchJobsController(req: Request, res: Response) {
  const parsed = JobSearchRequestSchema.parse(req.query)
  const result = await searchService.searchJobs(parsed)
  return res.json(result)
}


