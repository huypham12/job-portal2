import { prisma } from '@/config/database.service'
import { S3Service } from '@/api/uploads/services/s3.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import puppeteer from 'puppeteer'
import * as pdfParse from 'pdf-parse'
import { v4 as uuidv4 } from 'uuid'
import { CV_THEMES, getThemeById, getAllThemes, type CVTheme } from '@/shared/constants/cv-themes'

export interface CreateResumeDto {
  title: string
  content?: any
  is_default?: boolean
  is_public?: boolean
  status?: string
}

export interface CreateResumeFromProfileDto {
  title: string
  theme?: string
  is_default?: boolean
  is_public?: boolean
}

export interface DuplicateResumeDto {
  title: string
  modifications?: {
    skills?: string[]
    experiences?: string[]
    educations?: string[]
    certifications?: string[]
    awards?: string[]
  }
}

export interface UpdateResumeDto {
  title?: string
  content?: any
  layout_settings?: {
    sections_order?: string[]
    theme?: string
    custom_css?: Record<string, any>
  }
  is_public?: boolean
  status?: string
}

export interface UploadResumeDto {
  title?: string
  auto_parse?: boolean
  is_default?: boolean
}

export interface ExportResumeDto {
  template?: 'modern' | 'classic' | 'minimal' | 'professional'
  format?: 'pdf' | 'html'
}

export class ResumeService {
  private s3Service: S3Service

  constructor() {
    this.s3Service = new S3Service()
  }

