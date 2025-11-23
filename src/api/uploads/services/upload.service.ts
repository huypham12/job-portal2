import { prisma } from '@/config/database.service'
import { S3Service, S3UploadParams, S3UploadResult } from './s3.service'
import { HttpError } from '@/shared/common/http-error'
import { MESSAGES } from '@/shared/constants/messages'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'

export enum UploadType {
  AVATAR = 'avatar',
  COMPANY_LOGO = 'company-logo',
  RESUME = 'resume',
  APPLICATION_DOCUMENT = 'application-document'
}

export interface UploadAvatarParams {
  file: Express.Multer.File
  userId: string
}

export interface UploadCompanyLogoParams {
  file: Express.Multer.File
  companyId: string
  userId: string // để check ownership
}

export interface UploadResumeParams {
  file: Express.Multer.File
  profileId: string
  userId: string // để check ownership
}

export interface UploadApplicationDocumentParams {
  file: Express.Multer.File
  applicationId: string
  documentType: string
  userId: string // để check ownership
}

export class UploadService {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * Upload profile avatar
   * Thay thế avatar cũ bằng avatar mới và xóa avatar cũ khỏi S3
   */
  async uploadAvatar(params: UploadAvatarParams): Promise<{ url: string }> {
    const { file, userId } = params

    // Kiểm tra profile tồn tại và thuộc về user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Lấy avatar_url hiện tại từ database (cast để tránh type error)
    const currentAvatarUrl = (profile as any).avatar_url as string | null
    let oldKey: string | null = null

    // Lưu key của avatar cũ để xóa sau
    if (currentAvatarUrl) {
      oldKey = this.s3Service.extractKeyFromUrl(currentAvatarUrl)
    }

    // Upload file mới trước (để đảm bảo nếu upload thất bại thì avatar cũ vẫn còn)
    // Cấu trúc thư mục: avatars/{userId}/file.ext
    const uploadResult = await this.s3Service.uploadFile({
      file,
      folder: `avatars/${userId}`
    })

    try {
      // Cập nhật avatar_url trong database (dùng cast để tránh type error)
      await prisma.profiles.update({
        where: { user_id: userId },
        data: { avatar_url: uploadResult.url } as any
      })

      // Sau khi cập nhật database thành công, xóa avatar cũ khỏi S3
      if (oldKey) {
        try {
          await this.s3Service.deleteFile(oldKey)
        } catch (error) {
          // Log error nhưng không throw vì avatar mới đã được upload và database đã được cập nhật
          console.error('Failed to delete old avatar from S3:', error)
          // Có thể thêm logic retry hoặc queue để xóa sau nếu cần
        }
      }

      return { url: uploadResult.url }
    } catch (error) {
      // Nếu cập nhật database thất bại, xóa file mới đã upload để tránh orphan files
      try {
        const newKey = this.s3Service.extractKeyFromUrl(uploadResult.url)
        if (newKey) {
          await this.s3Service.deleteFile(newKey)
        }
      } catch (deleteError) {
        console.error('Failed to delete newly uploaded avatar after database update failure:', deleteError)
      }
      throw error
    }
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(params: UploadCompanyLogoParams): Promise<{ url: string }> {
    const { file, companyId, userId } = params

    // Kiểm tra company tồn tại và thuộc về user
    const company = await prisma.companies.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      throw new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (company.recruiter_id !== userId) {
      throw new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN)
    }

    // Xóa logo cũ nếu có
    if (company.logo_url) {
      const oldKey = this.s3Service.extractKeyFromUrl(company.logo_url)
      if (oldKey) {
        try {
          await this.s3Service.deleteFile(oldKey)
        } catch (error) {
          console.error('Failed to delete old logo:', error)
        }
      }
    }

    // Upload file mới
    // Cấu trúc thư mục: companies/{companyId}/logos/file.ext
    const uploadResult = await this.s3Service.uploadFile({
      file,
      folder: `companies/${companyId}/logos`
    })

    // Cập nhật logo_url trong database
    await prisma.companies.update({
      where: { id: companyId },
      data: { logo_url: uploadResult.url }
    })

    return { url: uploadResult.url }
  }

  /**
   * Upload resume file
   */
  async uploadResume(params: UploadResumeParams): Promise<{ url: string; resumeId: string }> {
    const { file, profileId, userId } = params

    // Kiểm tra profile tồn tại và thuộc về user
    const profile = await prisma.profiles.findUnique({
      where: { id: profileId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    if (profile.user_id !== userId) {
      throw new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN)
    }

    // Upload file
    // Cấu trúc thư mục: resumes/{profileId}/file.ext
    const uploadResult = await this.s3Service.uploadFile({
      file,
      folder: `resumes/${profileId}`
    })

    // Tạo hoặc cập nhật resume trong database
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profileId,
        file_url: uploadResult.url
      }
    })

    return { url: uploadResult.url, resumeId: resume.id }
  }

  /**
   * Upload application document
   */
  async uploadApplicationDocument(
    params: UploadApplicationDocumentParams
  ): Promise<{ url: string; documentId: string }> {
    const { file, applicationId, documentType, userId } = params

    // Kiểm tra application tồn tại
    const application = await prisma.applications.findUnique({
      where: { id: applicationId }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Kiểm tra profile.user_id
    const profile = await prisma.profiles.findUnique({
      where: { id: application.profile_id }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    if (profile.user_id !== userId) {
      throw new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN)
    }

    // Upload file với cấu trúc thư mục theo document type
    // Format: applications/{applicationId}/{documentType}/file.ext
    const uploadResult = await this.s3Service.uploadFile({
      file,
      folder: `applications/${applicationId}/${documentType}`
    })

    // Tạo document record trong database
    const document = await prisma.application_documents.create({
      data: {
        application_id: applicationId,
        document_type: documentType,
        file_url: uploadResult.url,
        original_filename: uploadResult.originalFilename,
        mime_type: uploadResult.mimeType,
        file_size_bytes: BigInt(uploadResult.size)
      }
    })

    return { url: uploadResult.url, documentId: document.id }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileUrl: string, userId: string): Promise<void> {
    const key = this.s3Service.extractKeyFromUrl(fileUrl)
    if (!key) {
      throw new HttpError('Invalid file URL', HTTP_STATUS.BAD_REQUEST)
    }

    // TODO: Thêm logic kiểm tra ownership nếu cần
    // Có thể check trong database xem file có thuộc về user không

    await this.s3Service.deleteFile(key)
  }
}
