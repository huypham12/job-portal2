// import { Request, Response } from 'express'
// import { elasticsearchService, SearchParams } from '@/config/elasticsearch.service'
// import { elasticsearchSyncService } from '@/config/elasticsearch-sync.service'

// export class SearchController {
//   /**
//    * Advanced job search with Vietnamese analyzer support
//    */
//   static async searchJobs(req: Request, res: Response) {
//     try {
//       const {
//         query = '',
//         location,
//         jobType,
//         companyId,
//         skills,
//         tags,
//         experienceLevel,
//         salaryMin,
//         salaryMax,
//         isRemoteAllowed,
//         flexibleHours,
//         page = 1,
//         limit = 20,
//         sortBy = 'relevance',
//         sortOrder = 'desc',
//         highlight = true
//       } = req.query

//       const searchParams: SearchParams = {
//         query: query as string,
//         filters: {
//           location: location as string,
//           jobType: jobType as string,
//           companyId: companyId as string,
//           experienceLevel: experienceLevel ? parseInt(experienceLevel as string) : undefined,
//           skills: skills ? (Array.isArray(skills) ? (skills as string[]) : (skills as string).split(',')) : undefined,
//           tags: tags ? (Array.isArray(tags) ? (tags as string[]) : (tags as string).split(',')) : undefined,
//           salaryRange:
//             salaryMin && salaryMax ? [parseInt(salaryMin as string), parseInt(salaryMax as string)] : undefined,
//           workArrangements: {
//             isRemoteAllowed: isRemoteAllowed === 'true',
//             flexibleHours: flexibleHours === 'true'
//           }
//         },
//         page: parseInt(page as string),
//         limit: Math.min(parseInt(limit as string), 100),
//         sortBy: sortBy as 'relevance' | 'date' | 'salary' | 'experience',
//         sortOrder: sortOrder as 'asc' | 'desc',
//         highlight: highlight === 'true' || highlight === true
//       }

//       const results = await elasticsearchService.searchJobs(searchParams)

//       return res.json({
//         message: 'Jobs search completed successfully',
//         data: {
//           jobs: results.hits,
//           pagination: {
//             page: results.page,
//             limit: searchParams.limit || 20,
//             total: results.total,
//             totalPages: results.totalPages
//           },
//           meta: {
//             took: results.took,
//             maxScore: results.maxScore,
//             hasHighlights: Object.keys(results.highlights || {}).length > 0
//           },
//           highlights: results.highlights,
//           aggregations: results.aggregations
//         }
//       })
//     } catch (error) {
//       console.error('❌ Job search error:', error)
//       return res.status(500).json({ success: false, message: 'Job search failed' })
//     }
//   }

//   /**
//    * Company search with Vietnamese text processing
//    */
//   static async searchCompanies(req: Request, res: Response) {
//     try {
//       const {
//         query = '',
//         industry,
//         size,
//         location,
//         isVerified,
//         page = 1,
//         limit = 20,
//         sortBy = 'relevance',
//         sortOrder = 'desc'
//       } = req.query

//       const searchBody: any = {
//         query: {
//           bool: {
//             must: query
//               ? [
//                   {
//                     multi_match: {
//                       query: query as string,
//                       fields: ['name^3', 'name.autocomplete^2', 'description^1', 'industry^2'],
//                       type: 'best_fields',
//                       fuzziness: 'AUTO'
//                     }
//                   }
//                 ]
//               : [{ match_all: {} }],
//             filter: []
//           }
//         },
//         from: (parseInt(page as string) - 1) * parseInt(limit as string),
//         size: Math.min(parseInt(limit as string), 100),
//         track_total_hits: true,
//         highlight: query
//           ? {
//               pre_tags: ['<mark>'],
//               post_tags: ['</mark>'],
//               fields: {
//                 name: { fragment_size: 100 },
//                 description: { fragment_size: 200 },
//                 industry: { fragment_size: 50 }
//               }
//             }
//           : undefined
//       }

