import { Request, Response } from 'express'
import { searchService } from './search.service'
import { CategoriesSuggestionRequestDto } from './search.dto'

export const categoriesSuggestionController = async (req: Request, res: Response) => {
  try {
    const dto: CategoriesSuggestionRequestDto = req.query as any

    const result = await searchService.suggestCategories(dto)

    res.json(result)
  } catch (error) {
    console.error('Categories suggestion error:', error)
    res.status(500).json({
      error: 'Internal server error',
      suggestions: []
    })
  }
}
