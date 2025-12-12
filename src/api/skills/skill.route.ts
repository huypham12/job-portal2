import { Router } from 'express'
import { skillController } from './skill.controller'

const router = Router()

/**
 * GET /api/skills
 * Search and list all available skills for autocomplete
 * Public endpoint - no authentication required
 */
router.get('/', skillController.searchSkills)

/**
 * GET /api/skills/categories
 * Get all skill categories for filtering
 * Public endpoint
 */
router.get('/categories', skillController.getCategories)

export default router
