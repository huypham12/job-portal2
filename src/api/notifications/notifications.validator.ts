import { z } from 'zod'

/**
 * Validator for getting notifications list
 */
const GetNotificationsQuerySchema = z.object({
  page: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1, { message: 'Page must be greater than 0' }).default(1)
  ),
  limit: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1, { message: 'Limit must be at least 1' }).max(100, { message: 'Limit must be at most 100' }).default(20)
  ),
  read: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    },
    z.boolean().optional()
  ),
  type: z.string().optional()
})

export const GetNotificationsSchema = {
  query: GetNotificationsQuerySchema
}

export type GetNotificationsDTO = z.infer<typeof GetNotificationsQuerySchema>

/**
 * Validator for notification ID param
 */
const NotificationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Notification ID must be a valid UUID' })
})

export const NotificationIdSchema = {
  params: NotificationIdParamSchema
}

export type NotificationIdDTO = z.infer<typeof NotificationIdParamSchema>

/**
 * Validator for socket notification read event
 */
export const socketNotificationReadSchema = z.object({
  notificationId: z.string().uuid({ message: 'Notification ID must be a valid UUID' })
})

export type SocketNotificationReadDTO = z.infer<typeof socketNotificationReadSchema>

