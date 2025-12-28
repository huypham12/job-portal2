import cron from 'node-cron'
import { prisma } from '@/config/database.service'
import { job_status } from '@prisma/client'

/**
 * Cronjob to auto-expire jobs when they reach their expiry date
 * Runs every hour to check and close expired jobs
 */
export const scheduleJobExpiry = () => {
  // Run every hour at minute 30
  cron.schedule('30 * * * *', async () => {
    try {
      console.log('[Cronjob] Running job expiry check...')

      const now = new Date()

      // Find expired approved jobs
      const expiredJobs = await prisma.jobs.findMany({
        where: {
          expires_at: {
            lt: now
          },
          status: job_status.approved,
          deleted: false
        },
        include: {
          companies: {
            select: {
              name: true,
              users: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        }
      })

      if (expiredJobs.length === 0) {
        console.log('[Cronjob] No expired jobs found')
        return
      }

      // Close expired jobs
      const jobIds = expiredJobs.map((job) => job.id)
      await prisma.jobs.updateMany({
        where: {
          id: { in: jobIds }
        },
        data: {
          status: job_status.closed
        }
      })

      // Create notifications for recruiters
      const notifications = expiredJobs.map((job) => ({
        user_id: job.companies!.users!.id,
        type: 'job_expired',
        content: `Your job "${job.title}" has expired and been automatically closed.`,
        title: 'Job Expired',
        action_url: `/jobs/${job.id}/manage`,
        action_text: 'View Job',
        metadata: {
          job_id: job.id,
          job_title: job.title,
          expired_at: job.expires_at,
          auto_closed: true
        },
        category: 'job_management'
      }))

      await prisma.notifications.createMany({
        data: notifications
      })

      console.log(`[Cronjob] Successfully expired ${expiredJobs.length} job(s)`)
    } catch (error) {
      console.error('[Cronjob] Error expiring jobs:', error)
    }
  })

  console.log('[Cronjob] Job expiry job scheduled (runs hourly at minute 30)')
}
