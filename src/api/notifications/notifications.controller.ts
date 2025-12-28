import { Request, Response, NextFunction } from 'express'
import { notificationService } from './notifications.service'
import {
  getNotificationsQuerySchema,
  markAsReadParamsSchema,
  deleteNotificationParamsSchema
} from './notifications.validator'

/**
 * Notification Controller
 * Handles HTTP requests for notifications
 */
export class NotificationController {
  /**
   * GET /api/notifications
   * Get paginated list of notifications for the authenticated user
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate query parameters
      const validatedQuery = getNotificationsQuerySchema.parse(req.query)

      // Get user ID from authenticated user
      const userId = req.user!.userId

      // Get notifications
      const result = await notificationService.getNotifications(userId, validatedQuery)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId

      const result = await notificationService.getUnreadCount(userId)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate params
      const validatedParams = markAsReadParamsSchema.parse(req.params)
      const userId = req.user!.userId

      const result = await notificationService.markAsRead(validatedParams.id, userId)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/notifications/mark-all-read
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId

      const result = await notificationService.markAllAsRead(userId)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate params
      const validatedParams = deleteNotificationParamsSchema.parse(req.params)
      const userId = req.user!.userId

      const result = await notificationService.deleteNotification(validatedParams.id, userId)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}

export const notificationController = new NotificationController()
