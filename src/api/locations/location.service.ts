import { prisma } from '@/config/database.service'
import { LocationType } from '@prisma/client'

export class LocationService {
  /**
   * Get all provinces (tỉnh/thành)
   * Used for dropdown/select options
   */
  async getProvinces() {
    const provinces = await prisma.locations.findMany({
      where: {
        type: LocationType.province
      },
      select: {
        id: true,
        name: true,
        type: true,
        latitude: true,
        longitude: true,
        _count: {
          select: {
            children: true // Count districts in this province
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return provinces
  }

  /**
   * Get districts (quận/huyện) by province ID
   * Used for dropdown/select options after selecting a province
   */
  async getDistrictsByProvinceId(provinceId: string) {
    // First verify that the province exists
    const province = await prisma.locations.findUnique({
      where: { id: provinceId },
      select: { id: true, type: true }
    })

    if (!province) {
      throw new Error('Province not found')
    }

    if (province.type !== LocationType.province) {
      throw new Error('Invalid province ID')
    }

    // Get all districts that belong to this province
    const districts = await prisma.locations.findMany({
      where: {
        type: LocationType.district,
        parent_id: provinceId
      },
      select: {
        id: true,
        name: true,
        type: true,
        parent_id: true,
        latitude: true,
        longitude: true,
        parent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return districts
  }

  /**
   * Get location by ID with full hierarchy
   * Returns location with parent (if district) and children (if province)
   */
  async getLocationById(locationId: string) {
    const location = await prisma.locations.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        type: true,
        parent_id: true,
        latitude: true,
        longitude: true,
        parent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            type: true,
            parent_id: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    })

    if (!location) {
      throw new Error('Location not found')
    }

    return location
  }

  /**
   * Search locations by name (supports both provinces and districts)
   * Used for autocomplete/search functionality
   */
  async searchLocations(search: string, limit: number = 50) {
    const locations = await prisma.locations.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        parent_id: true,
        parent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      take: limit,
      orderBy: [
        { type: 'asc' }, // Provinces first
        { name: 'asc' }
      ]
    })

    return locations
  }
}
