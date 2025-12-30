import { prisma } from '@/config/database.service'
import { category_type } from '@prisma/client'

export class CategoryService {
  /**
   * Get all categories with optional type filtering
   * Used for job creation forms and filtering
   */
  async getCategories(type?: category_type) {
    const where: any = {}

    if (type) {
      where.type = type
    }

    const categories = await prisma.categories.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    return categories
  }

  /**
   * Get categories grouped by type
   * Useful for UI components that need to display categories in sections
   */
  async getCategoriesGrouped() {
    const categories = await this.getCategories()

    const grouped = categories.reduce((acc, category) => {
      const type = category.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(category)
      return acc
    }, {} as Record<string, typeof categories>)

    return grouped
  }

  /**
   * Get category by ID for validation
   */
  async getCategoryById(categoryId: string) {
    return await prisma.categories.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true
      }
    })
  }

  /**
   * Get multiple categories by IDs for bulk validation
   */
  async getCategoriesByIds(categoryIds: string[]) {
    return await prisma.categories.findMany({
      where: {
        id: {
          in: categoryIds
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true
      }
    })
  }
}
