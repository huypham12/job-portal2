import { z } from 'zod'

// Custom URL validator - less strict than zod's built-in url()
const urlSchema = z.string().refine((value) => {
  try {
    new URL(value)
    return true
  } catch {
    // Allow relative URLs or URLs without protocol for flexibility
    return /^https?:\/\//.test(value) || /^\/\//.test(value)
  }
}, 'URL không hợp lệ')

// Validator cho việc TẠO MỚI công ty
// Note: Các trường is_verified, verification_date, status là quyền của admin, không cho phép user tạo/cập nhật
export const createCompanyValidator = z.object({
  name: z.string().min(3, { message: 'Tên công ty phải có ít nhất 3 ký tự' }),
  description: z.string().max(2000, 'Mô tả công ty không được vượt quá 2000 ký tự').optional(),
  logo_url: urlSchema.max(255).optional(),
  size: z.number().int().min(0, 'Quy mô phải là số nguyên không âm').optional(),
  // Thông tin liên hệ
  contact_email: z.string().email('Email không hợp lệ').max(255).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_address: z.string().optional(),
  // Social media URLs
  linkedin_url: urlSchema.max(255).optional(),
  facebook_url: urlSchema.max(255).optional(),
  twitter_url: urlSchema.max(255).optional(),
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
export const companyDetailsValidator = z
  .object({
    industry: z.string().max(100).optional(),
    founded_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
    employee_count_min: z.number().int().min(0, 'Số nhân viên tối thiểu phải là số nguyên không âm').optional(),
    employee_count_max: z.number().int().min(0, 'Số nhân viên tối đa phải là số nguyên không âm').optional(),
    website_url: urlSchema.max(255).optional(),
    headquarters_location_id: z.string().uuid().optional(),
    company_type: z.string().max(50).optional(),
    revenue_range: z.string().max(50).optional(),
    stock_symbol: z.string().max(10).optional(),
    culture_description: z.string().max(5000, 'Mô tả văn hóa công ty không được vượt quá 5000 ký tự').optional()
  })
  .refine(
    (data) => {
      // Validate that min <= max if both are provided
      if (data.employee_count_min !== undefined && data.employee_count_max !== undefined) {
        return data.employee_count_min <= data.employee_count_max
      }
      return true
    },
    {
      message: 'Số nhân viên tối thiểu không được lớn hơn số nhân viên tối đa',
      path: ['employee_count_min']
    }
  )

// Validator cho company benefits
export const companyBenefitValidator = z.object({
  benefit_type: z.string().max(50),
  title: z.string().max(255),
  description: z.string().optional(),
  is_featured: z.boolean()
})

export const updateCompanyBenefitValidator = companyBenefitValidator.partial()

export const updateCompanyDetailsValidator = companyDetailsValidator.partial().refine(
  (data) => {
    // Only validate min <= max if both are provided in the update
    if (data.employee_count_min !== undefined && data.employee_count_max !== undefined) {
      return data.employee_count_min <= data.employee_count_max
    }
    return true
  },
  {
    message: 'Số nhân viên tối thiểu không được lớn hơn số nhân viên tối đa',
    path: ['employee_count_min']
  }
)

// Typescript types
export type CreateCompanyBody = z.infer<typeof createCompanyValidator>
export type UpdateCompanyBody = z.infer<typeof updateCompanyValidator>
export type GetCompanyParams = z.infer<typeof getCompanyParamsValidator> // <-- Type cho params
export type CompanyDetailsBody = z.infer<typeof companyDetailsValidator>
export type UpdateCompanyDetailsBody = z.infer<typeof updateCompanyDetailsValidator>
export type CompanyBenefitBody = z.infer<typeof companyBenefitValidator>
export type UpdateCompanyBenefitBody = z.infer<typeof updateCompanyBenefitValidator>
