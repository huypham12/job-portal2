import { Request, Response } from 'express'
import { elasticsearchSyncService } from '../../config/elasticsearch-sync.service'
import { SyncRetryWorker } from '../../workers/sync-retry.worker'
import { prisma } from '../../config/database.service'
import { HttpError } from '../../shared/common/http-error'
import { HTTP_STATUS } from '../../shared/constants/httpStatus'

export class SyncController {
  /**
   * GET /api/sync/status - Check sync statistics and failed records
   */
  async getSyncStatus(req: Request, res: Response) {
    try {
      // Get overall sync stats
      const stats = await elasticsearchSyncService.getSyncStats()

      // Get failed records details
      const failedRecords = await prisma.sync_status.findMany({
        where: { sync_status: 'failed' },
        orderBy: { updated_at: 'desc' },
        take: 20,
        select: {
          entity_type: true,
          entity_id: true,
          retry_count: true,
          error_message: true,
          last_attempt_at: true,
          updated_at: true
        }
      })

      res.json({
        success: true,
        data: {
          statistics: stats,
          failed_records: failedRecords
        }
      })
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw new HttpError('Failed to get sync status', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * POST /api/sync/retry - Manual retry all failed syncs
   */
  async retryFailedSyncs(req: Request, res: Response) {
    try {
      const failedSyncs = await prisma.sync_status.findMany({
        where: {
          sync_status: 'failed',
          retry_count: { lt: 5 }
        },
        take: 50 // Retry max 50 records per request
      })

      const results = []
      let successCount = 0
      let failCount = 0

      for (const sync of failedSyncs) {
        const document = await SyncRetryWorker.getEntityData(sync.entity_type, sync.entity_id)

        if (document) {
          const success = await elasticsearchSyncService.syncToElasticsearchWithRetry(
            sync.entity_type + 's',
            sync.entity_id,
            document
          )
          results.push({
            entity_type: sync.entity_type,
            entity_id: sync.entity_id,
            success
          })

          if (success) successCount++
          else failCount++
        } else {
          results.push({
            entity_type: sync.entity_type,
            entity_id: sync.entity_id,
            success: false,
            error: 'Entity not found'
          })
          failCount++
        }
      }

      res.json({
        success: true,
        data: {
          processed: results.length,
          successful: successCount,
          failed: failCount,
          results
        }
      })
    } catch (error) {
      console.error('Failed to retry syncs:', error)
      throw new HttpError('Failed to retry syncs', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * POST /api/sync/retry/:entityType/:entityId - Retry specific entity
   */
  async retrySpecificEntity(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params

      // Validate entity type
      const validTypes = ['job', 'profile', 'company', 'application']
      if (!validTypes.includes(entityType)) {
        throw new HttpError('Invalid entity type', HTTP_STATUS.BAD_REQUEST)
      }

      const document = await SyncRetryWorker.getEntityData(entityType, entityId)

      if (!document) {
        throw new HttpError('Entity not found', HTTP_STATUS.NOT_FOUND)
      }

      const success = await elasticsearchSyncService.syncToElasticsearchWithRetry(entityType + 's', entityId, document)

      res.json({
        success: true,
        data: {
          entity_type: entityType,
          entity_id: entityId,
          sync_success: success
        }
      })
    } catch (error) {
      console.error(`Failed to retry ${req.params.entityType}:${req.params.entityId}:`, error)

      if (error instanceof HttpError) {
        throw error
      }

      throw new HttpError('Failed to retry entity sync', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * POST /api/sync/cleanup - Manual cleanup old sync records
   */
  async cleanupOldRecords(req: Request, res: Response) {
    try {
      await SyncRetryWorker.cleanupOldRecords()

      res.json({
        success: true,
        message: 'Cleanup completed'
      })
    } catch (error) {
      console.error('Failed to cleanup sync records:', error)
      throw new HttpError('Failed to cleanup sync records', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * GET /api/sync/failed-summary - Get summary of failed syncs by type
   */
  async getFailedSummary(req: Request, res: Response) {
    try {
      const summary = await prisma.sync_status.groupBy({
        by: ['entity_type', 'sync_status'],
        _count: { sync_status: true },
        where: {
          sync_status: 'failed'
        }
      })

      // Group by entity_type
      const groupedSummary = summary.reduce(
        (acc, item) => {
          if (!acc[item.entity_type]) {
            acc[item.entity_type] = {
              failed: 0,
              pending: 0,
              success: 0
            }
          }
          acc[item.entity_type][item.sync_status] = item._count.sync_status
          return acc
        },
        {} as Record<string, any>
      )

      res.json({
        success: true,
        data: groupedSummary
      })
    } catch (error) {
      console.error('Failed to get failed summary:', error)
      throw new HttpError('Failed to get failed summary', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * GET /api/sync/consistency - Validate data consistency between DB and ES
   */
  async validateConsistency(req: Request, res: Response) {
    try {
      const consistency = await elasticsearchSyncService.validateSyncConsistency()

      res.json({
        success: true,
        data: {
          is_consistent: consistency.isConsistent,
          mismatches: consistency.mismatches,
          sample_mismatches: consistency.sampleMismatches,
          total_mismatches: consistency.mismatches.length
        }
      })
    } catch (error) {
      console.error('Failed to validate consistency:', error)
      throw new HttpError('Failed to validate consistency', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * POST /api/sync/fix-consistency - Auto-fix consistency issues
   */
  async fixConsistency(req: Request, res: Response) {
    try {
      const consistency = await elasticsearchSyncService.validateSyncConsistency()

      if (consistency.isConsistent) {
        return res.json({
          success: true,
          message: 'Data is already consistent',
          data: { fixed: 0 }
        })
      }

      let fixed = 0

      // Fix missing entities in ES
      for (const sample of consistency.sampleMismatches) {
        for (const missingId of sample.missingInES) {
          try {
            const document = await SyncRetryWorker.getEntityData(sample.type, missingId)
            if (document) {
              const success = await elasticsearchSyncService.syncToElasticsearchWithRetry(
                sample.type + 's',
                missingId,
                document
              )
              if (success) fixed++
            }
          } catch (error) {
            console.error(`Failed to fix ${sample.type}:${missingId}:`, error)
          }
        }
      }

      res.json({
        success: true,
        data: {
          mismatches_found: consistency.mismatches.length,
          attempts_fixed: fixed,
          remaining_mismatches: consistency.mismatches.length - fixed
        }
      })
    } catch (error) {
      console.error('Failed to fix consistency:', error)
      throw new HttpError('Failed to fix consistency', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
}
