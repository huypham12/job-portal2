import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

export const zodValidate = (parts: SchemaParts): RequestHandler => {
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

    // Type assertion for validated data
    req.body = parsed.data.body
    req.query = parsed.data.query
    req.params = parsed.data.params

    next()
  }
}

export const validateRequest = zodValidate({})