  /**
   * Tạo CV từ đầu (manual input from profile data)
   */
  async createResume(userId: string, dto: CreateResumeDto) {
    // Lấy profile của user
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        skills: {
          include: { skills: true }
        },
        experiences: true,
        educations: true,
        certifications: true,
        awards: true
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Nếu set làm default, unset tất cả resume default cũ
    if (dto.is_default) {
      await prisma.resumes.updateMany({
        where: {
          profile_id: profile.id,
          is_default: true
        },
        data: { is_default: false }
      })
    }

    // Tạo resume mới
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profile.id,
        title: dto.title,
        source_type: 'created',
        content: dto.content || this.buildResumeContent(profile),
        is_default: dto.is_default || false,
        is_public: dto.is_public || false,
        status: dto.status || 'draft'
      }
    })

    return resume
  }

  /**
   * Get available CV themes
   */
  async getAvailableThemes(): Promise<CVTheme[]> {
    return getAllThemes()
  }

  /**
   * Lấy danh sách CV của user
   */
  async getResumes(userId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resumes = await prisma.resumes.findMany({
      where: { profile_id: profile.id },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
      select: {
        id: true,
        title: true,
        source_type: true,
        file_url: true,
        file_name: true,
        is_default: true,
        is_public: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    })

    return resumes
  }

  /**
   * Lấy profile data formatted cho việc tạo CV
   */
  async getProfileData(userId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        users: {
          select: {
            email: true
          }
        },
        skills: {
          include: {
            skills: true
          }
        },
        experiences: {
          orderBy: {
            start_date: 'desc'
          }
        },
        educations: {
          orderBy: {
            start_date: 'desc'
          }
        },
        certifications: {
          orderBy: {
            issue_date: 'desc'
          }
        },
        awards: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    return {
      profile_id: profile.id,
      sections: {
        personal_info: {
          selectable: false,
          data: {
            full_name: profile.full_name,
            email: profile.users?.email,
            phone: profile.phone_number,
            bio: profile.bio,
            location: profile.location_text,
            headline: profile.headline,
            linkedin_url: profile.linkedin_url,
            website: profile.personal_website,
            date_of_birth: profile.date_of_birth
          }
        },
        skills: {
          selectable: true,
          items:
            profile.skills?.map((ps) => ({
              id: ps.skill_id,
              name: ps.skills.name,
              proficiency_level: ps.level
            })) || []
        },
        experiences: {
          selectable: true,
          items:
            profile.experiences?.map((exp) => ({
              id: exp.id,
              job_title: exp.position,
              company_name: exp.company_name,
              start_date: exp.start_date,
              end_date: exp.end_date,
              is_current: exp.is_current,
              description: exp.description
            })) || []
        },
        educations: {
          selectable: true,
          items:
            profile.educations?.map((edu) => ({
              id: edu.id,
              institution_name: edu.school_name,
              degree: edu.degree,
              field_of_study: edu.field_of_study,
              start_date: edu.start_date,
              end_date: edu.end_date
            })) || []
        },
        certifications: {
          selectable: true,
          items:
            profile.certifications?.map((cert) => ({
              id: cert.id,
              name: cert.name,
              issuing_organization: cert.issuing_org,
              issue_date: cert.issue_date,
              expiration_date: cert.expiry_date,
              credential_id: cert.credential_id,
              credential_url: cert.credential_url
            })) || []
        },
        awards: {
          selectable: true,
          items:
            profile.awards?.map((award) => ({
              id: award.id,
              title: award.title,
              issuer: award.issuer,
              date: award.date,
              description: award.description
            })) || []
        }
      }
    }
  }

  /**
   * Tạo CV từ profile - Include ALL profile data
   */
  async createResumeFromProfile(userId: string, dto: CreateResumeFromProfileDto) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        users: {
          select: {
            email: true
          }
        },
        skills: {
          include: {
            skills: true
          }
        },
        experiences: {
          orderBy: {
            start_date: 'desc'
          }
        },
        educations: {
          orderBy: {
            start_date: 'desc'
          }
        },
        certifications: {
          orderBy: {
            issue_date: 'desc'
          }
        },
        awards: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Build content with ALL profile data
    const content: any = {
      personal_info: {
        full_name: profile.full_name,
        email: profile.users?.email,
        phone: profile.phone_number,
        bio: profile.bio,
        location: profile.location_text,
        headline: profile.headline,
        linkedin_url: profile.linkedin_url,
        website: profile.personal_website,
        date_of_birth: profile.date_of_birth
      }
    }

    // Add ALL skills
    if (profile.skills && profile.skills.length > 0) {
      content.skills = profile.skills.map((ps) => ({
        name: ps.skills.name,
        proficiency_level: ps.level
      }))
    }

    // Add ALL experiences
    if (profile.experiences && profile.experiences.length > 0) {
      content.experiences = profile.experiences.map((exp) => ({
        job_title: exp.position,
        company_name: exp.company_name,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current,
        description: exp.description
      }))
    }

    // Add ALL educations
    if (profile.educations && profile.educations.length > 0) {
      content.educations = profile.educations.map((edu) => ({
        institution_name: edu.school_name,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_date: edu.start_date,
        end_date: edu.end_date
      }))
    }

    // Add ALL certifications
    if (profile.certifications && profile.certifications.length > 0) {
      content.certifications = profile.certifications.map((cert) => ({
        name: cert.name,
        issuing_organization: cert.issuing_org,
        issue_date: cert.issue_date,
        expiration_date: cert.expiry_date,
        credential_id: cert.credential_id,
        credential_url: cert.credential_url
      }))
    }

    // Add ALL awards
    if (profile.awards && profile.awards.length > 0) {
      content.awards = profile.awards.map((award) => ({
        title: award.title,
        issuer: award.issuer,
        date: award.date,
        description: award.description
      }))
    }

    // Build default sections order based on available data
    const sections = ['personal_info']
    if (content.skills) sections.push('skills')
    if (content.experiences) sections.push('experiences')
    if (content.educations) sections.push('educations')
    if (content.certifications) sections.push('certifications')
    if (content.awards) sections.push('awards')

    // Add layout settings
    content.layout_settings = {
      sections_order: sections,
      theme: dto.theme || 'default'
    }

    // Unset default if needed
    if (dto.is_default) {
      await prisma.resumes.updateMany({
        where: {
          profile_id: profile.id,
          is_default: true
        },
        data: { is_default: false }
      })
    }

    // Create resume
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profile.id,
        title: dto.title,
        source_type: 'created',
        content: content,
        is_default: dto.is_default || false,
        is_public: dto.is_public || false,
        status: 'draft'
      }
    })

    return resume
  }

  /**
   * Lấy chi tiết 1 CV
   */
  async getResumeById(userId: string, resumeId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    return resume
  }

  /**
   * Cập nhật CV
   */
  async updateResume(userId: string, resumeId: string, dto: UpdateResumeDto) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Merge layout_settings into content if provided
    let updatedContent = dto.content ? dto.content : resume.content
    if (dto.layout_settings && updatedContent) {
      updatedContent = {
        ...updatedContent,
        layout_settings: dto.layout_settings
      }
    }

    const updatedResume = await prisma.resumes.update({
      where: { id: resumeId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(updatedContent && { content: updatedContent }),
        ...(dto.is_public !== undefined && { is_public: dto.is_public }),
        ...(dto.status && { status: dto.status })
      }
    })

    return updatedResume
  }

  /**
   * Đặt CV làm mặc định
   */
  async setDefaultResume(userId: string, resumeId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Unset tất cả default cũ
    await prisma.resumes.updateMany({
      where: {
        profile_id: profile.id,
        is_default: true
      },
      data: { is_default: false }
    })

    // Set resume này làm default
    const updatedResume = await prisma.resumes.update({
      where: { id: resumeId },
      data: { is_default: true }
    })

    return updatedResume
  }

  /**
   * Xóa CV
   */
  async deleteResume(userId: string, resumeId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Xóa file trên S3 nếu có
    if (resume.file_url) {
      try {
        const key = this.s3Service.extractKeyFromUrl(resume.file_url)
        if (key) {
          await this.s3Service.deleteFile(key)
        }
      } catch (error) {
        console.error('Failed to delete file from S3:', error)
        // Không throw error, vẫn tiếp tục xóa record
      }
    }

    // Xóa resume
    await prisma.resumes.delete({
      where: { id: resumeId }
    })

    return { message: 'Resume deleted successfully' }
  }

  /**
   * Upload CV file
   */
  async uploadResume(userId: string, file: Express.Multer.File, dto: UploadResumeDto) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpError('Invalid file type. Only PDF and DOCX files are allowed.', HTTP_STATUS.BAD_REQUEST)
    }

    // Upload file to S3
    const uploadResult = await this.s3Service.uploadFile({
      file,
      folder: `resumes/${profile.id}`,
      filename: `${uuidv4()}-${file.originalname}`
    })

    // Parse PDF nếu cần
    let parsedContent = null
    if (dto.auto_parse && file.mimetype === 'application/pdf') {
      try {
        parsedContent = await this.parsePdfResume(file.buffer)
      } catch (error) {
        console.error('Failed to parse PDF:', error)
        // Không throw error, vẫn tạo resume
      }
    }

    // Nếu set làm default, unset tất cả resume default cũ
    if (dto.is_default) {
      await prisma.resumes.updateMany({
        where: {
          profile_id: profile.id,
          is_default: true
        },
        data: { is_default: false }
      })
    }

    // Tạo resume record
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profile.id,
        title: dto.title || file.originalname,
        source_type: 'uploaded',
        file_url: uploadResult.url,
        file_name: uploadResult.originalFilename,
        file_size: uploadResult.size,
        mime_type: uploadResult.mimeType,
        content: parsedContent as any,
        is_default: dto.is_default === true,
        status: 'active'
      }
    })

    return {
      resume,
      uploadResult
    }
  }

  /**
   * Download CV file
   * Auto-generate PDF nếu resume chưa có file_url
   */
  async downloadResume(userId: string, resumeId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Nếu chưa có file_url → auto-generate PDF và lưu
    let fileUrl = resume.file_url
    if (!fileUrl || (resume.source_type === 'created' && !fileUrl)) {
      fileUrl = await this.ensureResumeHasPdf(userId, resumeId)
    }

    if (!fileUrl) {
      throw new HttpError('Resume file not found', HTTP_STATUS.NOT_FOUND)
    }

    return {
      url: fileUrl,
      filename: resume.file_name || 'resume.pdf'
    }
  }

  /**
   * Export CV to PDF
   */
  async exportResume(userId: string, resumeId: string, dto: ExportResumeDto) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        skills: {
          include: { skills: true }
        },
        experiences: true,
        educations: true,
        certifications: true,
        awards: true
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Generate HTML từ template
    const html = this.generateResumeHtml(resume, profile, dto.template || 'modern')

    if (dto.format === 'html') {
      return {
        content: html,
        contentType: 'text/html'
      }
    }

    // Generate PDF từ HTML
    const pdfBuffer = await this.generatePdfFromHtml(html)

    // Upload PDF lên S3
    const uploadResult = await this.s3Service.uploadFile({
      file: {
        buffer: pdfBuffer,
        originalname: `${resume.title}.pdf`,
        mimetype: 'application/pdf',
        size: pdfBuffer.length
      } as Express.Multer.File,
      folder: `resumes/${profile.id}/exports`,
      filename: `${uuidv4()}-${resume.title}.pdf`
    })

    // Lưu file_url vào database để cache
    await prisma.resumes.update({
      where: { id: resumeId },
      data: {
        file_url: uploadResult.url,
        file_name: `${resume.title}.pdf`,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf'
      }
    })

    return {
      url: uploadResult.url,
      filename: `${resume.title}.pdf`,
      contentType: 'application/pdf'
    }
  }

  /**
   * Preview CV
   */
  async previewResume(userId: string, resumeId: string) {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        skills: {
          include: { skills: true }
        },
        experiences: true,
        educations: true,
        certifications: true,
        awards: true
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Generate HTML preview
    const html = this.generateResumeHtml(resume, profile, 'modern')

    return {
      content: html,
      contentType: 'text/html'
    }
  }

  /**
   * Helper: Build resume content từ profile data
   */
  private buildResumeContent(profile: any) {
    return {
      personal_info: {
        full_name: profile.full_name,
        email: profile.users?.email,
        phone: profile.phone_number,
        location: profile.location,
        bio: profile.bio
      },
      skills: profile.skills?.map((ps: any) => ({
        name: ps.skills.name,
        proficiency: ps.proficiency_level
      })),
      experiences: profile.experiences?.map((exp: any) => ({
        title: exp.job_title,
        company: exp.company_name,
        location: exp.location,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current,
        description: exp.description
      })),
      educations: profile.educations?.map((edu: any) => ({
        institution: edu.institution_name,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_date: edu.start_date,
        end_date: edu.end_date,
        description: edu.description
      })),
      certifications: profile.certifications?.map((cert: any) => ({
        name: cert.name,
        issuing_organization: cert.issuing_organization,
        issue_date: cert.issue_date,
        expiration_date: cert.expiration_date,
        credential_id: cert.credential_id,
        credential_url: cert.credential_url
      })),
      awards: profile.awards?.map((award: any) => ({
        title: award.title,
        issuer: award.issuer,
        date: award.date,
        description: award.description
      }))
    }
  }

  /**
   * Helper: Parse PDF resume
   */
  private async parsePdfResume(buffer: Buffer) {
    try {
      const data = await (pdfParse as any)(buffer)
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      }
    } catch (error) {
      console.error('PDF parse error:', error)
      return null
    }
  }

  /**
   * Helper: Generate HTML from resume template
   */
  private generateResumeHtml(resume: any, profile: any, template: string): string {
    const content = resume.content || this.buildResumeContent(profile)
    const layoutSettings = content.layout_settings || {}
    const theme = layoutSettings.theme || 'professional'

    // Route to appropriate template generator
    // Note: Backend templates are for PDF export only, frontend uses React components
    switch (theme) {
      case 'timeline':
      case 'compact':
      case 'professional':
      default:
        return this.generateModernTemplate(resume, content)
    }
  }

  /**
   * Helper: Generate Modern Template (Sidebar Layout)
   */
  private generateModernTemplate(resume: any, content: any): string {
    const themeColors = this.getThemeColors('modern')

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${resume.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: #f7fafc;
            padding: 20px;
          }

          .resume-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            overflow: hidden;
          }

          /* Sidebar */
          .sidebar {
            width: 280px;
            background: linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%);
            color: white;
            padding: 40px 30px;
            flex-shrink: 0;
          }

          .profile-photo {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: white;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: 700;
            color: ${themeColors.primary};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .sidebar h1 {
            font-family: 'Poppins', sans-serif;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.2;
          }

          .sidebar-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }

          .sidebar-section:first-of-type {
            margin-top: 20px;
            padding-top: 0;
            border-top: none;
          }

          .sidebar-section h3 {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 15px;
            opacity: 0.9;
          }

          .contact-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 13px;
            line-height: 1.4;
          }

          .contact-item i {
            width: 20px;
            margin-right: 10px;
            opacity: 0.9;
            font-size: 14px;
          }

          .contact-item a {
            color: white;
            text-decoration: none;
          }

          .skill-item {
            margin-bottom: 12px;
          }

          .skill-name {
            font-size: 13px;
            margin-bottom: 6px;
            font-weight: 500;
          }

          .skill-level {
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            overflow: hidden;
          }

          .skill-level-fill {
            height: 100%;
            background: white;
            border-radius: 3px;
            transition: width 0.3s ease;
          }

          /* Main Content */
          .main-content {
            flex: 1;
            padding: 40px 45px;
            overflow: hidden;
          }

          .bio {
            font-size: 14px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
            text-align: justify;
          }

          .section {
            margin-bottom: 35px;
          }

          .section-title {
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: ${themeColors.primary};
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 3px solid ${themeColors.primary};
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .section-title i {
            font-size: 20px;
          }

          .timeline-item {
            position: relative;
            padding-left: 25px;
            margin-bottom: 25px;
            border-left: 2px solid #e2e8f0;
          }

          .timeline-item:last-child {
            margin-bottom: 0;
          }

          .timeline-item::before {
            content: '';
            position: absolute;
            left: -6px;
            top: 6px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${themeColors.primary};
            border: 2px solid white;
            box-shadow: 0 0 0 2px ${themeColors.primary};
          }

          .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 15px;
          }

          .timeline-title {
            font-size: 15px;
            font-weight: 600;
            color: #1a202c;
            line-height: 1.3;
          }

          .timeline-subtitle {
            font-size: 14px;
            color: ${themeColors.primary};
            font-weight: 500;
            margin-bottom: 4px;
          }

          .timeline-date {
            font-size: 12px;
            color: #718096;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .timeline-date i {
            font-size: 11px;
          }

          .timeline-description {
            font-size: 13px;
            color: #4a5568;
            line-height: 1.6;
            margin-top: 8px;
          }

          .certification-item,
          .award-item {
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 3px solid ${themeColors.primary};
          }

          .cert-name,
          .award-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 4px;
          }

          .cert-issuer,
          .award-issuer {
            font-size: 13px;
            color: ${themeColors.primary};
            margin-bottom: 4px;
          }

          .cert-date,
          .award-date {
            font-size: 12px;
            color: #718096;
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .cert-date i,
          .award-date i {
            font-size: 11px;
          }

          .cert-credential {
            font-size: 12px;
            color: #718096;
            margin-top: 6px;
          }

          .cert-credential a {
            color: ${themeColors.primary};
            text-decoration: none;
            font-weight: 500;
          }

          /* Responsive */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .resume-container {
              box-shadow: none;
              max-width: 100%;
              min-height: auto;
            }
          }

          @media (max-width: 768px) {
            .resume-container {
              flex-direction: column;
            }
            .sidebar {
              width: 100%;
            }
            .main-content {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          <!-- Sidebar -->
          <div class="sidebar">
            ${this.generateSidebarContent(content, themeColors)}
          </div>

          <!-- Main Content -->
          <div class="main-content">
            ${this.generateMainContent(content, themeColors)}
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Helper: Get theme colors from shared constants
   */
  private getThemeColors(theme: string) {
    const themeData = getThemeById(theme)
    return themeData.colors
  }

  /**
   * Helper: Generate sidebar content
   */
  private generateSidebarContent(content: any, themeColors: any): string {
    const personalInfo = content.personal_info || {}
    const skills = content.skills || []

    // Get initials for profile photo
    const initials = personalInfo.full_name
      ? personalInfo.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2)
      : 'CV'

    return `
      <div class="profile-photo">${initials}</div>
      <h1>${personalInfo.full_name || 'Your Name'}</h1>

      ${
        personalInfo.email || personalInfo.phone
          ? `
        <div class="sidebar-section">
          <h3>Contact</h3>
          ${
            personalInfo.email
              ? `
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <a href="mailto:${personalInfo.email}">${personalInfo.email}</a>
            </div>
          `
              : ''
          }
          ${
            personalInfo.phone
              ? `
            <div class="contact-item">
              <i class="fas fa-phone"></i>
              <span>${personalInfo.phone}</span>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      ${
        skills.length > 0
          ? `
        <div class="sidebar-section">
          <h3>Skills</h3>
          ${skills
            .map((skill: any) => {
              const level = this.getSkillLevel(skill.proficiency_level)
              return `
              <div class="skill-item">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-level">
                  <div class="skill-level-fill" style="width: ${level}%"></div>
                </div>
              </div>
            `
            })
            .join('')}
        </div>
      `
          : ''
      }
    `
  }

  /**
   * Helper: Generate main content
   */
  private generateMainContent(content: any, themeColors: any): string {
    const personalInfo = content.personal_info || {}
    const experiences = content.experiences || []
    const educations = content.educations || []
    const certifications = content.certifications || []
    const awards = content.awards || []

    return `
      ${
        personalInfo.bio
          ? `
        <div class="bio">${personalInfo.bio}</div>
      `
          : ''
      }

      ${
        experiences.length > 0
          ? `
        <div class="section">
          <h2 class="section-title">
            <i class="fas fa-briefcase"></i>
            Work Experience
          </h2>
          ${experiences
            .map(
              (exp: any) => `
            <div class="timeline-item">
              <div class="timeline-header">
                <div>
                  <div class="timeline-title">${exp.job_title || 'Position'}</div>
                  <div class="timeline-subtitle">${exp.company_name || 'Company'}</div>
                </div>
                <div class="timeline-date">
                  <i class="far fa-calendar"></i>
                  ${this.formatDate(exp.start_date)} - ${exp.is_current ? 'Present' : this.formatDate(exp.end_date)}
                </div>
              </div>
              ${exp.description ? `<div class="timeline-description">${exp.description}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        educations.length > 0
          ? `
        <div class="section">
          <h2 class="section-title">
            <i class="fas fa-graduation-cap"></i>
            Education
          </h2>
          ${educations
            .map(
              (edu: any) => `
            <div class="timeline-item">
              <div class="timeline-header">
                <div>
                  <div class="timeline-title">${edu.degree || 'Degree'}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</div>
                  <div class="timeline-subtitle">${edu.institution_name || 'Institution'}</div>
                </div>
                <div class="timeline-date">
                  <i class="far fa-calendar"></i>
                  ${this.formatDate(edu.start_date)} - ${this.formatDate(edu.end_date)}
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        certifications.length > 0
          ? `
        <div class="section">
          <h2 class="section-title">
            <i class="fas fa-certificate"></i>
            Certifications
          </h2>
          ${certifications
            .map(
              (cert: any) => `
            <div class="certification-item">
              <div class="cert-name">${cert.name}</div>
              <div class="cert-issuer">${cert.issuing_organization}</div>
              <div class="cert-date">
                <i class="far fa-calendar"></i>
                Issued ${this.formatDate(cert.issue_date)}${cert.expiration_date ? ` - Expires ${this.formatDate(cert.expiration_date)}` : ''}
              </div>
              ${
                cert.credential_id || cert.credential_url
                  ? `
                <div class="cert-credential">
                  ${cert.credential_id ? `Credential ID: ${cert.credential_id}` : ''}
                  ${cert.credential_url ? `<a href="${cert.credential_url}" target="_blank">View Certificate</a>` : ''}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        awards.length > 0
          ? `
        <div class="section">
          <h2 class="section-title">
            <i class="fas fa-trophy"></i>
            Awards & Honors
          </h2>
          ${awards
            .map(
              (award: any) => `
            <div class="award-item">
              <div class="award-title">${award.title}</div>
              <div class="award-issuer">${award.issuer}</div>
              <div class="award-date">
                <i class="far fa-calendar"></i>
                ${this.formatDate(award.date)}
              </div>
              ${award.description ? `<div class="timeline-description" style="margin-top: 8px;">${award.description}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
    `
  }

  /**
   * Helper: Get skill level percentage
   */
  private getSkillLevel(level: string | null): number {
    const levels: Record<string, number> = {
      beginner: 30,
      intermediate: 60,
      advanced: 85,
      expert: 100
    }
    return level ? levels[level.toLowerCase()] || 70 : 70
  }

  /**
   * Helper: Format date
   */
  private formatDate(date: any): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  /**
   * Generate PDF và upload lên S3, lưu vào resume.file_url
   * @returns file_url của PDF đã upload
   */
  private async generateAndSaveResumePdf(resume: any, profile: any, template: string = 'modern'): Promise<string> {
    // Generate HTML từ template
    const html = this.generateResumeHtml(resume, profile, template)

    // Generate PDF từ HTML
    const pdfBuffer = await this.generatePdfFromHtml(html)

    // Upload PDF lên S3
    const uploadResult = await this.s3Service.uploadFile({
      file: {
        buffer: pdfBuffer,
        originalname: `${resume.title}.pdf`,
        mimetype: 'application/pdf',
        size: pdfBuffer.length
      } as Express.Multer.File,
      folder: `resumes/${profile.id}/generated`,
      filename: `${resume.id}-${Date.now()}.pdf`
    })

    // Update resume với file_url
    await prisma.resumes.update({
      where: { id: resume.id },
      data: {
        file_url: uploadResult.url,
        file_name: `${resume.title}.pdf`,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf'
      }
    })

    return uploadResult.url
  }

  /**
   * Đảm bảo resume có file_url (generate nếu chưa có)
   */
  private async ensureResumeHasPdf(userId: string, resumeId: string, template?: string): Promise<string> {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        skills: {
          include: { skills: true }
        },
        experiences: true,
        educations: true,
        certifications: true,
        awards: true
      }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const resume = await prisma.resumes.findFirst({
      where: {
        id: resumeId,
        profile_id: profile.id
      }
    })

    if (!resume) {
      throw new HttpError('Resume not found', HTTP_STATUS.NOT_FOUND)
    }

    // Nếu đã có file_url và source_type là 'uploaded' → dùng luôn
    if (resume.file_url && resume.source_type === 'uploaded') {
      return resume.file_url
    }

    // Nếu đã có file_url và source_type là 'created' → kiểm tra content có thay đổi không
    // (Có thể thêm content_hash để check chính xác hơn)
    if (resume.file_url && resume.source_type === 'created') {
      // Tạm thời dùng lại file cũ, có thể cải thiện bằng content hash
      return resume.file_url
    }

    // Chưa có file_url → generate mới
    return await this.generateAndSaveResumePdf(resume, profile, template || 'modern')
  }

  /**
   * Public method để ensure resume có PDF (dùng khi ứng tuyển)
   */
  async ensureResumePdfForApplication(userId: string, resumeId: string): Promise<void> {
    await this.ensureResumeHasPdf(userId, resumeId)
  }

  /**
   * Helper: Generate PDF from HTML using Puppeteer
   */
  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    try {
      const page = await browser.newPage()

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1697, // A4 aspect ratio at 96 DPI
        deviceScaleFactor: 2 // High DPI for better quality
      })

      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Wait for all fonts to load
      await page.evaluateHandle('document.fonts.ready')

      // Additional wait for any dynamic content
      await new Promise((resolve) => setTimeout(resolve, 500))

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        // High quality settings
        scale: 1,
        tagged: true // For accessibility
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}
