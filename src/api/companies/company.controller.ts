import { Request } from 'express'
import { PostHandler, GetHandler, PatchHandler } from '@/types/controller-handler.type'
import {
  CreateCompanyBody,
  GetCompanyParams,
  UpdateCompanyBody,
  CompanyDetailsBody,
  UpdateCompanyDetailsBody,
  CompanyBenefitBody,
  UpdateCompanyBenefitBody
} from './company.dto'
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
  getCompanyByIdController: GetHandler<any, { details?: string }, GetCompanyParams> = async (req, res) => {
    const { id } = req.params as GetCompanyParams
    const includeDetails = (req.query as { details?: string }).details === 'true'
    const company = await this.companyService.getCompanyById(id, includeDetails)

    res.status(HTTP_STATUS.OK).json({
      message: MESSAGES.GET_COMPANY_SUCCESS,
      data: company
    })
  }

  /**
   * @description (Recruiter) Cập nhật thông tin chi tiết công ty
   * @route PATCH /api/companies/my-company/details
   * @access Recruiter
   */
  updateCompanyDetailsController: PatchHandler<CompanyDetailsBody> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const details = await this.companyService.updateCompanyDetails(user_id, req.body)

    res.status(HTTP_STATUS.OK).json({
      message: 'Cập nhật thông tin chi tiết công ty thành công',
      data: details
    })
  }

  /**
   * @description (Recruiter) Thêm phúc lợi công ty
   * @route POST /api/companies/my-company/benefits
   * @access Recruiter
   */
  addCompanyBenefitController: PostHandler<CompanyBenefitBody> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const benefit = await this.companyService.addCompanyBenefit(user_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Thêm phúc lợi công ty thành công',
      data: benefit
    })
  }

  /**
   * @description (Recruiter) Cập nhật phúc lợi công ty
   * @route PATCH /api/companies/my-company/benefits/:id
   * @access Recruiter
   */
  updateCompanyBenefitController: PatchHandler<UpdateCompanyBenefitBody, any, { id: string }> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params
    const benefit = await this.companyService.updateCompanyBenefit(user_id, id, req.body)

    res.status(HTTP_STATUS.OK).json({
      message: 'Cập nhật phúc lợi công ty thành công',
      data: benefit
    })
  }

  /**
   * @description (Recruiter) Xóa phúc lợi công ty
   * @route DELETE /api/companies/my-company/benefits/:id
   * @access Recruiter
   */
  deleteCompanyBenefitController: GetHandler<any, any, { id: string }> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params
    await this.companyService.deleteCompanyBenefit(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Xóa phúc lợi công ty thành công'
    })
  }



  /**
   * @description (Recruiter) Lấy thông tin chi tiết công ty của mình
   * @route GET /api/companies/me/details
   * @access Recruiter
   */
  getMyCompanyDetailsController: GetHandler = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const details = await this.companyService.getCompanyDetailsByRecruiter(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Lấy thông tin chi tiết công ty thành công',
      data: details
    })
  }

  /**
   * @description (Recruiter) Tạo thông tin chi tiết công ty
   * @route POST /api/companies/me/details
   * @access Recruiter
   */
  createCompanyDetailsController: PostHandler<CompanyDetailsBody> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const details = await this.companyService.createCompanyDetails(user_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Tạo thông tin chi tiết công ty thành công',
      data: details
    })
  }

  /**
   * @description (Recruiter) Xóa thông tin chi tiết công ty
   * @route DELETE /api/companies/me/details
   * @access Recruiter
   */
  deleteCompanyDetailsController: GetHandler = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    await this.companyService.deleteCompanyDetails(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Xóa thông tin chi tiết công ty thành công'
    })
  }

  /**
   * @description (Recruiter) Lấy danh sách phúc lợi công ty
   * @route GET /api/companies/me/benefits
   * @access Recruiter
   */
  getMyCompanyBenefitsController: GetHandler = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const benefits = await this.companyService.getCompanyBenefitsByRecruiter(user_id)

    res.status(HTTP_STATUS.OK).json({
      message: 'Lấy danh sách phúc lợi thành công',
      data: benefits
    })
  }
}

// Khởi tạo và export
// (Trong thực tế, bạn có thể dùng dependency injection)
const companyService = new CompanyService()
export const companyController = new CompanyController(companyService)
