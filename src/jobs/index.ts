import { scheduleConnectionInterestExpiry } from './connection-interest.cronjob'

/**
 * Initialize all cronjobs
 */
export const initializeCronjobs = () => {
  console.log('[Cronjobs] Initializing all scheduled jobs...')

  // Schedule connection interest expiry
  scheduleConnectionInterestExpiry()

  console.log('[Cronjobs] All jobs initialized successfully')
}
