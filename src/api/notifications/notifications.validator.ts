import { z } from 'zod'
import { NotificationType } from '@/shared/constants/notification-types'

/**
 * Get notifications query validation
 */
export const getNotificationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100)),
  read: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined
      return val === 'true'
    })
    .pipe(z.boolean().optional()),
  type: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        return Object.values(NotificationType).includes(val as NotificationType)
      },
      { message: 'Invalid notification type' }
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
