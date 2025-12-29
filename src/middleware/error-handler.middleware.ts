import { ErrorRequestHandler } from 'express'
import { HttpError } from '../shared/common/http-error'
import { ErrorResponseDto } from '../shared/common/error-response.dto'
import { envConfig } from '../config/getEnvConfig'

// trình xử lý lỗi chung, mọi error sẽ đều được next tới đây
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const status = err instanceof HttpError ? err.statusCode : 500
  const message = err.message || 'Internal Server Error'
  const errors = err instanceof HttpError ? err.errors || {} : {}

  // Dev-only: log validation / error details to console for easier debugging
  if (envConfig.app.nodeEnv !== 'production') {
    try {
      console.error('[error-handler] ', { path: req.originalUrl, status, message, errors })
    } catch (e) {
      console.error('[error-handler] could not log error details', e)
    }
  }

  const response = new ErrorResponseDto(status, message, errors)

  res.status(status).json(response)
}
