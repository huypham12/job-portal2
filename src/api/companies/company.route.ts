import { Router } from 'express'
import { z } from 'zod'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { recruiter } from '@/shared/middleware/authorize.middleware'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import {
  createCompanyValidator,
  getCompanyParamsValidator,
  updateCompanyValidator,
  companyDetailsValidator,
  updateCompanyDetailsValidator,
  companyBenefitValidator,
  updateCompanyBenefitValidator
} from './company.dto'
import { companyController } from './company.controller' // Giả định controller được import

export const companyRouter = Router()

/**
 * @route POST /api/companies
 * @desc Nhà tuyển dụng tạo hồ sơ doanh nghiệp của mình.
 * @access Private (Recruiter only)
 * @body { name: string, description?: string, logo_url?: string, size?: number, contact_email?: string, contact_phone?: string, contact_address?: string, linkedin_url?: string, facebook_url?: string, twitter_url?: string, tax_code?: string, business_license?: string }
 * @exampleRequest {
 * "name": "Công ty Cổ phần Công nghệ ABC",
 * "description": "Chuyên cung cấp giải pháp phần mềm...",
 * "size": 100
 * }
 * @exampleResponse 201 {
 * "message": "Tạo hồ sơ doanh nghiệp thành công.",
 * "data": { ...company_object }
 * }
 */
companyRouter.post(
  '/',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: createCompanyValidator }),
  wrapController(companyController.createCompanyController)
)

/**
 * @route GET /api/companies/me
 * @desc Nhà tuyển dụng xem hồ sơ doanh nghiệp của mình.
 * @access Private (Recruiter only)
 * @exampleResponse 200 {
 * "message": "Lấy thông tin doanh nghiệp thành công.",
 * "data": { ...company_object }
 * }
 * @exampleResponse 404 {
 * "message": "Không tìm thấy hồ sơ doanh nghiệp."
 * }
 */
companyRouter.get('/me', authenticateAccessToken, recruiter, wrapController(companyController.getMyCompanyController))

/**
 * @route PATCH /api/companies/me
 * @desc Nhà tuyển dụng cập nhật hồ sơ doanh nghiệp.
 * @access Private (Recruiter only)
 * @body { name?: string, description?: string, logo_url?: string, size?: number, contact_email?: string, contact_phone?: string, contact_address?: string, linkedin_url?: string, facebook_url?: string, twitter_url?: string, tax_code?: string, business_license?: string }
 * @exampleRequest {
 * "logo_url": "https://new-logo-url.com/logo.png",
 * "description": "Mô tả mới cập nhật."
 * }
 * @exampleResponse 200 {
 * "message": "Cập nhật hồ sơ doanh nghiệp thành công.",
 * "data": { ...updated_company_object }
 * }
 */
companyRouter.patch(
  '/me',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: updateCompanyValidator }),
  wrapController(companyController.updateMyCompanyController)
)

/**
 * @route GET /api/companies/me/details
 * @desc Nhà tuyển dụng xem thông tin chi tiết công ty.
 * @access Private (Recruiter only)
 * @exampleResponse 200 {
 * "message": "Lấy thông tin chi tiết công ty thành công.",
 * "data": { ...company_details_object }
 * }
 * @exampleResponse 404 {
 * "message": "Không tìm thấy thông tin chi tiết công ty."
 * }
 */
companyRouter.get(
  '/me/details',
  authenticateAccessToken,
  recruiter,
  wrapController(companyController.getMyCompanyDetailsController)
)

/**
 * @route POST /api/companies/me/details
 * @desc Nhà tuyển dụng tạo thông tin chi tiết công ty.
 * @access Private (Recruiter only)
 * @body { industry?: string, founded_year?: number, employee_count_min?: number, employee_count_max?: number, website_url?: string, headquarters_location_id?: string, company_type?: string, revenue_range?: string, stock_symbol?: string }
 */
companyRouter.post(
  '/me/details',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: companyDetailsValidator }),
  wrapController(companyController.createCompanyDetailsController)
)

/**
 * @route PATCH /api/companies/me/details
 * @desc Nhà tuyển dụng cập nhật thông tin chi tiết công ty.
 * @access Private (Recruiter only)
 * @body { industry?: string, founded_year?: number, employee_count_min?: number, employee_count_max?: number, website_url?: string, headquarters_location_id?: string, company_type?: string, revenue_range?: string, stock_symbol?: string }
 */
companyRouter.patch(
  '/me/details',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: updateCompanyDetailsValidator }),
  wrapController(companyController.updateCompanyDetailsController)
)

/**
 * @route DELETE /api/companies/me/details
 * @desc Nhà tuyển dụng xóa thông tin chi tiết công ty.
 * @access Private (Recruiter only)
 */
companyRouter.delete(
  '/me/details',
  authenticateAccessToken,
  recruiter,
  wrapController(companyController.deleteCompanyDetailsController)
)

/**
 * @route GET /api/companies/me/benefits
 * @desc Nhà tuyển dụng xem danh sách phúc lợi công ty.
 * @access Private (Recruiter only)
 * @exampleResponse 200 {
 * "message": "Lấy danh sách phúc lợi thành công.",
 * "data": [{ ...benefit_objects }]
 * }
 */
companyRouter.get(
  '/me/benefits',
  authenticateAccessToken,
  recruiter,
  wrapController(companyController.getMyCompanyBenefitsController)
)

/**
 * @route POST /api/companies/me/benefits
 * @desc Nhà tuyển dụng thêm phúc lợi cho công ty.
 * @access Private (Recruiter only)
 */
companyRouter.post(
  '/me/benefits',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: companyBenefitValidator }),
  wrapController(companyController.addCompanyBenefitController)
)

/**
 * @route PATCH /api/companies/me/benefits/:id
 * @desc Nhà tuyển dụng cập nhật phúc lợi công ty.
 * @access Private (Recruiter only)
 */
companyRouter.patch(
  '/me/benefits/:id',
  authenticateAccessToken,
  recruiter,
  validateDto({
    params: z.object({ id: z.string().uuid() }),
    body: updateCompanyBenefitValidator
  }),
  wrapController(companyController.updateCompanyBenefitController)
)

/**
 * @route DELETE /api/companies/me/benefits/:id
 * @desc Nhà tuyển dụng xóa phúc lợi công ty.
 * @access Private (Recruiter only)
 */
companyRouter.delete(
  '/me/benefits/:id',
  authenticateAccessToken,
  recruiter,
  validateDto({ params: z.object({ id: z.string().uuid() }) }),
  wrapController(companyController.deleteCompanyBenefitController)
)

/**
 * @route GET /api/companies/:id
 * @desc (Public) Xem chi tiết hồ sơ doanh nghiệp bằng ID.
 * @access Public
 * @params { id: string (uuid) }
 * @query { details?: 'true' | 'false' } - Include detailed information
 * @exampleResponse 200 {
 * "message": "Lấy thông tin doanh nghiệp thành công.",
 * "data": { ...company_object }
 * }
 * @exampleResponse 404 {
 * "message": "Không tìm thấy hồ sơ doanh nghiệp."
 * }
 */
companyRouter.get(
  '/:id',
  // Đây là API public, không cần authenticateAccessToken
  validateDto({ params: getCompanyParamsValidator }), // <-- Validate ID từ URL
  wrapController(companyController.getCompanyByIdController)
)
