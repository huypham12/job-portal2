// import { Router } from 'express'
// import { SearchController } from './search.controller'
// import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'

// const router = Router()

// /**
//  * @swagger
//  * /api/search/jobs:
//  *   get:
//  *     tags: [Search]
//  *     summary: Search jobs with advanced filters
//  *     parameters:
//  *       - in: query
//  *         name: query
//  *         schema:
//  *           type: string
//  *         description: Search query for job title, description, company, skills
//  *       - in: query
//  *         name: location
//  *         schema:
//  *           type: string
//  *         description: Filter by location ID
//  *       - in: query
//  *         name: jobType
//  *         schema:
//  *           type: string
//  *         description: Filter by job type (full-time, part-time, contract, etc.)
//  *       - in: query
//  *         name: companyId
//  *         schema:
//  *           type: string
//  *         description: Filter by company ID
//  *       - in: query
//  *         name: skills
//  *         schema:
//  *           type: string
//  *         description: Comma-separated list of required skills
//  *       - in: query
//  *         name: salaryMin
//  *         schema:
//  *           type: integer
//  *         description: Minimum salary filter
//  *       - in: query
//  *         name: salaryMax
//  *         schema:
//  *           type: integer
//  *         description: Maximum salary filter
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 20
//  *           maximum: 100
//  *         description: Number of results per page
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *           enum: [relevance, date, salary]
//  *           default: relevance
//  *         description: Sort results by
//  *       - in: query
//  *         name: sortOrder
//  *         schema:
//  *           type: string
//  *           enum: [asc, desc]
//  *           default: desc
//  *         description: Sort order
//  *     responses:
//  *       200:
//  *         description: Jobs search results
//  *       400:
//  *         description: Invalid search parameters
//  *       500:
//  *         description: Search service error
//  */
// router.get('/jobs', SearchController.searchJobs)

// /**
//  * @swagger
//  * /api/search/companies:
//  *   get:
//  *     tags: [Search]
//  *     summary: Search companies
//  *     parameters:
//  *       - in: query
//  *         name: query
//  *         schema:
//  *           type: string
//  *         description: Search query for company name, description, industry
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 20
//  *           maximum: 100
//  *         description: Number of results per page
//  *     responses:
//  *       200:
//  *         description: Companies search results
//  *       500:
//  *         description: Search service error
//  */
// router.get('/companies', SearchController.searchCompanies)

// /**
//  * @swagger
//  * /api/search/profiles:
//  *   get:
//  *     tags: [Search]
//  *     summary: Search candidate profiles (requires authentication)
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: query
//  *         schema:
//  *           type: string
//  *         description: Search query for candidate name, bio, skills, desired job title
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 20
//  *           maximum: 100
//  *         description: Number of results per page
//  *     responses:
//  *       200:
//  *         description: Profiles search results
//  *       401:
//  *         description: Authentication required
//  *       500:
//  *         description: Search service error
//  */
// router.get('/profiles', authenticateAccessToken, SearchController.searchProfiles)

// /**
//  * @swagger
//  * /api/search/suggestions:
//  *   get:
//  *     tags: [Search]
//  *     summary: Get search suggestions/autocomplete
//  *     parameters:
//  *       - in: query
//  *         name: field
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Field to get suggestions for (title, company_name, skills, etc.)
//  *       - in: query
//  *         name: prefix
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Prefix to match for suggestions
//  *       - in: query
//  *         name: type
//  *         schema:
//  *           type: string
//  *           enum: [jobs, companies, profiles]
//  *           default: jobs
//  *         description: Type of document to get suggestions from
//  *     responses:
//  *       200:
//  *         description: Search suggestions
//  *       400:
//  *         description: Missing required parameters
//  *       500:
//  *         description: Suggestions service error
//  */
// router.get('/suggestions', SearchController.getSuggestions)

// /**
//  * @swagger
//  * /api/search/stats:
//  *   get:
//  *     tags: [Search]
//  *     summary: Get Elasticsearch statistics
//  *     responses:
//  *       200:
//  *         description: Elasticsearch indices and cluster statistics
//  *       500:
//  *         description: Statistics service error
//  */
// router.get('/stats', SearchController.getStats)

// /**
//  * @swagger
//  * /api/search/sync/stats:
//  *   get:
//  *     tags: [Search]
//  *     summary: Get synchronization statistics
//  *     responses:
//  *       200:
//  *         description: Database vs Elasticsearch synchronization statistics
//  *       500:
//  *         description: Statistics service error
//  */
// router.get('/sync/stats', SearchController.getSyncStats)

// /**
//  * @swagger
//  * /api/search/health:
//  *   get:
//  *     tags: [Search]
//  *     summary: Elasticsearch service health check
//  *     responses:
//  *       200:
//  *         description: Elasticsearch service is healthy
//  *       503:
//  *         description: Elasticsearch service is unavailable
//  */
// router.get('/health', SearchController.healthCheck)

// // Admin routes (require admin authentication)
// /**
//  * @swagger
//  * /api/search/sync:
//  *   post:
//  *     tags: [Search Admin]
//  *     summary: Sync data to Elasticsearch (Admin only)
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: type
//  *         schema:
//  *           type: string
//  *           enum: [all, jobs, companies, profiles]
//  *           default: all
//  *         description: Type of data to sync
//  *       - in: query
//  *         name: forceReindex
//  *         schema:
//  *           type: boolean
//  *           default: false
//  *         description: Force complete reindexing
//  *     responses:
//  *       200:
//  *         description: Data sync completed successfully
//  *       401:
//  *         description: Authentication required
//  *       403:
//  *         description: Admin access required
//  *       500:
//  *         description: Data sync failed
//  */
// router.post('/sync', authenticateAccessToken, SearchController.syncData)

// export default router
