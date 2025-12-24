import { z } from 'zod'

export const EventRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  event_type: z.enum(['impression', 'click', 'apply']),
  job_id: z.string().uuid().optional(),
  profile_id: z.string().uuid().optional(),
  query: z.string().optional(),
  position: z.number().int().optional(),
  filters: z.record(z.any()).optional(),
  timestamp_ms: z.number().int().optional(),
})

export type EventRequestDto = z.infer<typeof EventRequestSchema>