//       // Apply filters
//       if (industry) {
//         searchBody.query.bool.filter.push({ term: { 'industry.keyword': industry } })
//       }
//       if (size) {
//         searchBody.query.bool.filter.push({ term: { size: parseInt(size as string) } })
//       }
//       if (location) {
//         searchBody.query.bool.filter.push({ match: { location } })
//       }
//       if (isVerified !== undefined) {
//         searchBody.query.bool.filter.push({ term: { is_verified: isVerified === 'true' } })
//       }

//       // Apply sorting
//       if (sortBy === 'relevance' && query) {
//         searchBody.sort = [{ _score: { order: 'desc' } }, { 'name.keyword': { order: 'asc' } }]
//       } else {
//         const sortField =
//           sortBy === 'jobCount'
//             ? 'job_count'
//             : sortBy === 'name'
//               ? 'name.keyword'
//               : sortBy === 'size'
//                 ? 'size'
//                 : 'name.keyword'
//         searchBody.sort = [{ [sortField]: { order: sortOrder, missing: '_last' } }]
//       }

//       const indexName = (elasticsearchService as any).getIndexName('companies')
//       const response = await elasticsearchService.getClient().search({
//         index: indexName,
//         body: searchBody
//       })

//       const companies = response.hits.hits.map((hit: any) => ({
//         ...hit._source,
//         _score: hit._score,
//         _highlights: hit.highlight || {}
//       }))

//       const total = typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total

//       return res.json({
//         success: true,
//         message: 'Companies search completed successfully',
//         data: {
//           companies,
//           pagination: {
//             page: parseInt(page as string),
//             limit: parseInt(limit as string),
//             total: total || 0,
//             totalPages: Math.ceil((total || 0) / parseInt(limit as string))
//           },
//           meta: {
//             took: response.took,
//             maxScore: response.hits.max_score || 0
//           }
//         }
//       })
//     } catch (error) {
//       console.error('❌ Company search error:', error)
//       return res.status(500).json({ success: false, message: 'Company search failed' })
//     }
//   }

//   /**
//    * Profile search (Admin/Recruiter only)
//    */
//   static async searchProfiles(req: Request, res: Response) {
//     try {
//       // Check permissions
//       const user = (req as any).decoded_authorization
//       if (!user || (user.role !== 'ADMIN' && user.role !== 'RECRUITER')) {
//         return res.status(403).json({ success: false, message: 'Insufficient permissions to search profiles' })
//       }

//       const {
//         query = '',
//         skills,
//         experienceLevel,
//         location,
//         desiredJobTypes,
//         isLookingForJob,
//         page = 1,
//         limit = 20,
//         sortBy = 'relevance',
//         sortOrder = 'desc'
//       } = req.query

//       const searchBody: any = {
//         query: {
//           bool: {
//             must: query
//               ? [
//                   {
//                     multi_match: {
//                       query: query as string,
//                       fields: [
//                         'full_name^3',
//                         'headline^2',
//                         'desired_job_title^2',
//                         'bio^1',
//                         'skills.name^2',
//                         'experiences.position^1.5',
//                         'experiences.company_name^1'
//                       ],
//                       type: 'best_fields',
//                       fuzziness: 'AUTO'
//                     }
//                   }
//                 ]
//               : [{ match_all: {} }],
//             filter: []
//           }
//         },
//         from: (parseInt(page as string) - 1) * parseInt(limit as string),
//         size: Math.min(parseInt(limit as string), 100),
//         track_total_hits: true,
//         highlight: query
//           ? {
//               pre_tags: ['<mark>'],
//               post_tags: ['</mark>'],
//               fields: {
//                 full_name: { fragment_size: 100 },
//                 headline: { fragment_size: 150 },
//                 bio: { fragment_size: 200 },
//                 'skills.name': { fragment_size: 50 }
//               }
//             }
//           : undefined
//       }

