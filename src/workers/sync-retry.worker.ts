import { prisma } from '../config/database.service'
import { elasticsearchSyncService } from '../config/elasticsearch-sync.service'
import { jobToESDoc, profileToESDoc, companyToESDoc, applicationToESDoc } from '../shared/utils/es-transformers'

export class SyncRetryWorker {

  /**
   * Get entity data from database for re-sync (public method for controllers)
   */
  static async getEntityData(entityType: string, entityId: string) {
    try {
      switch (entityType) {
        case 'job': {
          const job = await prisma.jobs.findUnique({
            where: { id: entityId },
            include: {
              companies: true,
              locations: {
                include: {
                  parent: true // Include parent province for location hierarchy
                }
              },
              job_skills: {
                include: { skills: true }
              },
              job_requirements: true,
              job_categories: {
                include: { categories: true }
              },
              job_benefits: true,
              job_work_arrangements: true
            }
          })
          return job ? jobToESDoc(job) : null
        }

        case 'profile': {
          const profile = await prisma.profiles.findUnique({
            where: { id: entityId },
            include: {
              skills: {
                include: { skills: { include: { category: true } } }
              },
              educations: true,
              experiences: true,
              certifications: true
            }
          })
          return profile ? profileToESDoc(profile) : null
        }

        case 'company': {
          const company = await prisma.companies.findUnique({
            where: { id: entityId },
            include: {
              company_details: {
                include: {
                  headquarters_location: true
                }
              }
            }
          })
          return company ? companyToESDoc(company) : null
        }

        case 'application': {
          const application = await prisma.applications.findUnique({
            where: { id: entityId },
            include: {
              jobs: {
                include: {
                  companies: true,
                  locations: true,
                  job_requirements: true,
                  job_work_arrangements: true
                }
              },
              profiles: {
                include: {
                  users: true,
                  skills: {
                    include: { skills: true }
                  },
                  educations: true,
                  experiences: true
                }
              },
              application_stages: {
                orderBy: {
                  stage_order: 'desc'
                }
              }
            }
          })
          return application ? applicationToESDoc(application) : null
        }

        default:
          return null
      }
    } catch (error) {
      console.error(`Failed to fetch ${entityType}:${entityId} for re-sync:`, error)
      return null
    }
  }

  /**
   * Process failed syncs (run every 60 seconds)
   */
  static async processFailedSyncs(): Promise<void> {
    try {
      // Get failed syncs that haven't exceeded max retries
      const failedSyncs = await prisma.sync_status.findMany({
        where: {
          sync_status: 'failed',
          retry_count: { lt: 5 } // Max 5 retries
        },
        orderBy: { updated_at: 'asc' },
        take: 10 // Process 10 records each time
      })

      if (failedSyncs.length === 0) return

      console.log(`🔄 Processing ${failedSyncs.length} failed syncs...`)

      let successCount = 0
      let errorCount = 0

      for (const sync of failedSyncs) {
        try {
          // Validate entity type
          const validTypes = ['job', 'profile', 'company', 'application']
          if (!validTypes.includes(sync.entity_type)) {
            console.warn(`⚠️ Invalid entity type: ${sync.entity_type}, skipping`)
            errorCount++
            continue
          }

          // Re-fetch current data
          const document = await this.getEntityData(sync.entity_type, sync.entity_id)

          if (!document) {
            console.warn(`Entity ${sync.entity_type}:${sync.entity_id} not found, marking as deleted`)
            // Mark as success since entity no longer exists
            await prisma.sync_status.update({
              where: {
                entity_type_entity_id: {
                  entity_type: sync.entity_type,
                  entity_id: sync.entity_id
                }
              },
              data: { sync_status: 'success' }
            })
            successCount++
            continue
          }

          // Retry sync
          const success = await elasticsearchSyncService.syncToElasticsearchWithRetry(
            sync.entity_type + 's', // 'jobs', 'profiles', etc.
            sync.entity_id,
            document,
            2 // Only 2 more retries in background
          )

          if (success) {
            console.log(`✅ Re-synced ${sync.entity_type}:${sync.entity_id}`)
            successCount++
          } else {
            console.warn(`❌ Re-sync failed for ${sync.entity_type}:${sync.entity_id}`)
            errorCount++
          }

        } catch (error) {
          console.error(`❌ Background retry failed for ${sync.entity_type}:${sync.entity_id}:`, error)
          errorCount++
        }
      }

      console.log(`🔄 Retry batch completed: ${successCount} success, ${errorCount} failed`)

    } catch (error) {
      console.error('Sync retry worker error:', error)
    }
  }

  /**
   * Cleanup old sync records
   */
  static async cleanupOldRecords(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      // Delete success records older than 7 days
      const deletedSuccess = await prisma.sync_status.deleteMany({
        where: {
          sync_status: 'success',
          updated_at: { lt: sevenDaysAgo }
        }
      })

      // Delete failed records older than 30 days or with too many retries
      const deletedFailed = await prisma.sync_status.deleteMany({
        where: {
          OR: [
            {
              sync_status: 'failed',
              updated_at: { lt: thirtyDaysAgo }
            },
            {
              retry_count: { gte: 10 }
            }
          ]
        }
      })

      if (deletedSuccess.count > 0 || deletedFailed.count > 0) {
        console.log(`🧹 Cleaned up sync records: ${deletedSuccess.count} success, ${deletedFailed.count} failed`)
      }

    } catch (error) {
      console.error('Sync cleanup error:', error)
    }
  }

  /**
   * Start the worker
   */
  static start(): void {
    // Process failed syncs every 60 seconds
    setInterval(() => {
      this.processFailedSyncs()
    }, 60000)

    // Cleanup old records every 24 hours
    setInterval(() => {
      this.cleanupOldRecords()
    }, 24 * 60 * 60 * 1000)

    console.log('🔄 Sync retry worker started (runs every 60s, cleanup every 24h)')
  }
}
