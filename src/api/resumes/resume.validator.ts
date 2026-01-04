import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { HttpError } from '@/shared/common/http-error'

// Middleware validate function matching auth.validator pattern
export const validate = <T extends z.ZodTypeAny>(schema: T) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        headers: req.headers,
        params: req.params
      })

      req.validatedData = result
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {}
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'validation'
          if (!errors[path]) errors[path] = []
          errors[path].push(issue.message)
        })
        // Dev log: show validation details and payload summary
        try {
          const payloadSummary = {
            path: req.originalUrl,
            bodyKeys: Object.keys(req.body || {}),
            htmlSize: req.body && typeof req.body.html === 'string' ? `${req.body.html.length} bytes` : undefined,
            errors
          }
          console.error('[validate] Validation failed:', JSON.stringify(payloadSummary))
        } catch (e) {
          console.error('[validate] Validation failed (could not serialize payload):', e)
        }
        return next(new HttpError('Validation failed', 400, errors))
      }

      console.error('Unexpected validation error:', error)
      return next(new HttpError('Internal Server Error', 500))
    }
  }
}

// Schema cho tạo CV từ đầu (manual input)
export const createResumeValidator = validate(
  z.object({
    body: z.object({
      title: z
        .string({
          message: 'Title must be a string'
        })
        .min(1, 'Title is required')
        .max(255, 'Title must not exceed 255 characters')
        .trim(),
      content: z.object({}, { message: 'Content must be a valid JSON object' }).passthrough().optional(),
      is_default: z.boolean().optional().default(false),
      is_public: z.boolean().optional().default(false),
      status: z.enum(['draft', 'active', 'archived']).optional().default('draft')
    })
  })
)

// Schema cho cập nhật CV
export const updateResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    }),
    body: z.object({
      title: z
        .string({
          message: 'Title must be a string'
        })
        .min(1, 'Title is required')
        .max(255, 'Title must not exceed 255 characters')
        .trim()
        .optional(),
      content: z.object({}, { message: 'Content must be a valid JSON object' }).passthrough().optional(),
      layout_settings: z
        .object({
          sections_order: z.array(z.string()).optional(),
          theme: z.string().optional(),
          custom_css: z.record(z.string(), z.any()).optional()
        })
        .optional(),
      is_public: z.boolean().optional(),
      status: z.enum(['draft', 'active', 'archived']).optional()
    })
  })
)

// Schema cho set CV mặc định
export const setDefaultResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    })
  })
)

// Schema cho xóa CV
export const deleteResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    })
  })
)

// Schema cho lấy chi tiết CV
export const getResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    })
  })
)

// Schema cho upload CV file
export const uploadResumeValidator = validate(
  z.object({
    body: z.object({
      title: z
        .string({
          message: 'Title must be a string'
        })
        .min(1, 'Title is required')
        .max(255, 'Title must not exceed 255 characters')
        .trim()
        .optional(),
      auto_parse: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
      is_default: z
        .string()
        .optional()
        .transform((val) => val === 'true')
    })
  })
)

// Schema cho thay thế file CV
export const replaceResumeFileValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    }),
    body: z.object({
      auto_parse: z
        .string()
        .optional()
        .transform((val) => val === 'true')
    })
  })
)

// Schema cho export CV
export const exportResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    }),
    body: z
      .object({
        // Only accept canonical templates supported by backend
        template: z.enum(['timeline', 'professional', 'compact']).optional().default('professional'),
        format: z.enum(['pdf', 'html']).optional().default('pdf'),
        html: z
          .string()
          .max(10 * 1024 * 1024)
          .optional(), // allow up to ~10MB HTML payload
        viewportWidth: z.number().int().min(1).optional()
      })
      .passthrough() // allow extra fields from frontend
  })
)

// Schema cho tạo CV từ profile - Include ALL data
export const createResumeFromProfileValidator = validate(
  z.object({
    body: z.object({
      title: z
        .string({
          message: 'Title must be a string'
        })
        .min(1, 'Title is required')
        .max(255, 'Title must not exceed 255 characters')
        .trim(),
      theme: z
        .enum(['default', 'professional', 'creative', 'modern', 'elegant', 'blue', 'purple', 'green', 'orange', 'red'])
        .optional()
        .default('default'),
      is_default: z.boolean().optional().default(false),
      is_public: z.boolean().optional().default(false)
    })
  })
)

// Schema cho duplicate CV
export const duplicateResumeValidator = validate(
  z.object({
    params: z.object({
      id: z.string().uuid('Invalid resume ID format')
    }),
    body: z.object({
      title: z
        .string({
          message: 'Title must be a string'
        })
        .min(1, 'Title is required')
        .max(255, 'Title must not exceed 255 characters')
        .trim(),
      modifications: z
        .object({
          skills: z.array(z.string().uuid()).optional(),
          experiences: z.array(z.string().uuid()).optional(),
          educations: z.array(z.string().uuid()).optional(),
          certifications: z.array(z.string().uuid()).optional(),
          awards: z.array(z.string().uuid()).optional()
        })
        .optional()
    })
  })
)
