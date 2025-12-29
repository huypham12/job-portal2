import { Router } from 'express'
import { SyncController } from './sync.controller'
import { validateDto } from '../../middleware/validateDto.middleware'
import {
  getSyncStatusSchema,
  retryFailedSyncsSchema,
  retrySpecificEntitySchema,
  cleanupOldRecordsSchema,
  getFailedSummarySchema
} from './sync.validator'

const router = Router()
const syncController = new SyncController()

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

export default router
