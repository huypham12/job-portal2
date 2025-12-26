/**
 * Repository stub for search-related Postgres lookups / enrichments.
 * Keep ES-specific logic in `elasticsearch.service`.
 */
import { prisma } from '../../config/database.service'

export const searchRepo = {
  async getCompaniesByIds(ids: string[]): Promise<Record<string, unknown>[]> {
    if (!ids || !ids.length) return []
    const companies = await prisma.companies.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        logo_url: true,
        description: true
      }
    })
    return companies as unknown as Record<string, unknown>[]
  },
  async saveEvent(event: import('./events.dto').EventRequestDto): Promise<void> {
    try {
      await prisma.activity_logs.create({
        data: {
          user_id: event.user_id ?? null,
          action: event.event_type,
          details: {
            job_id: event.job_id ?? null,
            profile_id: event.profile_id ?? null,
            query: event.query ?? null,
            position: event.position ?? null,
            filters: event.filters ?? null,
            timestamp_ms: event.timestamp_ms ?? Date.now()
          }
        }
      })
    } catch (e) {
      // Non-fatal: surface to caller by rethrowing if needed; for now, log and continue.

      console.error('searchRepo.saveEvent error', e)
      throw e
    }
  }
}
