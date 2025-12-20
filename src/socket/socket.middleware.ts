import { Socket } from 'socket.io'
import { verifyToken } from '@/shared/utils/jwt'
import { envConfig } from '@/config/getEnvConfig'
import { TokenPayload } from '@/types/token-payload.type'

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user data to socket
 */
export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    // Verify token
    const decoded = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.access as string
    })

    // Attach user data to socket
    const payload = decoded as TokenPayload
    socket.data.userId = payload.user_id
    socket.data.role = payload.role

    next()
  } catch (error) {
    next(new Error('Authentication error: Invalid token'))
  }
}

