import { Router } from 'express'
import { categoryController } from './category.controller'

const router = Router()

/**
 * GET /api/categories
 * Get all categories with optional type filtering
 * Public endpoint - no authentication required
 */
router.get('/', categoryController.getCategories)

/**
 * GET /api/categories/grouped
 * Get categories grouped by type
 * Public endpoint - no authentication required
 */
router.get('/grouped', categoryController.getCategoriesGrouped)

export default router
