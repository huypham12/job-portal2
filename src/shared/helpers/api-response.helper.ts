import { Response } from 'express'

/**
 * API Response Helper
 * Provides consistent response formatting for API endpoints
 */
export class ApiResponse {
  /**
   * Success response
   */
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Error response
   */
  static error(res: Response, message: string, statusCode: number = 500, errors?: any) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Not found response
   */
  static notFound(res: Response, message: string = 'Resource not found') {
    return this.error(res, message, 404)
  }

  /**
   * Bad request response
   */
  static badRequest(res: Response, message: string = 'Bad request', errors?: any) {
    return this.error(res, message, 400, errors)
  }

  /**
   * Unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized') {
    return this.error(res, message, 401)
  }

  /**
   * Forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden') {
    return this.error(res, message, 403)
  }

  /**
   * Created response
   */
  static created<T>(res: Response, data: T, message?: string) {
    return this.success(res, data, message, 201)
  }

  /**
   * No content response
   */
  static noContent(res: Response) {
    return res.status(204).send()
  }
}
