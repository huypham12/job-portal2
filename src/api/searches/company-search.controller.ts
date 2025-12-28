import { Request, Response } from 'express'
import { companySearchService } from './company-search.service'
import { CompanySearchRequestDto, CompanySuggestionsRequestDto, PopularCompaniesRequestDto } from './search.dto'

/**
 * Controller for company search operations
 */

/**
 * Search companies with filters
 * GET /api/search/companies
 */
export async function searchCompaniesController(req: Request, res: Response) {
  const query: CompanySearchRequestDto = req.validated!.query
  const result = await companySearchService.searchCompanies(query)
  return res.json(result)
}

/**
 * Get company search suggestions
 * GET /api/search/companies/suggestions
 */
export async function companiesSuggestionsController(req: Request, res: Response) {
  const query: CompanySuggestionsRequestDto = req.validated!.query
  const result = await companySearchService.getCompanySuggestions(query)
  return res.json(result)
}

/**
 * Get popular companies
 * GET /api/search/companies/popular
 */
export async function getPopularCompaniesController(req: Request, res: Response) {
  const query: PopularCompaniesRequestDto = req.validated!.query
  const result = await companySearchService.getPopularCompanies(query)
  return res.json(result)
}
