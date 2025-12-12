import cron from 'node-cron'
import { autoExpireInterests } from '../api/connection-interests/connection-interest.service'

/**
 * Cronjob to auto-expire pending connection interests
 * Runs every hour to check and expire interests past their expiration date
 */
export const scheduleConnectionInterestExpiry = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cronjob] Running connection interest expiry check...')
      const expiredCount = await autoExpireInterests()
      console.log(`[Cronjob] Successfully expired ${expiredCount} connection interests`)
    } catch (error) {
      console.error('[Cronjob] Error expiring connection interests:', error)
    }
  })

  console.log('[Cronjob] Connection interest expiry job scheduled (runs hourly)')
}