//       // Apply filters
//       if (skills) {
//         const skillsArray = Array.isArray(skills) ? (skills as string[]) : (skills as string).split(',')
//         searchBody.query.bool.filter.push({
//           nested: {
//             path: 'skills',
//             query: {
//               bool: {
//                 should: skillsArray.map((skill) => ({
//                   term: { 'skills.name.keyword': skill }
//                 })),
//                 minimum_should_match: 1
//               }
//             }
//           }
//         })
//       }

//       if (experienceLevel !== undefined) {
//         const expLevel = parseInt(experienceLevel as string)
//         searchBody.query.bool.filter.push({
//           range: {
//             years_of_experience: {
//               gte: Math.max(0, expLevel - 2),
//               lte: expLevel + 2
//             }
//           }
//         })
//       }

//       if (location) {
//         searchBody.query.bool.filter.push({
//           bool: {
//             should: [{ term: { location_id: location } }, { match: { location_name: location } }]
//           }
//         })
//       }

//       if (desiredJobTypes) {
//         const jobTypesArray = Array.isArray(desiredJobTypes)
//           ? (desiredJobTypes as string[])
//           : (desiredJobTypes as string).split(',')
//         searchBody.query.bool.filter.push({
//           terms: { desired_job_types: jobTypesArray }
//         })
//       }

//       if (isLookingForJob !== undefined) {
//         searchBody.query.bool.filter.push({
//           term: { is_looking_for_job: isLookingForJob === 'true' }
//         })
//       }

//       // Apply sorting
//       if (sortBy === 'relevance' && query) {
//         searchBody.sort = [{ _score: { order: 'desc' } }]
//       } else {
//         const sortField =
//           sortBy === 'experience'
//             ? 'years_of_experience'
//             : sortBy === 'name'
//               ? 'full_name.keyword'
//               : 'full_name.keyword'
//         searchBody.sort = [{ [sortField]: { order: sortOrder, missing: '_last' } }]
//       }

//       const indexName = (elasticsearchService as any).getIndexName('profiles')
//       const response = await elasticsearchService.getClient().search({
//         index: indexName,
//         body: searchBody
//       })

//       const profiles = response.hits.hits.map((hit: any) => {
//         const profile = { ...hit._source }
//         // Remove sensitive information
//         delete profile.user_id
//         return {
//           ...profile,
//           _score: hit._score,
//           _highlights: hit.highlight || {}
//         }
//       })

//       const total = typeof response.hits.total === 'object' ? response.hits.total.value : response.hits.total

//       return res.json({
//         success: true,
//         message: 'Profiles search completed successfully',
//         data: {
//           profiles,
//           pagination: {
//             page: parseInt(page as string),
//             limit: parseInt(limit as string),
//             total: total || 0,
//             totalPages: Math.ceil((total || 0) / parseInt(limit as string))
//           },
//           meta: {
//             took: response.took,
//             maxScore: response.hits.max_score || 0
//           }
//         }
//       })
//     } catch (error) {
//       console.error('❌ Profile search error:', error)
//       return res.status(500).json({ success: false, message: 'Profile search failed' })
//     }
//   }

//   /**
//    * Get completion suggestions
//    */
//   static async getSuggestions(req: Request, res: Response) {
//     try {
//       const { query: searchQuery, type = 'jobs', field = 'title', size = 10 } = req.query

//       if (!searchQuery) {
//         return res.status(400).json({ success: false, message: 'Query parameter is required for suggestions' })
//       }

//       const suggestions = await elasticsearchService.getSuggestions(
//         type as string,
//         field as string,
//         searchQuery as string,
//         parseInt(size as string)
//       )

//       const formattedSuggestions = suggestions.map((suggestion: any) => ({
//         text: suggestion.text,
//         score: suggestion._score,
//         source: suggestion._source
//       }))

//       return res.json({
//         success: true,
//         message: 'Suggestions retrieved successfully',
//         data: {
//           suggestions: formattedSuggestions,
//           query: searchQuery,
//           type,
//           field
//         }
//       })
//     } catch (error) {
//       console.error('❌ Suggestions error:', error)
//       return res.status(500).json({ success: false, message: 'Failed to get suggestions' })
//     }
//   }

