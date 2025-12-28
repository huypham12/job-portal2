import jwt from 'jsonwebtoken'
import { Socket } from 'socket.io'

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user data to socket
 */
export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      role: string
    }

    // Attach user data to socket
    socket.data.userId = decoded.userId
    socket.data.role = decoded.role

    next()
  } catch (error) {
    next(new Error('Authentication error: Invalid token'))
  }
}
