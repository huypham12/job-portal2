import { Router } from 'express'
import { SyncController } from './sync.controller'
import { validateDto } from '../../middleware/validateDto.middleware'
import { authenticateAccessToken, verifiedUserValidator } from '../../middleware/verify.middleware'
import { adminOnly } from '../../middleware/authorize.middleware'
import {
  getSyncStatusSchema,
  retryFailedSyncsSchema,
  retrySpecificEntitySchema,
  cleanupOldRecordsSchema,
  getFailedSummarySchema,
  validateConsistencySchema,
  fixConsistencySchema
} from './sync.validator'

const router = Router()
const syncController = new SyncController()

// All routes require strict admin-only access
router.use(authenticateAccessToken, verifiedUserValidator, adminOnly)

/**
 * @route GET /api/sync/status
 * @desc Get sync statistics and failed records
 * @access Admin only
 */
router.get('/status', validateDto(getSyncStatusSchema), syncController.getSyncStatus.bind(syncController))

/**
 * @route POST /api/sync/retry
 * @desc Manual retry all failed syncs
 * @access Admin only
 */
router.post('/retry', validateDto(retryFailedSyncsSchema), syncController.retryFailedSyncs.bind(syncController))

/**
 * @route POST /api/sync/retry/:entityType/:entityId
 * @desc Retry specific entity sync
 * @access Admin only
 */
router.post(
  '/retry/:entityType/:entityId',
  validateDto(retrySpecificEntitySchema),
  syncController.retrySpecificEntity.bind(syncController)
)

/**
 * @route POST /api/sync/cleanup
 * @desc Manual cleanup old sync records
 * @access Admin only
 */
router.post('/cleanup', validateDto(cleanupOldRecordsSchema), syncController.cleanupOldRecords.bind(syncController))

/**
 * @route GET /api/sync/failed-summary
 * @desc Get summary of failed syncs by entity type
 * @access Admin only
 */
router.get('/failed-summary', validateDto(getFailedSummarySchema), syncController.getFailedSummary.bind(syncController))

/**
 * @route GET /api/sync/consistency
 * @desc Validate data consistency between DB and ES
 * @access Admin only
 */
router.get(
  '/consistency',
  validateDto(validateConsistencySchema),
  syncController.validateConsistency.bind(syncController)
)

/**
 * @route POST /api/sync/fix-consistency
 * @desc Auto-fix consistency issues
 * @access Admin only
 */
router.post('/fix-consistency', validateDto(fixConsistencySchema), syncController.fixConsistency.bind(syncController))

export default router
