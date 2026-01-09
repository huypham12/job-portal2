import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { socketAuthMiddleware } from './socket.middleware'
import { notificationService } from '@/api/notifications/notifications.service'
import { socketNotificationReadSchema } from '@/api/notifications/notifications.validator'
import { NotificationType } from '@/shared/constants/notification-types'
import { envConfig } from '@/config/getEnvConfig'

/**
 * Socket.IO Service
 * Manages WebSocket connections and real-time notifications
 */
export class SocketService {
  private io: Server | null = null
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socket IDs

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: envConfig.cors.origin,
        credentials: true
      }
    })

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware)

    // Handle connections
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket)
    })

    console.log('✅ Socket.IO server initialized')
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket) {
    const userId = socket.data.userId
    const userRole = socket.data.userRole || 'unknown'
    console.log(`🔌 User ${userId} (role: ${userRole}) connected with socket ${socket.id}`)

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(socket.id)

    console.log(`📊 Total connections for user ${userId}: ${this.userSockets.get(userId)!.size}`)

    // Register event handlers
    this.registerEventHandlers(socket)

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket)
    })
  }

  /**
   * Register event handlers for a socket
   */
  private registerEventHandlers(socket: Socket) {
    const userId = socket.data.userId

    // Subscribe to notifications
    socket.on('subscribe:notifications', () => {
      const roomName = `user:${userId}:notifications`
      socket.join(roomName)
      console.log(`📬 User ${userId} (socket ${socket.id}) subscribed to room: ${roomName}`)

      // Send initial unread count
      this.sendUnreadCount(userId)
    })

    // Mark notification as read
    socket.on('notification:read', async (data: any) => {
      try {
        const validatedData = socketNotificationReadSchema.parse(data)

        await notificationService.markAsRead(validatedData.notificationId, userId)

        // Broadcast to all user's sockets (for multi-device sync)
        this.io!.to(`user:${userId}:notifications`).emit('notification:read', {
          notificationId: validatedData.notificationId,
          read_at: new Date()
        })

        // Update unread count
        this.sendUnreadCount(userId)
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to mark notification as read',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // Unsubscribe from notifications
    socket.on('unsubscribe:notifications', () => {
      socket.leave(`user:${userId}:notifications`)
      console.log(`📭 User ${userId} unsubscribed from notifications`)
    })
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: Socket) {
    const userId = socket.data.userId
    console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`)

    // Remove socket from tracking
    const userSocketSet = this.userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(socket.id)
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId)
      }
    }
  }

  /**
   * Send a new notification to a user in real-time
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    content: string,
    options?: {
      title?: string
      action_url?: string
      action_text?: string
      metadata?: Record<string, any>
      category?: string
    }
  ) {
    if (!this.io) {
      console.error('❌ Socket.IO not initialized - cannot send notification')
      return
    }

    const roomName = `user:${userId}:notifications`
    console.log(`🔔 [START] Sending notification to userId: ${userId}, type: ${type}`)

    try {
      // Create notification in database
      const notification = await notificationService.createNotification({
        user_id: userId,
        type,
        content,
        title: options?.title,
        action_url: options?.action_url,
        action_text: options?.action_text,
        metadata: options?.metadata,
        category: options?.category
      })

      console.log(`💾 Notification saved to DB: ${notification.id}`)

      // Check room members
      const socketsInRoom = await this.io.in(roomName).fetchSockets()
      console.log(
        `📡 Room "${roomName}" has ${socketsInRoom.length} connected socket(s): ${socketsInRoom.map((s) => s.id).join(', ') || 'NONE'}`
      )

      // Send to all connected sockets of the user
      this.io.to(roomName).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        content: notification.content,
        title: notification.title,
        action_url: notification.action_url,
        action_text: notification.action_text,
        metadata: notification.metadata,
        category: notification.category,
        sent_at: notification.sent_at
      })

      console.log(`📩 ✅ Notification emitted to room "${roomName}" - Event: notification:new`)

      // Update unread count
      await this.sendUnreadCount(userId)

      console.log(`🔔 [END] Notification complete for user ${userId}`)
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Send updated unread count to a user
   */
  private async sendUnreadCount(userId: string) {
    if (!this.io) return

    try {
      const { unread_count } = await notificationService.getUnreadCount(userId)

      this.io.to(`user:${userId}:notifications`).emit('notification:count', {
        unread_count
      })
    } catch (error) {
      console.error('Failed to send unread count:', error)
    }
  }

  /**
   * Broadcast system announcement to all connected users
   */
  async broadcastSystemAnnouncement(message: string) {
    if (!this.io) return

    // Get all connected user IDs
    const userIds = Array.from(this.userSockets.keys())

    // Create notifications for all users
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      content: message
    }))

    await notificationService.createBatchNotifications(notifications)

    // Broadcast to all connected sockets
    this.io.emit('notification:new', {
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      content: message,
      sent_at: new Date()
    })

    console.log(`📢 System announcement broadcast to ${userIds.length} users`)
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): Server | null {
    return this.io
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId)
  }

  /**
   * Get number of connected sockets for a user
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0
  }

  /**
   * Get diagnostic information for debugging
   */
  getDiagnostics(): {
    isInitialized: boolean
    totalUsers: number
    totalSockets: number
    userConnections: Array<{ userId: string; socketCount: number; socketIds: string[] }>
  } {
    const userConnections = Array.from(this.userSockets.entries()).map(([userId, socketIds]) => ({
      userId,
      socketCount: socketIds.size,
      socketIds: Array.from(socketIds)
    }))

    return {
      isInitialized: this.io !== null,
      totalUsers: this.userSockets.size,
      totalSockets: userConnections.reduce((sum, user) => sum + user.socketCount, 0),
      userConnections
    }
  }

  /**
   * Force check if a room exists and list its members
   */
  async getRoomInfo(roomName: string): Promise<{ exists: boolean; socketIds: string[] }> {
    if (!this.io) {
      return { exists: false, socketIds: [] }
    }

    try {
      const sockets = await this.io.in(roomName).fetchSockets()
      return {
        exists: sockets.length > 0,
        socketIds: sockets.map((s) => s.id)
      }
    } catch (error) {
      console.error(`Failed to get room info for ${roomName}:`, error)
      return { exists: false, socketIds: [] }
    }
  }
}

export const socketService = new SocketService()
