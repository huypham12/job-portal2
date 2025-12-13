# Validator Pattern - Best Practices

## Vấn đề đã được fix

### Lỗi 1: Cannot assign to req.query and req.params

`req.query` và `req.params` trong Express là **read-only properties** (chỉ có getter, không có setter). Việc gán trực tiếp sẽ gây lỗi:

```typescript
// ❌ SAI - Không hoạt động
req.query = parsed.data.query as any
req.params = parsed.data.params as any
```

### Lỗi 2: Type coercion không hoạt động với nested validation

Khi validate nested object (như `z.object({ query: schema })`), các giá trị đã được coerce có thể bị overwrite bởi giá trị gốc khi dùng `Object.assign()`.

**Ví dụ lỗi:**

- Query params từ URL: `?limit=20` → `req.query = { limit: "20" }` (string)
- Sau validate nested: `parsed.data.query = { limit: 20 }` (number)
- Sau `Object.assign(req.query, parsed.data.query)`: `req.query = { limit: "20" }` (vẫn là string!)

### Giải pháp: Validate từng phần riêng biệt + Clear existing properties

```typescript
// ✅ ĐÚNG - Validate trực tiếp và clear properties trước khi assign
if (parts.query) {
  const result = parts.query.safeParse(req.query)
  if (!result.success) {
    // Handle error
    return
  }
  // Clear existing properties first
  Object.keys(req.query).forEach((key) => delete (req.query as any)[key])
  // Then assign validated data
  Object.assign(req.query, result.data)
}
```

## Pattern được sử dụng

### 1. File Validator (zodValidate pattern)

Các file: `job.validator.ts`, `saved-job.validator.ts`, `user.validator.ts`

```typescript
import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

const zodValidate = (parts: SchemaParts): RequestHandler => {
  return (req, res, next) => {
    try {
      // Validate each part separately to ensure proper type coercion
      if (parts.body) {
        const result = parts.body.safeParse(req.body)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        req.body = result.data
      }

      if (parts.query) {
        const result = parts.query.safeParse(req.query)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        // Clear existing query and assign validated data
        Object.keys(req.query).forEach((key) => delete (req.query as any)[key])
        Object.assign(req.query, result.data)
      }

      if (parts.params) {
        const result = parts.params.safeParse(req.params)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        // Clear existing params and assign validated data
        Object.keys(req.params).forEach((key) => delete (req.params as any)[key])
        Object.assign(req.params, result.data)
      }

      next()
    } catch (error) {
      res.status(500).json({
        message: 'Internal validation error'
      })
    }
  }
}
```

### 2. Middleware Validator (validateDto pattern)

File: `validateDto.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

type ValidationSchemas = {
  body?: z.Schema
  params?: z.Schema
  query?: z.Schema
}

export const validateDto = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }

      // Validate params
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params)
        Object.assign(req.params, parsedParams)
      }

      // Validate query
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query)
        Object.assign(req.query, parsedQuery)
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        // Handle validation error
      }
    }
  }
}
```

## Sử dụng trong Controller

### Type Assertion sau khi validate

Vì TypeScript không biết rằng `req.query` và `req.params` đã được transform bởi validator, cần sử dụng type assertion:

```typescript
// ✅ ĐÚNG - Sử dụng as unknown as để bypass strict type checking
const query = req.query as unknown as GetSavedJobsDTO
const params = req.params as unknown as JobIdParams

// Hoặc nếu đơn giản hơn
const query = req.query as any
```

### Ví dụ đầy đủ

```typescript
// Route
router.get(
  '/saved-jobs',
  authenticate,
  getSavedJobsValidator, // Validator middleware
  savedJobController.getSavedJobs
)

// Controller
getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.query đã được validated và transformed
    const query = req.query as unknown as GetSavedJobsDTO

    const result = await this.savedJobService.getSavedJobs(userId, query)

    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    next(error)
  }
}
```

## Các file đã được fix

1. ✅ `src/api/jobs/job.validator.ts`
2. ✅ `src/api/saved-jobs/saved-job.validator.ts`
3. ✅ `src/api/user/user.validator.ts`
4. ✅ `src/shared/middleware/validateDto.middleware.ts`
5. ✅ `src/api/saved-jobs/saved-job.controller.ts` (type assertion)

## Lưu ý quan trọng

### ❌ Không nên làm

```typescript
// Gán trực tiếp cho req.query/req.params
req.query = newValue
req.params = newValue

// Sử dụng try-catch để fallback (không cần thiết)
try {
  Object.assign(req.query, data)
} catch {
  req.query = data // Vẫn sẽ lỗi
}
```

### ✅ Nên làm

```typescript
// Luôn sử dụng Object.assign
Object.assign(req.query, validatedData)
Object.assign(req.params, validatedData)

// Type assertion trong controller
const query = req.query as unknown as QueryDTO
```

## Zod Schema Tips

### Xử lý Query String (luôn là string từ URL)

```typescript
// ✅ ĐÚNG - Sử dụng z.coerce hoặc z.preprocess
const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  // Hoặc sử dụng preprocess cho logic phức tạp
  search: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined
    return val
  }, z.string().optional())
})
```

### z.enum với custom error message

```typescript
// ✅ ĐÚNG - Sử dụng message trong params object
z.enum(['asc', 'desc'], {
  message: 'order must be either asc or desc'
})

// ❌ SAI - errorMap không được support trong z.enum params
z.enum(['asc', 'desc'], {
  errorMap: () => ({ message: 'error' }) // Sẽ lỗi TypeScript
})
```

## Testing

Sau khi sửa, test các trường hợp sau:

1. ✅ Validator parse và transform đúng query parameters
2. ✅ Validator parse và transform đúng path parameters
3. ✅ Body validation hoạt động bình thường
4. ✅ Không có TypeScript compilation errors
5. ✅ Runtime không throw errors khi gán values

## Migration Checklist

Khi tạo validator mới hoặc refactor validator cũ:

- [ ] Sử dụng `Object.assign()` cho `req.query` và `req.params`
- [ ] Không gán trực tiếp cho `req.query` hoặc `req.params`
- [ ] Sử dụng `z.coerce` hoặc `z.preprocess` cho query string transformation
- [ ] Export proper TypeScript types từ Zod schemas
- [ ] Sử dụng `as unknown as` trong controller để type assertion
- [ ] Test validator với actual HTTP requests
