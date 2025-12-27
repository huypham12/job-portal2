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

  /**
   * Get location by name or ID, return location with type and parent info
   */
  async getLocationByNameOrId(
    locationInput: string
  ): Promise<{ id: string; name: string; type: string; parent_id?: string | null } | null> {
    // First try to find by ID (UUID)
    let location = await prisma.locations.findUnique({
      where: { id: locationInput },
      select: { id: true, name: true, type: true, parent_id: true }
    })

    // If not found by ID, try to find by name
    if (!location) {
      location = await prisma.locations.findFirst({
        where: { name: { equals: locationInput, mode: 'insensitive' } },
        select: { id: true, name: true, type: true, parent_id: true }
      })
    }

    return location
  },

  /**
   * Get all district IDs under a province
   */
  async getDistrictIdsByProvinceId(provinceId: string): Promise<string[]> {
    const districts = await prisma.locations.findMany({
      where: {
        parent_id: provinceId,
        type: 'district'
      },
      select: { id: true }
    })

    return districts.map((d) => d.id)
  },

  /**
   * Get location IDs for filtering based on location input
   * - If province: return all district IDs under that province
   * - If district: return that district ID
   */
  async getLocationIdsForFilter(locationInput: string): Promise<string[]> {
    const location = await this.getLocationByNameOrId(locationInput)
    if (!location) return []

    if (location.type === 'province') {
      // Return all districts under this province
      return await this.getDistrictIdsByProvinceId(location.id)
    } else if (location.type === 'district') {
      // Return the district ID
      return [location.id]
    }

    return []
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
