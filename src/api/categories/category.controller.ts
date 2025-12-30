import { RequestHandler } from 'express'
import { CategoryService } from './category.service'

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /**
   * GET /api/categories
   * Get all categories with optional type filtering
   * Public endpoint - no authentication required
   */
  getCategories: RequestHandler = async (req, res) => {
    const { type } = req.query

    const categories = await this.categoryService.getCategories(type as any)

    res.json({
      success: true,
      data: categories
    })
  }

  /**
   * GET /api/categories/grouped
   * Get categories grouped by type
   * Public endpoint - no authentication required
   */
  getCategoriesGrouped: RequestHandler = async (req, res) => {
    const groupedCategories = await this.categoryService.getCategoriesGrouped()

    res.json({
      success: true,
      data: groupedCategories
    })
  }
}

export const categoryService = new CategoryService()
export const categoryController = new CategoryController(categoryService)
