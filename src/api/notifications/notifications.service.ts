import { prisma } from '@/config/database.service'
import { NotificationType } from '@/shared/constants/notification-types'
import {
  CreateNotificationData,
  NotificationQueryParams,
  NotificationResponse,
  PaginatedNotificationsResponse,
  UnreadCountResponse
} from './notifications.types'

/**
 * Notification Service
 * Handles all notification-related business logic
 */
export class NotificationService {
  /**
   * Get paginated notifications for a user
   */
  async getNotifications(userId: string, params: NotificationQueryParams): Promise<PaginatedNotificationsResponse> {
    const { page = 1, limit = 20, read, type } = params
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { user_id: userId }
    if (read !== undefined) {
      where.read = read
    }
    if (type) {
      where.type = type
    }

    // Get total count
    const total_count = await prisma.notifications.count({ where })

    // Get notifications
    const notifications = await prisma.notifications.findMany({
      where,
      orderBy: { sent_at: 'desc' },
      skip,
      take: limit
    })

    // Transform to response format
    const data: NotificationResponse[] = notifications.map((notification: any) => ({
      id: notification.id,
      type: notification.type as NotificationType,
      content: notification.content,
      sent_at: notification.sent_at!,
      read: notification.read ?? false
    }))

    // Calculate pagination metadata
    const total_pages = Math.ceil(total_count / limit)

    return {
      data,
      pagination: {
        current_page: page,
        total_pages,
        total_count,
        per_page: limit,
        has_next: page < total_pages,
        has_prev: page > 1
      }
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    // Get total unread count
    const unread_count = await prisma.notifications.count({
      where: {
        user_id: userId,
        read: false
      }
    })

    // Get count by type
    const notifications = await prisma.notifications.groupBy({
      by: ['type'],
      where: {
        user_id: userId,
        read: false
      },
      _count: true
    })

    const by_type = notifications.reduce(
      (acc: any, item: any) => {
        acc[item.type as NotificationType] = item._count
        return acc
      },
      {} as Record<NotificationType, number>
    )

    return {
      unread_count,
      by_type
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    if (notification.user_id !== userId) {
      throw new Error('Unauthorized')
    }

    const updated = await prisma.notifications.update({
      where: { id: notificationId },
      data: { read: true }
    })

    return {
      success: true,
      notification: {
        id: updated.id,
        read: updated.read ?? false,
        read_at: new Date()
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notifications.updateMany({
      where: {
        user_id: userId,
        read: false
      },
      data: { read: true }
    })

    return {
      success: true,
      updated_count: result.count
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    if (notification.user_id !== userId) {
      throw new Error('Unauthorized')
    }

    await prisma.notifications.delete({
      where: { id: notificationId }
    })

    return {
      success: true,
      message: 'Notification deleted successfully'
    }
  }

  /**
   * Create a new notification
   * This is typically called by other services
   */
  async createNotification(data: CreateNotificationData) {
    const notification = await prisma.notifications.create({
      data: {
        user_id: data.user_id,
        type: data.type,
        content: data.content,
        read: false,
        sent_at: new Date()
      }
    })

    return {
      id: notification.id,
      type: notification.type as NotificationType,
      content: notification.content,
      sent_at: notification.sent_at!
    }
  }

  /**
   * Batch create notifications
   * Useful for sending notifications to multiple users
   */
  async createBatchNotifications(notifications: CreateNotificationData[]) {
    const result = await prisma.notifications.createMany({
      data: notifications.map((n) => ({
        user_id: n.user_id,
        type: n.type,
        content: n.content,
        read: false,
        sent_at: new Date()
      }))
    })

    return {
      success: true,
      created_count: result.count
    }
  }
}

export const notificationService = new NotificationService()
