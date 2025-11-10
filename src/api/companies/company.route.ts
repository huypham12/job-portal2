import { Router } from 'express'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { recruiter } from '@/shared/middleware/authorize.middleware'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import { createCompanyValidator, getCompanyParamsValidator, updateCompanyValidator } from './company.dto'
import { companyController } from './company.controller' // Giả định controller được import

export const companyRouter = Router()

/**
 * @route POST /api/companies
 * @desc Nhà tuyển dụng tạo hồ sơ doanh nghiệp của mình.
 * @access Private (Recruiter only)
 * @body { name: string, description?: string, logo_url?: string, size?: number, metadata?: object }
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
 * @route GET /api/companies/my-company
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
companyRouter.get(
  '/my-company',
  authenticateAccessToken,
  recruiter,
  wrapController(companyController.getMyCompanyController)
)

/**
 * @route PATCH /api/companies/my-company
 * @desc Nhà tuyển dụng cập nhật hồ sơ doanh nghiệp.
 * @access Private (Recruiter only)
 * @body { name?: string, description?: string, logo_url?: string, size?: number, metadata?: object }
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
  '/my-company',
  authenticateAccessToken,
  recruiter,
  validateDto({ body: updateCompanyValidator }),
  wrapController(companyController.updateMyCompanyController)
)

/**
 * @route GET /api/companies/:id
 * @desc (Public) Xem chi tiết hồ sơ doanh nghiệp bằng ID.
 * @access Public
 * @params { id: string (uuid) }
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
