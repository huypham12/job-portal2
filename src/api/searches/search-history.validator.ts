import { z } from 'zod'
import { zodValidate } from '../../shared/validators/validate-request'

// Schema for getting search history with pagination
export const GetSearchHistorySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
})

// Schema for URL parameters (like history ID)
export const SearchHistoryIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

// Validation functions
export const getSearchHistoryValidator = zodValidate({
  query: GetSearchHistorySchema
})
export const searchHistoryIdValidator = zodValidate({
  params: SearchHistoryIdParamSchema
})
