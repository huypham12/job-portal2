import { Request } from 'express'
import { PostHandler, GetHandler, PatchHandler } from '@/types/controller-handler.type'
import { CreateCompanyBody, GetCompanyParams, UpdateCompanyBody } from './company.dto'
import { CompanyService } from './company.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { TokenPayload } from '@/types/token-payload.type'

// Giả định CompanyService được khởi tạo và inject
class CompanyController {
  constructor(private companyService: CompanyService) {}

  /**
   * @description (Recruiter) Tạo hồ sơ doanh nghiệp mới
   * @route POST /api/companies
   * @access Recruiter
   */
  createCompanyController: PostHandler<CreateCompanyBody> = async (req, res) => {
    // Lấy recruiterId từ middleware authenticateAccessToken
    const { user_id } = req.decoded_authorization as TokenPayload

    const company = await this.companyService.createCompany(user_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: MESSAGES.CREATE_COMPANY_SUCCESS,
      data: company
    })
  }

  /**
   * @description (Recruiter) Lấy hồ sơ doanh nghiệp của mình
   * @route GET /api/companies/my-company
   * @access Recruiter
   */
  getMyCompanyController: GetHandler = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    const company = await this.companyService.getCompanyByRecruiter(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: MESSAGES.GET_COMPANY_SUCCESS,
      data: company
    })
  }

  /**
   * @description (Recruiter) Cập nhật hồ sơ doanh nghiệp
   * @route PATCH /api/companies/my-company
   * @access Recruiter
   */
  updateMyCompanyController: PatchHandler<UpdateCompanyBody> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    const updatedCompany = await this.companyService.updateCompanyByRecruiter(user_id, req.body)

    res.status(HTTP_STATUS.OK).json({
      message: MESSAGES.UPDATE_COMPANY_SUCCESS,
      data: updatedCompany
    })
  }

  /**
   * @description (Public) Lấy thông tin chi tiết doanh nghiệp bằng ID
   * @route GET /api/companies/:id
   * @access Public
   */
  getCompanyByIdController: GetHandler<any, any, GetCompanyParams> = async (req, res) => {
    // Lấy id từ req.params (đã được validate)
    const { id } = req.params

    const company = await this.companyService.getCompanyById(id)

    res.status(HTTP_STATUS.OK).json({
      message: MESSAGES.GET_COMPANY_SUCCESS,
      data: company
    })
  }
}

// Khởi tạo và export
// (Trong thực tế, bạn có thể dùng dependency injection)
const companyService = new CompanyService()
export const companyController = new CompanyController(companyService)
