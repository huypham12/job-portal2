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
    const { search, category, limit, offset } = params

    // Build WHERE clause
    const where: any = {}

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive' // Case-insensitive search
      }
    }

    if (category) {
      where.category = category
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
