import { z } from 'zod'

// Validator cho việc TẠO MỚI công ty
export const createCompanyValidator = z.object({
  name: z.string({ error: 'Tên công ty là bắt buộc' }).min(3, { message: 'Tên công ty phải có ít nhất 3 ký tự' }),
  description: z.string().optional(),
  logo_url: z.string().url('Logo URL không hợp lệ').optional(),
  size: z.number().int().positive('Quy mô phải là số nguyên dương').optional(),
  // metadata (JSONB) có thể là bất kỳ object nào
  metadata: z.record(z.string(), z.any()).optional()
})

// Validator cho việc CẬP NHẬT công ty (tất cả đều là optional)
export const updateCompanyValidator = createCompanyValidator
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Ít nhất một trường cần được cung cấp để cập nhật' })

// Validator cho PARAMS khi lấy chi tiết công ty
export const getCompanyParamsValidator = z.object({
  id: z.string().uuid('ID công ty không hợp lệ (phải là UUID)')
})

// Typescript types
export type CreateCompanyBody = z.infer<typeof createCompanyValidator>
export type UpdateCompanyBody = z.infer<typeof updateCompanyValidator>
export type GetCompanyParams = z.infer<typeof getCompanyParamsValidator> // <-- Type cho params
