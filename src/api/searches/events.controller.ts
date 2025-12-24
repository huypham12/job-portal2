import { Request, Response } from 'express'
import { EventRequestSchema } from './events.dto'
import { searchService } from './search.service'

/**
 * POST /api/events
 * - Validates request body using Zod
 * - Calls searchService.logEvent
 */
export async function eventsController(req: Request, res: Response) {
  const parsed = EventRequestSchema.parse(req.body)
  await searchService.logEvent(parsed)
  return res.json({ status: 'ok' })
}
