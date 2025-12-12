import { RequestHandler } from 'express'
import { SkillService } from './skill.service'

export class SkillController {
  constructor(private skillService: SkillService) {}

  /**
   * GET /api/skills?search=react&category=Web Development
   * Search skills with optional filters
   */
  searchSkills: RequestHandler = async (req, res) => {
    const { search, category, limit = '50', offset = '0' } = req.query

    const result = await this.skillService.searchSkills({
      search: search as string,
      category: category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })

    res.json({
      success: true,
      data: result.skills,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    })
  }

  /**
   * GET /api/skills/categories
   * Get list of all skill categories
   */
  getCategories: RequestHandler = async (req, res) => {
    const categories = await this.skillService.getCategories()

    res.json({
      success: true,
      data: categories
    })
  }
}

export const skillService = new SkillService()
export const skillController = new SkillController(skillService)
