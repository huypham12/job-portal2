import { Request, Response, NextFunction } from 'express'
import { LocationService } from './location.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'

export class LocationController {
  constructor(private locationService: LocationService) {}

  /**
   * GET /api/locations/provinces
   * Get all provinces (tỉnh/thành)
   * Public endpoint - no authentication required
   */
  getProvinces = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provinces = await this.locationService.getProvinces()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Provinces retrieved successfully',
        data: provinces
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/locations/districts?province_id=xxx
   * Get all districts (quận/huyện) by province ID
   * Public endpoint - no authentication required
   */
  getDistricts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { province_id } = req.query

      if (!province_id || typeof province_id !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'province_id query parameter is required'
        })
      }

      const districts = await this.locationService.getDistrictsByProvinceId(province_id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Districts retrieved successfully',
        data: districts
      })
    } catch (error: any) {
      if (error.message === 'Province not found' || error.message === 'Invalid province ID') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: error.message
        })
      }
      next(error)
    }
  }

  /**
   * GET /api/locations/:id
   * Get location details by ID with full hierarchy
   * Public endpoint - no authentication required
   */
  getLocationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const location = await this.locationService.getLocationById(id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Location retrieved successfully',
        data: location
      })
    } catch (error: any) {
      if (error.message === 'Location not found') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: error.message
        })
      }
      next(error)
    }
  }

  /**
   * GET /api/locations/search?search=xxx&limit=50
   * Search locations by name
   * Public endpoint - no authentication required
   */
  searchLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, limit } = req.query

      if (!search || typeof search !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'search query parameter is required'
        })
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 50
      const locations = await this.locationService.searchLocations(search, limitNum)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Locations retrieved successfully',
        data: locations
      })
    } catch (error) {
      next(error)
    }
  }
}

