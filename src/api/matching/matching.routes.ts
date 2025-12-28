import { Router } from 'express'
import { matchCandidatesController, matchJobsController } from './matching.controller'

const router = Router()

// POST /api/matching/job/:jobId/candidates
router.post('/job/:jobId/candidates', matchCandidatesController)

// POST /api/matching/profile/:profileId/jobs
router.post('/profile/:profileId/jobs', matchJobsController)

export default router
