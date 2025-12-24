import { Request, Response, NextFunction } from 'express'
// Import 'z' (hoặc 'Schema') thay vì 'AnyZodObject'
import { z, ZodError } from 'zod'
import { HttpError } from '../shared/common/http-error'
import { HTTP_STATUS } from '../shared/constants/httpStatus'

// Thay đổi AnyZodObject thành z.Schema
type ValidationSchemas = {
  body?: z.Schema
  params?: z.Schema
  query?: z.Schema
}

/**
 * Tạo ra một middleware (higher-order function) để validate request.
 * Nó sẽ parse body, params, và query dựa trên schema được cung cấp.
 * Nếu validate thất bại, nó sẽ gọi next(error) với một HttpError 400.
 *
 * @param schemas - Một object chứa các Zod schema cho 'body', 'params', hoặc 'query'.
 */
export const validateDto = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body nếu schema body được cung cấp
      if (schemas.body) {
        // parseAsync sẽ ném lỗi nếu không khớp
        req.body = await schemas.body.parseAsync(req.body)
      }

      // Validate params nếu schema params được cung cấp
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any
      }

      // Validate query nếu schema query được cung cấp
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any
      }

      // Nếu tất cả đều thành công, đi tiếp
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        // Format lỗi từ Zod để frontend dễ đọc hơn
        const formattedErrors = error.issues.reduce(
          (acc, issue) => {
            // Lấy đường dẫn lỗi, vd: "user.name"
            const path = issue.path.join('.')
            // HttpError expects array of strings, so wrap the message in an array
            acc[path] = [issue.message]
            return acc
          },
          {} as Record<string, string[]>
        )

        // Tạo lỗi HttpError chuẩn và ném cho errorHandler tổng
        const validationError = new HttpError('Dữ liệu đầu vào không hợp lệ', HTTP_STATUS.BAD_REQUEST, formattedErrors)
        next(validationError)
      } else {
        // Lỗi server không mong muốn
        next(new HttpError('Lỗi server khi validate dữ liệu', HTTP_STATUS.INTERNAL_SERVER_ERROR))
      }
    }
  }
}
