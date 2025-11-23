import multer from 'multer'
import { Request } from 'express'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'

// Cấu hình file size limits (bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Định nghĩa các loại file được phép
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
]

// Combined allowed types cho application documents
export const ALLOWED_APPLICATION_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]

// Storage configuration - sử dụng memory storage để upload lên S3
const storage = multer.memoryStorage()

// File filter function
const createFileFilter = (allowedMimeTypes: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new HttpError(
          `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE
        )
      )
    }
  }
}

// Multer configuration
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
})

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: createFileFilter(ALLOWED_DOCUMENT_TYPES)
})

export const uploadApplicationDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: createFileFilter(ALLOWED_APPLICATION_DOCUMENT_TYPES)
})

// Middleware để handle multer errors
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new HttpError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, HTTP_STATUS.PAYLOAD_TOO_LARGE)
      )
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new HttpError('Too many files', HTTP_STATUS.BAD_REQUEST))
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new HttpError('Unexpected file field', HTTP_STATUS.BAD_REQUEST))
    }
  }

  if (err instanceof HttpError) {
    return next(err)
  }

  next(new HttpError(err.message || 'File upload error', HTTP_STATUS.INTERNAL_SERVER_ERROR))
}
