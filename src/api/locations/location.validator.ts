import { z } from 'zod'

// Query validator for getting districts by province
export const getDistrictsQuery = z.object({
  province_id: z.string().uuid('Invalid province ID format')
})

// Query validator for searching locations
export const searchLocationsQuery = z.object({
  search: z.string().trim().min(1, 'Search term is required'),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional()
})

// Params validator for getting location by ID
export const locationIdParams = z.object({
  id: z.string().uuid('Invalid location ID format')
})

// Type exports
export type GetDistrictsQuery = z.infer<typeof getDistrictsQuery>
export type SearchLocationsQuery = z.infer<typeof searchLocationsQuery>
export type LocationIdParams = z.infer<typeof locationIdParams>
