import { prisma } from '@/config/database.service'

interface SearchSkillsParams {
  search?: string
  category?: string
  limit: number
  offset: number
}

export class SkillService {
  /**
   * Search skills with filters
   * Supports:
   * - Fuzzy search by name
   * - Filter by category
   * - Pagination
   */
  async searchSkills(params: SearchSkillsParams) {
    const { search, category, limit = 50, offset = 0 } = params

    // Build WHERE clause
    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive' // Case-insensitive search
      }
    }

    if (category) {
      // category may be a category id (UUID) or a category slug/name.
      // Schema: skills has `category_id` relation to categories.
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (uuidV4Regex.test(category)) {
        // filter by foreign key category_id
        where.category_id = category
      } else {
        // filter by related category slug or name
        where.category = {
          // try slug first, fallback to name using OR
          OR: [
            { slug: category },
            { name: category }
          ]
        }
      }
    }

    // Execute query with pagination
    const [skills, total] = await Promise.all([
      prisma.skills.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true
        },
        orderBy: [{ name: 'asc' }],
        take: limit,
        skip: offset
      }),
      prisma.skills.count({ where })
    ])

    return { skills, total }
  }

  /**
   * Get all unique skill categories
   * Used for dropdown/filter options
   */
  async getCategories() {
    const result = await prisma.categories.findMany({
      where: {
        type: 'technical'
      },
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Return category objects
    return result
  }

  /**
   * Get skills by category ID
   * Used for dropdown options when selecting skills within a category
   */
  async getSkillsByCategory(categoryId: string) {
    return await prisma.skills.findMany({
      where: {
        category_id: categoryId
      },
      select: {
        id: true,
        name: true,
        category: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  }

  /**
   * Get skill by ID
   * Used for validation when creating profile_skills or job_skills
   */
  async getSkillById(skillId: string) {
    return await prisma.skills.findUnique({
      where: { id: skillId },
      select: {
        id: true,
        name: true,
        category: true
      }
    })
  }

  /**
   * Get multiple skills by IDs
   * Used for bulk validation
   */
  async getSkillsByIds(skillIds: string[]) {
    return await prisma.skills.findMany({
      where: {
        id: {
          in: skillIds
        }
      },
      select: {
        id: true,
        name: true,
        category: true
      }
    })
  }
}
