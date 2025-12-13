import { z } from 'zod'
import { NotificationType } from '@/shared/constants/notification-types'

/**
 * Get notifications query validation
 */
export const getNotificationsQuerySchema = z.object({
  page: z.preprocess(
    (val) => {
      // Handle empty string or invalid values as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => {
      // Handle empty string or invalid values as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1).max(100).default(20)
  ),
  read: z.preprocess(
    (val) => {
      // Handle empty string as undefined
      if (val === undefined || val === null || val === '') return undefined
      // Coerce to boolean
      return val === 'true' || val === '1'
    },
    z.boolean().optional()
  ),
  type: z.preprocess(
    (val) => {
      // Handle empty string as undefined
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z
      .string()
      .refine(
        (val) => Object.values(NotificationType).includes(val as NotificationType),
        { message: 'Invalid notification type' }
      )
      .optional()
  )
})

/**
 * Mark notification as read params validation
 */
export const markAsReadParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid notification ID' })
})

/**
 * Delete notification params validation
 */
export const deleteNotificationParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid notification ID' })
})

/**
 * Socket authentication payload validation
 */
export const socketAuthSchema = z.object({
  token: z.string().min(1, 'Token is required')
})

/**
 * Socket notification read event validation
 */
export const socketNotificationReadSchema = z.object({
  notificationId: z.string().uuid({ message: 'Invalid notification ID' })
})

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>
export type MarkAsReadParams = z.infer<typeof markAsReadParamsSchema>
export type DeleteNotificationParams = z.infer<typeof deleteNotificationParamsSchema>
export type SocketAuthData = z.infer<typeof socketAuthSchema>
export type SocketNotificationReadData = z.infer<typeof socketNotificationReadSchema>
