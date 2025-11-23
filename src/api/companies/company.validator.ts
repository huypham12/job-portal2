import { z } from 'zod'

// Validator cho việc TẠO MỚI công ty
// Note: Các trường is_verified, verification_date, status là quyền của admin, không cho phép user tạo/cập nhật
export const createCompanyValidator = z.object({
  name: z.string({ error: 'Tên công ty là bắt buộc' }).min(3, { message: 'Tên công ty phải có ít nhất 3 ký tự' }),
  description: z.string().optional(),
  logo_url: z.string().url('Logo URL không hợp lệ').optional(),
  size: z.number().int().positive('Quy mô phải là số nguyên dương').optional(),
  // Thông tin liên hệ
  contact_email: z.string().email('Email không hợp lệ').max(255).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_address: z.string().optional(),
  // Social media URLs
  linkedin_url: z.string().url('LinkedIn URL không hợp lệ').max(255).optional(),
  facebook_url: z.string().url('Facebook URL không hợp lệ').max(255).optional(),
  twitter_url: z.string().url('Twitter URL không hợp lệ').max(255).optional(),
  // Business info (nhà tuyển dụng có thể cung cấp để xác minh)
  tax_code: z.string().max(50).optional(),
  business_license: z.string().max(100).optional()
})

// Validator cho việc CẬP NHẬT công ty (tất cả đều là optional)
export const updateCompanyValidator = createCompanyValidator
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Ít nhất một trường cần được cung cấp để cập nhật' })

// Validator cho PARAMS khi lấy chi tiết công ty
export const getCompanyParamsValidator = z.object({
  id: z.string().uuid('ID công ty không hợp lệ (phải là UUID)')
})

// Validator cho company details
export const companyDetailsValidator = z.object({
  industry: z.string().max(100).optional(),
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employee_count_min: z.number().int().positive().optional(),
  employee_count_max: z.number().int().positive().optional(),
  website_url: z.string().url().max(255).optional(),
  headquarters_location_id: z.string().uuid().optional(),
  company_type: z.string().max(50).optional(),
  revenue_range: z.string().max(50).optional(),
  stock_symbol: z.string().max(10).optional(),
  culture_description: z.string().optional()
})

// Validator cho company benefits
export const companyBenefitValidator = z.object({
  benefit_type: z.string().max(50),
  title: z.string().max(255),
  description: z.string().optional(),
  is_featured: z.boolean().default(false)
})

export const updateCompanyBenefitValidator = companyBenefitValidator.partial()

export const updateCompanyDetailsValidator = companyDetailsValidator.partial()

// Typescript types
export type CreateCompanyBody = z.infer<typeof createCompanyValidator>
export type UpdateCompanyBody = z.infer<typeof updateCompanyValidator>
export type GetCompanyParams = z.infer<typeof getCompanyParamsValidator> // <-- Type cho params
export type CompanyDetailsBody = z.infer<typeof companyDetailsValidator>
export type UpdateCompanyDetailsBody = z.infer<typeof updateCompanyDetailsValidator>
export type CompanyBenefitBody = z.infer<typeof companyBenefitValidator>
export type UpdateCompanyBenefitBody = z.infer<typeof updateCompanyBenefitValidator>
