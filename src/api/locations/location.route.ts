import { Router } from 'express'
import { LocationController } from './location.controller'
import { LocationService } from './location.service'

const router = Router()
const locationService = new LocationService()
const locationController = new LocationController(locationService)

/**
 * GET /api/locations/provinces
 * Get all provinces (tỉnh/thành)
 * Public endpoint - no authentication required
 */
router.get('/provinces', locationController.getProvinces)

/**
 * GET /api/locations/districts?province_id=xxx
 * Get all districts (quận/huyện) by province ID
 * Public endpoint - no authentication required
 */
router.get('/districts', locationController.getDistricts)

/**
 * GET /api/locations/search?search=xxx&limit=50
 * Search locations by name (supports both provinces and districts)
 * Public endpoint - no authentication required
 */
router.get('/search', locationController.searchLocations)

/**
 * GET /api/locations/:id
 * Get location details by ID with full hierarchy (parent if district, children if province)
 * Public endpoint - no authentication required
 */
router.get('/:id', locationController.getLocationById)

export default router
