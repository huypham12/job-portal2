import { prisma } from '@/config/database.service'
import {
  CreateCompanyBody,
  UpdateCompanyBody,
  CompanyDetailsBody,
  UpdateCompanyDetailsBody,
  CompanyBenefitBody,
  UpdateCompanyBenefitBody
} from './company.validator'
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
   * @param includeDetails Có include thông tin chi tiết không
   */
  async getCompanyByRecruiter(recruiterId: string, includeDetails = false) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      include: includeDetails
        ? {
            company_details: true,
            company_benefits: true
          }
        : undefined
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
   * @param includeDetails Có include thông tin chi tiết không
   */
  async getCompanyById(companyId: string, includeDetails = true) {
    if (includeDetails) {
      // Với đầy đủ thông tin chi tiết
      const company = await prisma.companies.findUnique({
        where: { id: companyId },
        include: {
          company_details: true,
          company_benefits: true,
          jobs: {
            where: { status: 'approved', deleted: false },
            select: {
              id: true,
              title: true,
              posted_at: true,
              expires_at: true,
              job_type: true,
              salary_range: true
            }
          }
        }
      })

      if (!company) {
        throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Loại bỏ các trường nhạy cảm cho public API
      const { recruiter_id, tax_code, business_license, is_verified, verification_date, ...publicCompanyData } = company
      return publicCompanyData
    } else {
      // Chỉ thông tin cơ bản
      const company = await prisma.companies.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          description: true,
          logo_url: true,
          size: true,
          created_at: true,
          contact_email: true,
          contact_phone: true,
          linkedin_url: true,
          facebook_url: true,
          twitter_url: true
        }
      })

      if (!company) {
        throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      return company
    }
  }

  /**
   * Cập nhật hoặc tạo mới thông tin chi tiết công ty
   * @param recruiterId ID của nhà tuyển dụng
   * @param detailsData Dữ liệu chi tiết công ty
   */
  async updateCompanyDetails(recruiterId: string, detailsData: CompanyDetailsBody) {
    // Lấy company_id từ recruiter_id
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return await prisma.company_details.upsert({
      where: { company_id: company.id },
      update: detailsData,
      create: {
        company_id: company.id,
        ...detailsData
      }
    })
  }

  /**
   * Thêm phúc lợi cho công ty
   * @param recruiterId ID của nhà tuyển dụng
   * @param benefitData Dữ liệu phúc lợi
   */
  async addCompanyBenefit(recruiterId: string, benefitData: CompanyBenefitBody) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return await prisma.company_benefits.create({
      data: {
        company_id: company.id,
        ...benefitData
      }
    })
  }

  /**
   * Cập nhật phúc lợi của công ty
   * @param recruiterId ID của nhà tuyển dụng
   * @param benefitId ID của phúc lợi
   * @param benefitData Dữ liệu cập nhật
   */
  async updateCompanyBenefit(recruiterId: string, benefitId: string, benefitData: UpdateCompanyBenefitBody) {
    // Kiểm tra quyền sở hữu
    const benefit = await prisma.company_benefits.findFirst({
      where: {
        id: benefitId,
        companies: { recruiter_id: recruiterId }
      }
    })

    if (!benefit) {
      throw new HttpError('Không tìm thấy phúc lợi hoặc không có quyền chỉnh sửa', HTTP_STATUS.NOT_FOUND)
    }

    return await prisma.company_benefits.update({
      where: { id: benefitId },
      data: benefitData
    })
  }

  /**
   * Xóa phúc lợi của công ty
   * @param recruiterId ID của nhà tuyển dụng
   * @param benefitId ID của phúc lợi
   */
  async deleteCompanyBenefit(recruiterId: string, benefitId: string) {
    const benefit = await prisma.company_benefits.findFirst({
      where: {
        id: benefitId,
        companies: { recruiter_id: recruiterId }
      }
    })

    if (!benefit) {
      throw new HttpError('Không tìm thấy phúc lợi hoặc không có quyền xóa', HTTP_STATUS.NOT_FOUND)
    }

    return await prisma.company_benefits.delete({
      where: { id: benefitId }
    })
  }

  /**
   * Lấy thông tin chi tiết công ty của nhà tuyển dụng
   * @param recruiterId ID của nhà tuyển dụng
   */
  async getCompanyDetailsByRecruiter(recruiterId: string) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      include: { company_details: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return company.company_details
  }

  /**
   * Tạo thông tin chi tiết công ty mới
   * @param recruiterId ID của nhà tuyển dụng
   * @param detailsData Dữ liệu chi tiết công ty
   */
  async createCompanyDetails(recruiterId: string, detailsData: CompanyDetailsBody) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Kiểm tra xem đã có company_details chưa
    const existingDetails = await prisma.company_details.findUnique({
      where: { company_id: company.id }
    })

    if (existingDetails) {
      throw new HttpError('Thông tin chi tiết công ty đã tồn tại', HTTP_STATUS.CONFLICT)
    }

    return await prisma.company_details.create({
      data: {
        company_id: company.id,
        ...detailsData
      }
    })
  }

  /**
   * Xóa thông tin chi tiết công ty
   * @param recruiterId ID của nhà tuyển dụng
   */
  async deleteCompanyDetails(recruiterId: string) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    try {
      return await prisma.company_details.delete({
        where: { company_id: company.id }
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new HttpError('Không tìm thấy thông tin chi tiết công ty để xóa', HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * Lấy danh sách phúc lợi công ty của nhà tuyển dụng
   * @param recruiterId ID của nhà tuyển dụng
   */
  async getCompanyBenefitsByRecruiter(recruiterId: string) {
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: recruiterId },
      include: { company_benefits: true }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return company.company_benefits
  }
}
