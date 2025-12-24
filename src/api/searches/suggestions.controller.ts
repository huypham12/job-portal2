import { Request, Response } from 'express'
import { SuggestionRequestSchema } from './search.dto'
import { searchService } from './search.service'

/**
 * Controller for suggestions.
 * - Validates query using Zod
 * - Calls searchService.suggest and returns `{ suggestions }`
 */
export async function suggestionsController(req: Request, res: Response) {
  const parsed = SuggestionRequestSchema.parse(req.query)
  const resp = await searchService.suggest(parsed)
  return res.json(resp)
}


