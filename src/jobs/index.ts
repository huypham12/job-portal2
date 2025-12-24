import { scheduleConnectionInterestExpiry } from './connection-interest.cronjob'
import { scheduleJobExpiry } from './job-expiry.cronjob'

/**
 * Initialize all cronjobs
 */
export const initializeCronjobs = () => {
  console.log('[Cronjobs] Initializing all scheduled jobs...')

  // Schedule connection interest expiry
  scheduleConnectionInterestExpiry()

  // Schedule job expiry
  scheduleJobExpiry()

  console.log('[Cronjobs] All jobs initialized successfully')
}
