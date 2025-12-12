import { Router } from 'express'
import { notificationController } from './notifications.controller'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'

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

export default router
