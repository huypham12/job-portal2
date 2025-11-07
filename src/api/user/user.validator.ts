import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

const zodValidate = (parts: SchemaParts): RequestHandler => {
  const schema = z.object({
    body: parts.body ?? z.any(),
    query: parts.query ?? z.any(),
    params: parts.params ?? z.any()
  })

  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    })
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      })
      return
    }
    req.body = parsed.data.body
    req.query = parsed.data.query
    req.params = parsed.data.params
    next()
  }
}

const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/

// Only fields existing in profiles table
const updateProfileBody = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
    phone: z.string().regex(phoneRegex, 'Invalid phone number').optional(),
    location_id: z.string().uuid().optional().nullable(),
    metadata: z.record(z.string(), z.any()).optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' })

export const updateProfileValidator = zodValidate({ body: updateProfileBody })