//   /**
//    * Get search statistics
//    */
//   static async getStats(req: Request, res: Response) {
//     try {
//       const client = elasticsearchService.getClient()

//       const [jobsStats, companiesStats, profilesStats] = await Promise.all([
//         client.count({ index: (elasticsearchService as any).getIndexName('jobs') }),
//         client.count({ index: (elasticsearchService as any).getIndexName('companies') }),
//         client.count({ index: (elasticsearchService as any).getIndexName('profiles') })
//       ])

//       const clusterHealth = await client.cluster.health()

//       return res.json({
//         success: true,
//         message: 'Search statistics retrieved successfully',
//         data: {
//           indices: {
//             jobs: jobsStats.count,
//             companies: companiesStats.count,
//             profiles: profilesStats.count,
//             total: jobsStats.count + companiesStats.count + profilesStats.count
//           },
//           cluster: {
//             status: clusterHealth.status,
//             numberOfNodes: clusterHealth.number_of_nodes,
//             numberOfDataNodes: clusterHealth.number_of_data_nodes
//           },
//           timestamp: new Date().toISOString()
//         }
//       })
//     } catch (error) {
//       console.error('❌ Stats retrieval error:', error)
//       return res.status(500).json({ success: false, message: 'Stats service temporarily unavailable' })
//     }
//   }

//   /**
//    * Sync existing data to Elasticsearch (Admin only)
//    */
//   static async syncData(req: Request, res: Response) {
//     try {
//       // Check admin permission
//       const user = (req as any).decoded_authorization
//       if (!user || user.role !== 'ADMIN') {
//         return res.status(403).json({ success: false, message: 'Admin access required' })
//       }

//       const { type = 'all', forceReindex = false } = req.query

//       const results: any = {}

//       if (type === 'all' || type === 'jobs') {
//         results.jobs = await elasticsearchSyncService.syncJobs({ forceReindex: forceReindex === 'true' })
//       }

//       if (type === 'all' || type === 'companies') {
//         results.companies = await elasticsearchSyncService.syncCompanies({ forceReindex: forceReindex === 'true' })
//       }

//       if (type === 'all' || type === 'profiles') {
//         results.profiles = await elasticsearchSyncService.syncProfiles({ forceReindex: forceReindex === 'true' })
//       }

//       return res.json({
//         success: true,
//         message: `Data sync completed for ${type}`,
//         data: results
//       })
//     } catch (error) {
//       console.error('❌ Data sync error:', error)
//       return res.status(500).json({ success: false, message: 'Data sync failed' })
//     }
//   }

//   /**
//    * Get sync statistics
//    */
//   static async getSyncStats(req: Request, res: Response) {
//     try {
//       const stats = await elasticsearchSyncService.getSyncStats()

//       return res.json({
//         success: true,
//         message: 'Sync statistics retrieved successfully',
//         data: stats
//       })
//     } catch (error) {
//       console.error('❌ Sync stats error:', error)
//       return res.status(500).json({ success: false, message: 'Failed to get sync statistics' })
//     }
//   }

//   /**
//    * Health check for Elasticsearch service
//    */
//   static async healthCheck(req: Request, res: Response) {
//     try {
//       const isConnected = await elasticsearchService.checkConnection()

//       if (isConnected) {
//         return res.json({
//           success: true,
//           message: 'Elasticsearch service is healthy',
//           data: {
//             status: 'healthy',
//             timestamp: new Date().toISOString()
//           }
//         })
//       } else {
//         return res.status(503).json({ success: false, message: 'Elasticsearch service is not available' })
//       }
//     } catch (error) {
//       console.error('❌ Elasticsearch health check error:', error)
//       return res.status(500).json({ success: false, message: 'Elasticsearch health check failed' })
//     }
//   }
// }
