import { prisma } from '@/config/database.service'
import { CreateCompanyBody, UpdateCompanyBody } from './company.dto'
import { HttpError } from '@/shared/common/http-error'
import { MESSAGES } from '@/shared/constants/messages'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'

export class CompanyService {
  /**
   * Tạo mới hồ sơ doanh nghiệp cho Nhà tuyển dụng
   * @param recruiterId ID của nhà tuyển dụng (từ req.user.id)
   * @param data Dữ liệu tạo công ty
   */
  async createCompany(recruiterId: string, data: CreateCompanyBody) {
    // Kiểm tra xem nhà tuyển dụng này đã có công ty chưa (Logic 1:1)
    const existingCompany = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId }
    })

    if (existingCompany) {
      throw new HttpError(MESSAGES.COMPANY_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
    }

    // Tạo công ty mới
    const company = await prisma.companies.create({
      data: {
        ...data,
        recruiter_id: recruiterId
      }
    })
    return company
  }

  /**
   * Lấy hồ sơ doanh nghiệp dựa trên ID của nhà tuyển dụng
   * @param recruiterId ID của nhà tuyển dụng
   */
  async getCompanyByRecruiter(recruiterId: string) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return company
  }

  /**
   * Cập nhật hồ sơ doanh nghiệp dựa trên ID của nhà tuyển dụng
   * @param recruiterId ID của nhà tuyển dụng
   * @param data Dữ liệu cập nhật
   */
  async updateCompanyByRecruiter(recruiterId: string, data: UpdateCompanyBody) {
    try {
      // Cập nhật trực tiếp bằng recruiter_id (đã có unique constraint)
      const updatedCompany = await prisma.companies.update({
        where: { recruiter_id: recruiterId },
        data
      })
      return updatedCompany
    } catch (error: any) {
      // Nếu không tìm thấy record để update
      if (error.code === 'P2025') {
        throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * (Public) Lấy hồ sơ doanh nghiệp bằng ID (UUID)
   * @param companyId ID của công ty
   */
  async getCompanyById(companyId: string) {
    const company = await prisma.companies.findUnique({
      where: { id: companyId }
      // Ghi chú: Có thể bạn muốn loại bỏ 1 số trường nhạy cảm (nếu có)
      // select: { id: true, name: true, description: true, logo_url: true, size: true, metadata: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return company
  }
}
