import { Request, Response } from 'express'
import { searchService } from './search.service'
import { CompanySuggestionsRequestDto } from './search.dto'

/**
 * Controller for company suggestions
 */

/**
 * Get company search suggestions for job search
 * GET /api/search/companies/suggestions
 */
export async function companiesSuggestionsController(req: Request, res: Response) {
  const query: CompanySuggestionsRequestDto = req.validated!.query
  const result = await searchService.suggestCompanies(query)
  return res.json(result)
}
