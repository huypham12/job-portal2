import { Request, Response } from 'express'
import { searchService } from './search.service'
import { SkillsSuggestionRequestDto } from './search.dto'

export const skillsSuggestionController = async (req: Request, res: Response) => {
  try {
    const dto: SkillsSuggestionRequestDto = req.query as any

    const result = await searchService.suggestSkills(dto)

    res.json(result)
  } catch (error) {
    console.error('Skills suggestion error:', error)
    res.status(500).json({
      error: 'Internal server error',
      suggestions: []
    })
  }
}
