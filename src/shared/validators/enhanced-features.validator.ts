import { z } from 'zod'
import { zodValidate } from './validate-request'

/**
 * Validators for enhanced features: recent searches, recently viewed jobs,
 * popular jobs, job recommendations, and enhanced notifications
 */

// ==================== RECENT SEARCHES VALIDATORS ====================

const getRecentSearchesQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(50).default(10)),
  days: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(365).default(30))
})

export const getRecentSearchesValidator = zodValidate({ query: getRecentSearchesQuery })

const deleteRecentSearchParams = z.object({
  id: z.preprocess((val) => {
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1))
})

export const deleteRecentSearchValidator = zodValidate({ params: deleteRecentSearchParams })

const getPopularQueriesQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(20).default(10)),
  days: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(90).default(7))
})

export const getPopularQueriesValidator = zodValidate({ query: getPopularQueriesQuery })

// ==================== RECENTLY VIEWED JOBS VALIDATORS ====================

const getRecentlyViewedJobsQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(50).default(20)),
  days: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(90).default(30))
})

export const getRecentlyViewedJobsValidator = zodValidate({ query: getRecentlyViewedJobsQuery })

// ==================== POPULAR JOBS VALIDATORS ====================

const getPopularJobsQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(50).default(20)),
  period: z.enum(['day', 'week', 'month']).default('week'),
  category: z.string().min(1).max(100).optional()
})

export const getPopularJobsValidator = zodValidate({ query: getPopularJobsQuery })

const getTrendingJobsQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(20).default(10))
})

export const getTrendingJobsValidator = zodValidate({ query: getTrendingJobsQuery })

const getPopularJobsByLocationQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(10).default(5)),
  period: z.enum(['day', 'week', 'month']).default('week')
})

export const getPopularJobsByLocationValidator = zodValidate({ query: getPopularJobsByLocationQuery })

// ==================== JOB RECOMMENDATIONS VALIDATORS ====================

const getJobRecommendationsQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(20).default(10)),
  type: z.enum(['viewed', 'searched', 'mixed']).default('mixed')
})

export const getJobRecommendationsValidator = zodValidate({ query: getJobRecommendationsQuery })

const getForYouRecommendationsQuery = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(10).default(5))
})

export const getForYouRecommendationsValidator = zodValidate({ query: getForYouRecommendationsQuery })

// ==================== ENHANCED NOTIFICATIONS VALIDATORS ====================

const sendJobRecommendationsBody = z.object({
  limit: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(10).default(3))
})

export const sendJobRecommendationsValidator = zodValidate({ body: sendJobRecommendationsBody })

const sendPopularJobAlertsBody = z.object({
  threshold: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1).max(1000).default(10))
})

export const sendPopularJobAlertsValidator = zodValidate({ body: sendPopularJobAlertsBody })

export const sendLocationBasedAlertsValidator = zodValidate({})

export const sendSearchBasedAlertsValidator = zodValidate({})
