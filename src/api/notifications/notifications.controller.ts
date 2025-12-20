import { Request, Response, NextFunction } from 'express'
import { notificationService } from './notifications.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { NotificationQueryParams } from './notifications.types'

export class NotificationController {
  /**
   * GET /api/notifications
   * Get paginated notifications for current user
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const params = req.query as unknown as NotificationQueryParams

      const result = await notificationService.getNotifications(user_id, params)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload

      const result = await notificationService.getUnreadCount(user_id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a notification as read
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const result = await notificationService.markAsRead(id, user_id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read for current user
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload

      const result = await notificationService.markAllAsRead(user_id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const result = await notificationService.deleteNotification(id, user_id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }
}

