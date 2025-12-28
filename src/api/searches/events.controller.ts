import { Request, Response } from 'express'
import { EventRequestSchema } from './events.dto'
import { searchService } from './search.service'

/**
 * POST /api/events
 * - Validates request body using Zod
 * - Calls searchService.logEvent with enhanced context
 */
export async function eventsController(req: Request, res: Response) {
  const parsed = EventRequestSchema.parse(req.body)

  // Add additional context from request
  const enhancedEvent = {
    ...parsed,
    user_agent: req.get('User-Agent'),
    ip_address: req.ip || req.connection.remoteAddress,
    search_duration_ms: parsed.filters?.search_duration_ms,
    es_took_ms: parsed.filters?.es_took_ms
  }

  await searchService.logEvent(enhancedEvent)
  return res.json({ status: 'ok' })
}
