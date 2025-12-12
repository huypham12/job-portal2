import { NotificationType } from '@/shared/constants/notification-types'

/**
 * Notification query parameters
 */
export interface NotificationQueryParams {
  page?: number
  limit?: number
  read?: boolean
  type?: string
}

/**
 * Notification response data
 */
export interface NotificationResponse {
  id: string
  type: NotificationType
  content: string
  sent_at: Date
  read: boolean
}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
  unread_count: number
  by_type: Record<NotificationType, number>
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  current_page: number
  total_pages: number
  total_count: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Paginated notifications response
 */
export interface PaginatedNotificationsResponse {
  data: NotificationResponse[]
  pagination: PaginationMeta
}

/**
 * Create notification data
 */
export interface CreateNotificationData {
  user_id: string
  type: NotificationType
  content: string
}

/**
 * Mark as read response
 */
export interface MarkAsReadResponse {
  success: boolean
  notification: {
    id: string
    read: boolean
    read_at: Date
  }
}

/**
 * Mark all as read response
 */
export interface MarkAllAsReadResponse {
  success: boolean
  updated_count: number
}

/**
 * Delete notification response
 */
export interface DeleteNotificationResponse {
  success: boolean
  message: string
}

/**
 * Socket.IO authentication payload
 */
export interface SocketAuthPayload {
  token: string
}

/**
 * Socket.IO notification event data
 */
export interface SocketNotificationData {
  id: string
  type: NotificationType
  content: string
  sent_at: Date
}

/**
 * Socket.IO notification count event data
 */
export interface SocketNotificationCountData {
  unread_count: number
}

/**
 * Socket.IO notification read event data
 */
export interface SocketNotificationReadData {
  notificationId: string
  read_at: Date
}
