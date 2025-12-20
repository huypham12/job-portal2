import { Router } from 'express'
import { NotificationController } from './notifications.controller'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import { GetNotificationsSchema, NotificationIdSchema } from './notifications.validator'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { authenticatedUser } from '@/shared/middleware/authorize.middleware'

const router = Router()
const notificationController = new NotificationController()

/**
 * All routes require authentication
 */
router.use(authenticateAccessToken, authenticatedUser)

/**
 * GET /api/notifications
 * Get paginated notifications for current user
 */
router.get('/', validateDto(GetNotificationsSchema), notificationController.getNotifications)

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', notificationController.getUnreadCount)

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.patch('/read-all', notificationController.markAllAsRead)

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', validateDto(NotificationIdSchema), notificationController.markAsRead)

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', validateDto(NotificationIdSchema), notificationController.deleteNotification)

export default router

