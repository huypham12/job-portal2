import { Request, Response } from 'express'
import { SuggestionRequestDto } from './search.dto'
import { searchService } from './search.service'

/**
 * Controller for suggestions.
 * - Validation is handled by middleware
 * - Calls searchService.suggest and returns `{ suggestions }`
 */
export async function suggestionsController(req: Request, res: Response) {
  const query: SuggestionRequestDto = req.validated!.query
  const resp = await searchService.suggest(query)
  return res.json(resp)
}
