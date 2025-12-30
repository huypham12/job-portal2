import { Router } from 'express'
import candidateRouter from './candidate/candidate.route'
import recruiterRouter from './recruiter/recruiter.route'
import { ElasticsearchSyncMiddleware } from '@/middleware/elasticsearch-sync.middleware'

const router = Router()

// Elasticsearch sync middleware - áp dụng cho tất cả application routes
router.use(ElasticsearchSyncMiddleware.getMiddleware())

/**
 * Candidate routes - mounted under `/candidate` to clearly separate
 * candidate-facing application endpoints from recruiter endpoints.
 * This prevents middleware ordering issues and keeps routes organized.
 */
router.use('/candidate', candidateRouter)

/**
 * Recruiter routes - mounted under `/recruiter` to clearly separate
 * recruiter-facing application endpoints from candidate endpoints.
 * This prevents middleware ordering issues and keeps routes organized.
 */
router.use('/recruiter', recruiterRouter)

export default router
