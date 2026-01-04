import { Router } from 'express'
import { notificationController } from './notifications.controller'
import { EnhancedNotificationsController } from './enhanced-notifications.controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter, adminOnly } from '@/middleware/authorize.middleware'
import {
  sendPopularJobAlertsValidator,
  sendLocationBasedAlertsValidator,
  sendSearchBasedAlertsValidator
} from '../../shared/validators/enhanced-features.validator'

const router = Router()

/**
 * All notification routes require authentication
 */
router.use(authenticateAccessToken)

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 * Must be before /:id routes to avoid conflict
 */
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController))

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 * Must be before /:id routes to avoid conflict
 */
router.patch('/mark-all-read', notificationController.markAllAsRead.bind(notificationController))

/**
 * GET /api/notifications
 * Get paginated list of notifications
 */
router.get('/', notificationController.getNotifications.bind(notificationController))

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController))

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', notificationController.deleteNotification.bind(notificationController))

// ==================== ENHANCED NOTIFICATIONS ====================

/**
 * POST /api/notifications/send-popular-job-alerts
 * Send alerts about trending/popular jobs
 */
router.post(
  '/send-popular-job-alerts',
  adminOnly,
  sendPopularJobAlertsValidator,
  EnhancedNotificationsController.sendPopularJobAlerts
)

/**
 * POST /api/notifications/send-location-based-alerts
 * Send job alerts based on user's preferred locations
 */
router.post(
  '/send-location-based-alerts',
  recruiter,
  sendLocationBasedAlertsValidator,
  EnhancedNotificationsController.sendLocationBasedAlerts
)

/**
 * POST /api/notifications/send-search-based-alerts
 * Send job alerts based on user's saved searches
 */
router.post(
  '/send-search-based-alerts',
  recruiter,
  sendSearchBasedAlertsValidator,
  EnhancedNotificationsController.sendSearchBasedAlerts
)

/**
 * GET /api/notifications/enhanced-stats
 * Get statistics about enhanced notifications
 */
router.get('/enhanced-stats', adminOnly, EnhancedNotificationsController.getEnhancedStats)

export default router
