import { Request, Response, NextFunction } from 'express'
import { redisService } from '@/config/redis.service'
import { HttpError } from '../shared/common/http-error'
import { HTTP_STATUS } from '../shared/constants/httpStatus'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Prefix for Redis keys
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

// Simple rate limiting middleware using Redis
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs, // khoảng thời gian đếm request
    maxRequests, // Số request tối đa trong window
    keyPrefix = 'ratelimit', // Phân loại rate limit (auth, api, strict)
    skipSuccessfulRequests = false, // Không tính các request thành công
    skipFailedRequests = false // Không tính các request thất bại
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create unique key based on IP address and endpoint
      // auth:192.168.1.10:/login
      const key = `${keyPrefix}:${req.ip}:${req.path}`

      // Get current request count
      const currentCount = await redisService.get(key)
      const requestCount = currentCount ? parseInt(currentCount) : 0

      // Check if limit exceeded
      if (requestCount >= maxRequests) {
        console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`)
        return next(new HttpError('Too many requests, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS))
      }

      // Increment counter
      const newCount = requestCount + 1
      await redisService.set(key, newCount.toString(), Math.ceil(windowMs / 1000))

      // Note: For simplicity, we count all requests. In production,
      // you might want to implement response interception to skip successful/failed requests

      next()
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Don't block requests if Redis fails
      next()
    }
  }
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Increased limit for local development/testing to reduce accidental 429s.
  // In production consider keeping this low (e.g. 5) or using exponential backoff.
  maxRequests: 100, // 100 attempts per 15 minutes
  keyPrefix: 'auth',
  skipSuccessfulRequests: true // Don't count successful logins
})

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 100 requests per minute
  keyPrefix: 'api'
})

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 10 requests per minute
  keyPrefix: 'strict'
})
