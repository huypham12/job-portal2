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
      // Return province ID + all districts under this province
      // This ensures jobs saved with province ID are also found when searching by province
      const districtIds = await this.getDistrictIdsByProvinceId(location.id)
      return [location.id, ...districtIds]
    } else if (location.type === 'district') {
      // Return the district ID
      return [location.id]
    }

    return []
  },

  async saveEvent(event: import('./events.dto').EventRequestDto): Promise<void> {
    try {
      // For search events, save to search_history if it's an impression event
      if (event.event_type === 'impression' && event.query) {
        await prisma.search_history.create({
          data: {
            profile_id: event.user_id || '', // Need to get profile_id from user_id
            search_query: event.query,
            search_type: 'job',
            result_count: event.result_count || 0,
            filters_used: event.filters || {}
            // session_id: event.session_id // Not in EventRequestDto yet
          }
        })
      }
      // For other events, we rely on ES storage for now
    } catch (e) {
      // Non-fatal: surface to caller by rethrowing if needed; for now, log and continue.
      console.error('searchRepo.saveEvent error', e)
      throw e
    }
  },

  async getJobById(id: string) {
    return await prisma.jobs.findUnique({
      where: { id },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            description: true
          }
        }
      }
    })
  },

  async getProfileById(id: string) {
    return await prisma.profiles.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        display_name: true,
        headline: true,
        bio: true,
        avatar_url: true
      }
    })
  },

  async getCompanyById(id: string) {
    return await prisma.companies.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        logo_url: true,
        description: true,
        status: true
      }
    })
  },

  /**
   * Get popular search queries from search_history
   * Returns aggregated queries sorted by frequency
   */
  async getPopularSearchQueries(limit: number = 50): Promise<
    Array<{
      q?: string
      location?: string
      locationId?: string
      frequency: number
    }>
  > {
    try {
      // Get recent searches from last 7 days
      const recentSearches = await prisma.search_history.findMany({
        where: {
          searched_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          },
          result_count: {
            gt: 0 // Only searches that returned results
          }
        },
        select: {
          search_query: true
        },
        take: 1000 // Limit raw data fetch
      })

      // Aggregate by query + location
      const aggregated = new Map<
        string,
        {
          q?: string
          location?: string
          locationId?: string
          frequency: number
        }
      >()

      recentSearches.forEach((search) => {
        const query = search.search_query as any
        const q = query?.q || ''
        const location = query?.location || ''
        const locationId = query?.locationId || ''

        const key = `${q}|${location}|${locationId}`

        if (aggregated.has(key)) {
          aggregated.get(key)!.frequency++
        } else {
          aggregated.set(key, {
            q: q || undefined,
            location: location || undefined,
            locationId: locationId || undefined,
            frequency: 1
          })
        }
      })

      // Sort by frequency and return top N
      return Array.from(aggregated.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to get popular search queries:', error)
      return []
    }
  },

  /**
   * Get top companies by job count or other criteria
   */
  async getTopCompanies(limit: number = 100): Promise<any[]> {
    try {
      const companies = await prisma.companies.findMany({
        where: {
          status: 'approved'
        },
        select: {
          id: true,
          name: true,
          logo_url: true,
          description: true
        },
        take: limit,
        orderBy: {
          name: 'asc' // Can be changed to job count when available
        }
      })

      return companies
    } catch (error) {
      console.error('Failed to get top companies:', error)
      return []
    }
  },

  /**
   * Get all locations for caching
   */
  async getAllLocations(): Promise<any[]> {
    try {
      const locations = await prisma.locations.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          parent_id: true
        },
        orderBy: {
          name: 'asc'
        }
      })

      return locations
    } catch (error) {
      console.error('Failed to get all locations:', error)
      return []
    }
  }
}
