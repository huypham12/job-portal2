import { prisma } from '@/config/database.service'
import { S3Service } from '@/api/uploads/services/s3.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { envConfig } from '@/config/getEnvConfig'
import puppeteer from 'puppeteer'
import * as pdfParse from 'pdf-parse'
import { v4 as uuidv4 } from 'uuid'
import { CV_THEMES, getThemeById, getAllThemes, type CVTheme } from '@/shared/constants/cv-themes'
import { UnifiedCVEngine } from '@/shared/templates/unified-cv-engine'

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
  template?: 'timeline' | 'professional' | 'compact'
  format?: 'pdf' | 'html'
  html?: string
  viewportWidth?: number
}

export class ResumeService {
  private s3Service: S3Service

  constructor() {
    this.s3Service = new S3Service()
  }

  /**
   * Validate and normalize resume content structure
   */
  private validateAndNormalizeContent(content: any): any {
    if (!content || typeof content !== 'object') {
      throw new HttpError('Invalid content structure', HTTP_STATUS.BAD_REQUEST)
    }

    const normalizedContent = { ...content }

    // Ensure personal_info exists and has required fields
    if (!normalizedContent.personal_info) {
      normalizedContent.personal_info = {}
    }

    // Ensure layout_settings exists with defaults
    if (!normalizedContent.layout_settings) {
      normalizedContent.layout_settings = {
        theme: 'modern',
        sections_order: ['personal_info']
      }
    } else {
      // Ensure theme has default value
      normalizedContent.layout_settings.theme = normalizedContent.layout_settings.theme || 'modern'
      // Ensure sections_order exists
      normalizedContent.layout_settings.sections_order = normalizedContent.layout_settings.sections_order || [
        'personal_info'
      ]
    }

    // Normalize arrays
    const arrayFields = [
      'skills',
      'experiences',
      'educations',
      'certifications',
      'awards',
      'projects',
      'languages',
      'references'
    ]
    arrayFields.forEach((field) => {
      if (normalizedContent[field] && !Array.isArray(normalizedContent[field])) {
        normalizedContent[field] = []
      }
    })

    return normalizedContent
  }

  /**
   * Tạo CV từ đầu (manual input from profile data)
   */
  async createResume(userId: string, dto: CreateResumeDto) {
    // Lấy profile của user
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        users: {
          select: {
            email: true
          }
        },
        location: true,
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

    // Validate and normalize content
    const normalizedContent = this.validateAndNormalizeContent(dto.content || this.buildResumeContent(profile))

    // Tạo resume mới
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profile.id,
        title: dto.title,
        source_type: 'created',
        content: normalizedContent,
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

    // Return flat structure consistent with createResumeFromProfile
    return {
      profile_id: profile.id,
      personal_info: {
        full_name: profile.full_name,
        email: profile.users?.email,
        phone: profile.phone_number,
        bio: profile.bio,
        // Include additional fields used by frontend completion logic
        desired_job_title: profile.desired_job_title,
        years_of_experience: profile.years_of_experience,
        avatar_url: profile.avatar_url,
        location_id: profile.location_id,
        location: profile.location_text,
        headline: profile.headline,
        linkedin_url: profile.linkedin_url,
        website: profile.personal_website,
        date_of_birth: profile.date_of_birth
      },
      skills:
        profile.skills?.map((ps) => ({
          id: ps.skill_id,
          name: ps.skills.name,
          proficiency_level: ps.level
        })) || [],
      experiences:
        profile.experiences?.map((exp) => ({
          id: exp.id,
          job_title: exp.position,
          company_name: exp.company_name,
          start_date: exp.start_date,
          end_date: exp.end_date,
          is_current: exp.is_current,
          description: exp.description
        })) || [],
      educations:
        profile.educations?.map((edu) => ({
          id: edu.id,
          institution_name: edu.school_name,
          degree: edu.degree,
          field_of_study: edu.field_of_study,
          start_date: edu.start_date,
          end_date: edu.end_date
        })) || [],
      certifications:
        profile.certifications?.map((cert) => ({
          id: cert.id,
          name: cert.name,
          issuing_organization: cert.issuing_org,
          issue_date: cert.issue_date,
          expiration_date: cert.expiry_date,
          credential_id: cert.credential_id,
          credential_url: cert.credential_url
        })) || [],
      awards:
        profile.awards?.map((award) => ({
          id: award.id,
          title: award.title,
          issuer: award.issuer,
          date: award.date,
          description: award.description
        })) || []
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
        location: true,
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

    // Add layout settings within content (unified structure)
    content.layout_settings = {
      sections_order: sections,
      theme: dto.theme || 'modern'
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

    // Validate and normalize content
    const normalizedContent = this.validateAndNormalizeContent(content)

    // Create resume
    const resume = await prisma.resumes.create({
      data: {
        profile_id: profile.id,
        title: dto.title,
        source_type: 'created',
        content: normalizedContent,
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

    // Validate and normalize content if it's being updated
    if (updatedContent) {
      updatedContent = this.validateAndNormalizeContent(updatedContent)
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

    // Validate and normalize content if parsed
    let normalizedContent = null
    if (parsedContent) {
      try {
        normalizedContent = this.validateAndNormalizeContent(parsedContent)
      } catch (error) {
        console.warn('Failed to validate parsed PDF content, using null:', error)
        normalizedContent = null
      }
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
        content: normalizedContent,
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
    try {
      const profile = await prisma.profiles.findFirst({
        where: { user_id: userId },
        include: {
          users: {
            select: {
              email: true
            }
          },
          location: true,
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

      // Always generate HTML from server template to ensure consistent PDF rendering.
      // Frontend-provided HTML (snapshot) will be ignored to avoid mismatches between preview and exported PDF.
      const html = this.generateResumeHtml(resume, profile, dto.template || 'modern')

      console.log('[ExportDebug] final decision: using server template', {
        templateToUse: dto.template || 'generated',
        finalHtmlLength: typeof html === 'string' ? html.length : null
      })

      if (dto.format === 'html') {
        return {
          content: html,
          contentType: 'text/html'
        }
      }

      // Generate PDF từ HTML; allow frontend to suggest viewport width for consistent rendering
      const pdfBuffer = await this.generatePdfFromHtml(html, dto.viewportWidth)

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
    } catch (error) {
      console.error('Export error:', error)
      if (error instanceof HttpError) {
        throw error
      }
      throw new HttpError('Failed to export resume to PDF', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Preview CV - Always uses unified engine for consistency with PDF
   */
  async previewResume(userId: string, resumeId: string) {
    try {
      const profile = await prisma.profiles.findFirst({
        where: { user_id: userId },
        include: {
          users: true,
          location: true,
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

      let content: any = resume.content

      // If resume.content doesn't exist or is empty, build from profile
      if (!content) {
        console.log('🔧 Building content from profile for preview')
        content = this.buildResumeContent(profile)
      } else {
        // Validate and normalize content structure
        try {
          content = this.validateAndNormalizeContent(content)
        } catch (validationError) {
          console.warn(
            'Content validation failed, rebuilding from profile:',
            validationError instanceof Error ? validationError.message : String(validationError)
          )
          content = this.buildResumeContent(profile)
        }
      }

      // Set title
      content.title = resume.title

      // Get theme from layout_settings (unified)
      const themeId = content.layout_settings?.theme || 'modern'

      console.log('🎨 Generating unified preview HTML:', {
        resumeId,
        hasResumeContent: !!resume.content,
        themeId,
        profileHasData: !!profile.full_name,
        contentStructure: Object.keys(content)
      })

      const html = UnifiedCVEngine.generateHTML(content, themeId)

      if (!html || html.length === 0) {
        throw new HttpError('Failed to generate preview HTML', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      console.log('✅ Generated unified HTML length:', html.length)

      return {
        content: html,
        contentType: 'text/html'
      }
    } catch (error) {
      console.error('Preview generation error:', error)
      if (error instanceof HttpError) {
        throw error
      }
      throw new HttpError('Failed to generate resume preview', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Helper: Build resume content từ profile data
   */
  private buildResumeContent(profile: any) {
    console.log('🔧 Building resume content from profile:', {
      hasUser: !!profile.users,
      userEmail: profile.users?.email,
      fullName: profile.full_name,
      skillsCount: profile.skills?.length || 0,
      experiencesCount: profile.experiences?.length || 0
    })

    return {
      personal_info: {
        full_name: profile.full_name || 'Your Name',
        email: profile.users?.email || '',
        phone: profile.phone_number || '',
        location: profile.location_text || profile.location?.name || '',
        bio: profile.bio || ''
      },
      skills: (profile.skills || []).map((ps: any) => ({
        name: ps.skills?.name || 'Skill',
        proficiency: ps.proficiency_level || 'Beginner'
      })),
      experiences: (profile.experiences || []).map((exp: any) => ({
        position: exp.job_title || 'Position',
        company: exp.company_name || 'Company',
        location: exp.location || '',
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current || false,
        description: exp.description || ''
      })),
      educations: (profile.educations || []).map((edu: any) => ({
        school: edu.institution_name || 'School',
        degree: edu.degree || 'Degree',
        field_of_study: edu.field_of_study || '',
        start_date: edu.start_date,
        end_date: edu.end_date,
        description: edu.description || ''
      })),
      certifications: (profile.certifications || []).map((cert: any) => ({
        name: cert.name || 'Certification',
        issuer: cert.issuing_organization || 'Issuer',
        date: cert.issue_date,
        credential_id: cert.credential_id || '',
        credential_url: cert.credential_url || ''
      })),
      awards: (profile.awards || []).map((award: any) => ({
        name: award.title || 'Award',
        issuer: award.issuer || 'Issuer',
        date: award.date,
        description: award.description || ''
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
   * Helper: Generate HTML from resume template using unified engine
   */
  private generateResumeHtml(resume: any, profile: any, template?: string): string {
    let content: any = resume.content

    // If resume.content doesn't exist or is empty, build from profile
    if (!content) {
      content = this.buildResumeContent(profile)
    } else {
      // Ensure content is an object
      if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
        content = this.buildResumeContent(profile)
      } else {
        // If resume.content exists, ensure it has the right structure
        // Sometimes resume.content might have { sections: {...} } structure
        if (content.sections) {
          content = {
            personal_info: content.sections?.personal_info?.data || {},
            skills: content.sections?.skills?.items || [],
            experiences: content.sections?.experiences?.items || [],
            educations: content.sections?.educations?.items || [],
            certifications: content.sections?.certifications?.items || [],
            awards: content.sections?.awards?.items || [],
            projects: content.projects || content.sections?.projects?.items || [],
            technologies: content.technologies || content.sections?.technologies?.items || [],
            highlights: content.highlights || content.sections?.highlights?.items || [],
            links: content.links || content.sections?.links?.items || [],
            languages: content.languages || content.sections?.languages?.items || [],
            summary: content.summary || '',
            references: content.references || content.sections?.references?.items || []
          }
        }
        // If content still doesn't have required fields, merge with profile data
        if (!content.personal_info || !content.personal_info.full_name) {
          const profileContent = this.buildResumeContent(profile)
          content = { ...profileContent, ...content }
        }
      }
    }

    // Set title for unified engine
    content.title = resume.title

    const layoutSettings = content.layout_settings || {}
    // Prefer explicit template argument; fall back to content.layout_settings.theme; default to 'classic'
    const themeId = (template && String(template).trim()) || (layoutSettings.theme as string) || 'classic'

    // Use unified engine for consistent HTML generation
    return UnifiedCVEngine.generateHTML(content, themeId)
  }

  /**
   * Helper: Generate Classic Template (Header-Top Layout)
   */
  private generateClassicTemplate(resume: any, content: any, themeData: CVTheme): string {
    const themeColors = themeData.colors

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${resume.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
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
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
          }

          .resume-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          /* Header Section */
          .header {
            background: linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%);
            color: white;
            padding: 50px 40px 30px;
            text-align: center;
            position: relative;
          }

          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 20px;
            background: linear-gradient(45deg, transparent 33%, white 33%, white 66%, transparent 66%);
            background-size: 20px 20px;
          }

          .profile-photo {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: white;
            margin: 0 auto 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 56px;
            font-weight: 700;
            color: ${themeColors.primary};
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            border: 4px solid rgba(255, 255, 255, 0.2);
          }

          .header h1 {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.1;
          }

          .header .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 15px;
          }

          .contact-info {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            font-size: 14px;
            opacity: 0.9;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .contact-item i {
            font-size: 13px;
          }

          /* Main Content */
          .main-content {
            padding: 40px;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 40px;
          }

          .left-column {
            display: flex;
            flex-direction: column;
            gap: 35px;
          }

          .right-column {
            display: flex;
            flex-direction: column;
            gap: 35px;
          }

          .section {
            margin-bottom: 0;
          }

          .section h2 {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 600;
            color: ${themeColors.primary};
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid ${themeColors.primary};
            display: inline-block;
          }

          /* Experience */
          .experience-item {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
          }

          .experience-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .exp-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }

          .exp-title {
            font-weight: 600;
            font-size: 16px;
            color: #1e293b;
          }

          .exp-company {
            font-weight: 500;
            color: ${themeColors.primary};
            margin-top: 2px;
          }

          .exp-date {
            font-size: 13px;
            color: #64748b;
            font-weight: 500;
          }

          .exp-description {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
            margin-top: 8px;
          }

          /* Skills */
          .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
          }

          .skill-item {
            background: #f1f5f9;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            color: #475569;
            text-align: center;
            border: 1px solid #e2e8f0;
          }

          /* Education */
          .education-item {
            margin-bottom: 20px;
          }

          .education-item:last-child {
            margin-bottom: 0;
          }

          .edu-degree {
            font-weight: 600;
            font-size: 15px;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .edu-school {
            color: ${themeColors.primary};
            font-weight: 500;
            margin-bottom: 4px;
          }

          .edu-date {
            font-size: 13px;
            color: #64748b;
          }

          /* Certifications & Awards */
          .cert-item, .award-item {
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
          }

          .cert-item:last-child, .award-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .cert-name, .award-name {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .cert-issuer, .award-issuer {
            font-size: 13px;
            color: ${themeColors.primary};
            margin-bottom: 4px;
          }

          .cert-date, .award-date {
            font-size: 12px;
            color: #64748b;
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

          @media (max-width: 1024px) {
            .main-content {
              grid-template-columns: 1fr;
              gap: 35px;
            }
            .left-column {
              order: 1;
            }
            .right-column {
              order: 2;
            }
          }

          @media (max-width: 768px) {
            .resume-container {
              margin: 10px auto;
            }
            .header {
              padding: 30px 20px 20px;
              text-align: center;
            }
            .profile-photo {
              width: 90px;
              height: 90px;
              font-size: 36px;
            }
            .header h1 {
              font-size: 22px;
              margin-bottom: 6px;
            }
            .header .subtitle {
              font-size: 14px;
              margin-bottom: 12px;
            }
            .contact-info {
              flex-direction: column;
              gap: 8px;
              font-size: 13px;
            }
            .contact-item {
              justify-content: center;
            }
            .main-content {
              padding: 20px;
              gap: 25px;
            }
            .section h2 {
              font-size: 16px;
              margin-bottom: 15px;
            }
            .experience-item, .education-item {
              margin-bottom: 18px;
            }
            .skills-grid {
              grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
              gap: 8px;
            }
            .skill-item {
              padding: 6px 10px;
              font-size: 12px;
            }
          }

          @media (max-width: 480px) {
            body {
              padding: 5px;
            }
            .resume-container {
              margin: 0;
              border-radius: 0;
            }
            .header {
              padding: 25px 15px 15px;
            }
            .profile-photo {
              width: 80px;
              height: 80px;
              font-size: 32px;
            }
            .header h1 {
              font-size: 20px;
            }
            .main-content {
              padding: 15px;
            }
            .section h2 {
              font-size: 15px;
              margin-bottom: 12px;
            }
            .exp-title, .edu-degree {
              font-size: 14px;
            }
            .exp-company, .edu-school {
              font-size: 13px;
            }
            .exp-description, .project-description {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          <!-- Header -->
          <div class="header">
            ${this.generateClassicHeader(content, themeColors)}
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <div class="left-column">
              ${this.generateClassicLeftColumn(content, themeColors)}
            </div>
            <div class="right-column">
              ${this.generateClassicRightColumn(content, themeColors)}
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Helper: Generate Creative Template (Two-Column Layout)
   */
  private generateCreativeTemplate(resume: any, content: any, themeData: CVTheme): string {
    const themeColors = themeData.colors

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${resume.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
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
            color: #1e293b;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }

          .resume-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15);
            border-radius: 12px;
            overflow: hidden;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          /* Left Column */
          .left-column {
            background: linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%);
            color: white;
            padding: 40px 30px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .profile-section {
            text-align: center;
          }

          .profile-photo {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: 700;
            color: white;
            border: 3px solid rgba(255, 255, 255, 0.3);
          }

          .profile-section h1 {
            font-family: 'Poppins', sans-serif;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.2;
          }

          .profile-section .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 25px;
          }

          .contact-list {
            list-style: none;
            padding: 0;
          }

          .contact-list li {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            font-size: 14px;
          }

          .contact-list i {
            width: 20px;
            margin-right: 10px;
            opacity: 0.8;
          }

          .skills-section {
            margin-top: auto;
          }

          .skills-section h3 {
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.3);
          }

          .skill-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 8px;
            margin-right: 8px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          /* Right Column */
          .right-column {
            padding: 40px 30px;
            display: flex;
            flex-direction: column;
            gap: 30px;
          }

          .section {
            margin-bottom: 0;
          }

          .section h2 {
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: ${themeColors.primary};
            margin-bottom: 20px;
            position: relative;
            padding-left: 15px;
          }

          .section h2::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary});
            border-radius: 2px;
          }

          /* Experience */
          .experience-item {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
            padding-left: 20px;
          }

          .experience-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            width: 8px;
            height: 8px;
            background: ${themeColors.primary};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
          }

          .experience-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .exp-title {
            font-weight: 600;
            font-size: 16px;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .exp-company {
            font-weight: 500;
            color: ${themeColors.primary};
            margin-bottom: 4px;
          }

          .exp-date {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 8px;
          }

          .exp-description {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
          }

          /* Education */
          .education-item {
            margin-bottom: 20px;
            padding-left: 20px;
            position: relative;
          }

          .education-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            width: 8px;
            height: 8px;
            background: ${themeColors.secondary};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.2);
          }

          .edu-degree {
            font-weight: 600;
            font-size: 15px;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .edu-school {
            color: ${themeColors.primary};
            font-weight: 500;
            margin-bottom: 4px;
          }

          .edu-date {
            font-size: 13px;
            color: #64748b;
          }

          /* Projects */
          .project-item {
            margin-bottom: 20px;
            padding-left: 20px;
            position: relative;
          }

          .project-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
          }

          .project-name {
            font-weight: 600;
            font-size: 15px;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .project-tech {
            color: ${themeColors.primary};
            font-size: 13px;
            margin-bottom: 4px;
          }

          .project-date {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
          }

          .project-description {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
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
              border-radius: 0;
            }
          }

          @media (max-width: 1024px) {
            .resume-container {
              grid-template-columns: 1fr;
              min-height: auto;
            }
            .left-column {
              order: 1;
              padding: 35px 25px;
            }
            .right-column {
              order: 2;
              padding: 35px 25px;
            }
          }

          @media (max-width: 768px) {
            body {
              padding: 15px;
            }
            .resume-container {
              margin: 0;
              border-radius: 8px;
            }
            .left-column {
              padding: 25px 20px;
            }
            .right-column {
              padding: 25px 20px;
            }
            .profile-photo {
              width: 90px;
              height: 90px;
              font-size: 36px;
            }
            .profile-section h1 {
              font-size: 20px;
            }
            .profile-section .subtitle {
              font-size: 14px;
            }
            .contact-list li {
              font-size: 13px;
            }
            .skills-section h3 {
              font-size: 16px;
            }
            .section h2 {
              font-size: 17px;
            }
            .experience-item, .education-item, .project-item {
              padding-left: 15px;
            }
            .experience-item::before, .education-item::before, .project-item::before {
              width: 6px;
              height: 6px;
            }
          }

          @media (max-width: 480px) {
            body {
              padding: 10px;
            }
            .resume-container {
              border-radius: 4px;
            }
            .left-column, .right-column {
              padding: 20px 15px;
            }
            .profile-photo {
              width: 80px;
              height: 80px;
              font-size: 32px;
            }
            .profile-section h1 {
              font-size: 18px;
            }
            .contact-list li {
              font-size: 12px;
            }
            .skills-section h3 {
              font-size: 15px;
            }
            .section h2 {
              font-size: 16px;
            }
            .exp-title, .project-name {
              font-size: 14px;
            }
            .exp-company, .edu-school, .project-tech {
              font-size: 12px;
            }
            .exp-description, .project-description {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          <!-- Left Column -->
          <div class="left-column">
            ${this.generateCreativeLeftColumn(content, themeColors)}
          </div>

          <!-- Right Column -->
          <div class="right-column">
            ${this.generateCreativeRightColumn(content, themeColors)}
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Helper: Get theme data from shared constants
   */
  private getThemeData(themeId: string): CVTheme {
    return getThemeById(themeId)
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

    // Accept numbers, numeric strings, or named levels.
    if (level == null) return 70
    if (typeof level === 'number') {
      // Treat as percentage, clamp 0-100
      return Math.max(0, Math.min(100, Math.round(level)))
    }

    const str = String(level).trim()
    if (!str) return 70

    // If string is numeric (e.g. "75"), parse it
    const parsed = parseInt(str, 10)
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.min(100, parsed))
    }

    const key = str.toLowerCase()
    return levels[key] || 70
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
  private async generateAndSaveResumePdf(
    resume: any,
    profile: any,
    template: string = 'professional'
  ): Promise<string> {
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
  public async ensureResumeHasPdf(userId: string, resumeId: string, template?: string): Promise<string> {
    const profile = await prisma.profiles.findFirst({
      where: { user_id: userId },
      include: {
        users: {
          select: {
            email: true
          }
        },
        location: true,
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
    return await this.generateAndSaveResumePdf(resume, profile, template || 'professional')
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
  private async generatePdfFromHtml(html: string, viewportWidth?: number): Promise<Buffer> {
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
        width: viewportWidth && typeof viewportWidth === 'number' ? viewportWidth : 1200,
        height: 1697, // A4 aspect ratio at 96 DPI
        deviceScaleFactor: 2 // High DPI for better quality
      })

      // Emulate screen media so CSS media queries for screen are used
      try {
        await page.emulateMediaType('screen')
      } catch (e) {
        // ignore if not supported
      }

      // Prepare processed HTML. Detect if it's a full HTML document (frontend provided a full page)
      let processedHtml = html
      const isFullDocument = /<\s*html|<!doctype/i.test(String(processedHtml))

      // Sanitize incoming HTML and ensure base href so relative URLs resolve.
      try {
        // Remove style="..." attributes from <style ...> tags
        processedHtml = processedHtml.replace(/<style\b([^>]*)\sstyle=(["'])(.*?)\2([^>]*)>/gi, '<style$1$4>')
        // Remove style="..." attributes from <link ...> tags
        processedHtml = processedHtml.replace(/<link\b([^>]*)\sstyle=(["'])(.*?)\2([^>]*)>/gi, '<link$1$4>')
        // If no <base> tag, insert one pointing to server origin to help resolve relative URLs
        if (!/<base\s+/i.test(processedHtml)) {
          const baseTag = `<base href="${envConfig.app.publicOrigin}">`
          processedHtml = processedHtml.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}`)
        }
      } catch (e) {
        // ignore sanitization errors and proceed with original HTML
      }

      // Try to inline Google Fonts CSS + font binaries to avoid network/font-loading issues in Puppeteer
      try {
        processedHtml = await this.inlineGoogleFonts(processedHtml)
      } catch (e) {
        console.warn('Google Fonts inlining failed:', (e as any)?.message || e)
      }

      // Try to inline other external stylesheets (font-awesome, cdn css, etc.)
      try {
        processedHtml = await this.inlineExternalStylesheets(processedHtml)
      } catch (e) {
        console.warn('External CSS inlining failed:', (e as any)?.message || e)
      }

      // Ensure @page size exists so Puppeteer respects CSS page size
      if (!/@page\s*\{/.test(processedHtml)) {
        // Prepend a simple @page rule to make A4 and zero margins
        const pageCss = `<style>@page { size: A4; margin: 0; }</style>`
        processedHtml = pageCss + processedHtml
      }

      // Allow cross-origin requests and bypass CSP if necessary, then set content
      try {
        await page.setBypassCSP(true)
      } catch (e) {
        // ignore if not supported
      }
      // Use DOMContentLoaded to avoid waiting for external network requests (we inline most CSS/fonts)
      await page.setContent(processedHtml, { waitUntil: 'domcontentloaded' })

      // Wait for all fonts to load
      await page.evaluateHandle('document.fonts.ready')

      // Additional wait for any dynamic content
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Build pdf options. Prefer CSS page size if present.
      const pdfOptions: any = {
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        scale: 1,
        tagged: true // For accessibility
      }

      if (viewportWidth && typeof viewportWidth === 'number') {
        // If viewportWidth provided, set paper width to match px width.
        pdfOptions.width = `${viewportWidth}px`
        // Keep preferCSSPageSize true so @page rules still apply
      } else {
        // Fall back to A4 if no explicit viewport width
        pdfOptions.format = 'A4'
      }

      const pdfBuffer = await page.pdf(pdfOptions)

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }

  /**
   * Inline Google Fonts CSS and font files into HTML to avoid Puppeteer network/font issues.
   */
  private async inlineGoogleFonts(html: string): Promise<string> {
    try {
      // Find link tags pointing to fonts.googleapis.com
      const linkRegex = /<link\b[^>]*href=(["'])(https?:\/\/fonts\.googleapis\.com[^"']+)\1[^>]*>/gi
      let m
      let result = html

      // Determine fetch function
      let fetchFn: any = (globalThis as any).fetch
      if (!fetchFn) {
        try {
          // dynamic import node-fetch
          // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
          fetchFn = require('node-fetch')
        } catch (e) {
          // can't fetch, return original html
          return html
        }
      }

      const processedHrefs: Record<string, string> = {}

      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[2]
        if (!href || processedHrefs[href]) continue
        try {
          const cssRes = await fetchFn(href)
          if (!cssRes.ok) continue
          const cssText = await cssRes.text()

          // Find font file URLs in CSS (fonts.gstatic.com)
          const urlRegex = /url\((https?:\/\/[^)]+)\)/g
          let um
          let inlinedCss = cssText
          const seenUrls: Record<string, string> = {}
          while ((um = urlRegex.exec(cssText)) !== null) {
            const fontUrl = um[1].replace(/["']/g, '')
            if (seenUrls[fontUrl]) continue
            try {
              const fontRes = await fetchFn(fontUrl)
              if (!fontRes.ok) continue
              const arrayBuffer = await fontRes.arrayBuffer()
              const buf = Buffer.from(arrayBuffer)
              // Guess mime type by extension
              let mime = 'font/woff2'
              if (fontUrl.endsWith('.woff2')) mime = 'font/woff2'
              else if (fontUrl.endsWith('.woff')) mime = 'font/woff'
              else if (fontUrl.endsWith('.ttf')) mime = 'font/ttf'
              else if (fontUrl.endsWith('.otf')) mime = 'font/otf'
              const dataUri = `data:${mime};base64,${buf.toString('base64')}`
              // Replace all occurrences of the fontUrl in css
              const esc = fontUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              inlinedCss = inlinedCss.replace(new RegExp(esc, 'g'), dataUri)
              seenUrls[fontUrl] = dataUri
            } catch (e) {
              // ignore individual font fetch errors
            }
          }

          // Now replace the original <link ...> tag with <style>inlinedCss</style>
          const linkTagRegex = new RegExp(
            `<link\\b[^>]*href=(["'])${href.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\1[^>]*>`,
            'gi'
          )
          result = result.replace(linkTagRegex, `<style>${inlinedCss}</style>`)
          processedHrefs[href] = href
        } catch (e) {
          // ignore per-href errors
        }
      }

      return result
    } catch (e) {
      return html
    }
  }

  /**
   * Inline external stylesheet links into HTML to avoid Puppeteer network issues.
   * Fetches hrefs from <link rel="stylesheet" href="..."> and replaces with <style>content</style>.
   */
  private async inlineExternalStylesheets(html: string): Promise<string> {
    try {
      const linkRegex = /<link\b[^>]*rel=(["']?)stylesheet\1[^>]*href=(["'])(https?:\/\/[^"']+|\/[^"']+)\2[^>]*>/gi
      let m
      let result = html

      // Determine fetch function
      let fetchFn: any = (globalThis as any).fetch
      if (!fetchFn) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
          fetchFn = require('node-fetch')
        } catch (e) {
          // can't fetch, return original html
          return html
        }
      }

      const processedHrefs: Record<string, boolean> = {}

      while ((m = linkRegex.exec(html)) !== null) {
        const href = (m as any)[3] // The URL is in the third capture group
        if (!href || processedHrefs[href]) continue

        try {
          // Resolve relative URLs against publicOrigin
          const resolvedUrl = href.startsWith('/') ? `${envConfig.app.publicOrigin.replace(/\/$/, '')}${href}` : href
          const res = await fetchFn(resolvedUrl)
          if (!res.ok) {
            processedHrefs[href] = true
            continue
          }
          const cssText = await res.text()

          // Replace the specific <link ... href="..."> occurrence with a <style> block
          const escapedHref = href.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
          const linkTagRegex = new RegExp(`<link\\b[^>]*href=(["'])${escapedHref}\\1[^>]*>`, 'gi')
          result = result.replace(linkTagRegex, `<style>${cssText}</style>`)
          processedHrefs[href] = true
        } catch (e) {
          processedHrefs[href] = true
          // Continue processing other links
        }
      }

      return result
    } catch (e) {
      return html
    }
  }

  /**
   * Helper: Format date range for templates
   */
  private formatDateRange(startDate: string, endDate: string, isCurrent: boolean): string {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        month: 'short',
        year: 'numeric'
      })
    }

    const start = formatDate(startDate) || '—'
    const end = isCurrent ? 'Hiện tại' : formatDate(endDate) || '—'
    return `${start} – ${end}`
  }

  /**
   * Helper: Get skill name from skill object
   */
  private getSkillName(skill: any): string {
    if (typeof skill === 'string') return skill
    if (skill?.skills?.name) return skill.skills.name
    if (skill?.name) return skill.name
    return 'Kỹ năng'
  }

  /**
   * Helper: Generate Classic Template Header
   */
  private generateClassicHeader(content: any, themeColors: any): string {
    const personalInfo = content.personal_info || {}

    // Get initials for profile photo
    const initials = personalInfo.full_name
      ? personalInfo.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U'

    const contactItems = []
    if (personalInfo.email)
      contactItems.push(`<div class="contact-item"><i class="fas fa-envelope"></i> ${personalInfo.email}</div>`)
    if (personalInfo.phone)
      contactItems.push(`<div class="contact-item"><i class="fas fa-phone"></i> ${personalInfo.phone}</div>`)
    if (personalInfo.location)
      contactItems.push(
        `<div class="contact-item"><i class="fas fa-map-marker-alt"></i> ${personalInfo.location}</div>`
      )

    return `
      <div class="profile-photo">${initials}</div>
      <h1>${personalInfo.full_name || 'Your Name'}</h1>
      <div class="subtitle">${personalInfo.title || 'Professional Title'}</div>
      <div class="contact-info">
        ${contactItems.join('')}
      </div>
    `
  }

  /**
   * Helper: Generate Classic Template Left Column
   */
  private generateClassicLeftColumn(content: any, themeColors: any): string {
    const experiences = content.experiences || []
    const projects = content.projects || []

    return `
      <div class="section">
        <h2>Experience</h2>
        ${experiences
          .map(
            (exp: any) => `
          <div class="experience-item">
            <div class="exp-header">
              <div>
                <div class="exp-title">${exp.position || 'Position'}</div>
                <div class="exp-company">${exp.company || 'Company'}</div>
              </div>
              <div class="exp-date">${this.formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</div>
            </div>
            <div class="exp-description">${exp.description || ''}</div>
          </div>
        `
          )
          .join('')}

        ${
          projects.length > 0
            ? `
          <h2>Projects</h2>
          ${projects
            .map(
              (project: any) => `
            <div class="experience-item">
              <div class="exp-header">
                <div>
                  <div class="exp-title">${project.name || 'Project Name'}</div>
                  <div class="exp-company">${project.technologies ? project.technologies.join(', ') : ''}</div>
                </div>
                <div class="exp-date">${this.formatDateRange(project.start_date, project.end_date, project.is_current)}</div>
              </div>
              <div class="exp-description">${project.description || ''}</div>
            </div>
          `
            )
            .join('')}
        `
            : ''
        }
      </div>
    `
  }

  /**
   * Helper: Generate Classic Template Right Column
   */
  private generateClassicRightColumn(content: any, themeColors: any): string {
    const skills = content.skills || []
    const educations = content.educations || []
    const certifications = content.certifications || []
    const awards = content.awards || []

    return `
      ${
        skills.length > 0
          ? `
        <div class="section">
          <h2>Skills</h2>
          <div class="skills-grid">
            ${skills.map((skill: any) => `<div class="skill-item">${this.getSkillName(skill)}</div>`).join('')}
          </div>
        </div>
      `
          : ''
      }

      ${
        educations.length > 0
          ? `
        <div class="section">
          <h2>Education</h2>
          ${educations
            .map(
              (edu: any) => `
            <div class="education-item">
              <div class="edu-degree">${edu.degree || 'Degree'}</div>
              <div class="edu-school">${edu.school || 'School'}</div>
              <div class="edu-date">${this.formatDateRange(edu.start_date, edu.end_date, edu.is_current)}</div>
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
          <h2>Certifications</h2>
          ${certifications
            .map(
              (cert: any) => `
            <div class="cert-item">
              <div class="cert-name">${cert.name || 'Certification'}</div>
              <div class="cert-issuer">${cert.issuer || 'Issuer'}</div>
              <div class="cert-date">${this.formatDate(cert.date)}</div>
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
          <h2>Awards</h2>
          ${awards
            .map(
              (award: any) => `
            <div class="award-item">
              <div class="award-name">${award.name || 'Award'}</div>
              <div class="award-issuer">${award.issuer || 'Issuer'}</div>
              <div class="award-date">${this.formatDate(award.date)}</div>
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
   * Helper: Generate Creative Template Left Column
   */
  private generateCreativeLeftColumn(content: any, themeColors: any): string {
    const personalInfo = content.personal_info || {}
    const skills = content.skills || []

    // Get initials for profile photo
    const initials = personalInfo.full_name
      ? personalInfo.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U'

    const contactItems = []
    if (personalInfo.email) contactItems.push(`<li><i class="fas fa-envelope"></i> ${personalInfo.email}</li>`)
    if (personalInfo.phone) contactItems.push(`<li><i class="fas fa-phone"></i> ${personalInfo.phone}</li>`)
    if (personalInfo.location)
      contactItems.push(`<li><i class="fas fa-map-marker-alt"></i> ${personalInfo.location}</li>`)

    return `
      <div class="profile-section">
        <div class="profile-photo">${initials}</div>
        <h1>${personalInfo.full_name || 'Your Name'}</h1>
        <div class="subtitle">${personalInfo.title || 'Professional Title'}</div>
        <ul class="contact-list">
          ${contactItems.join('')}
        </ul>
      </div>

      ${
        skills.length > 0
          ? `
        <div class="skills-section">
          <h3>Skills</h3>
          ${skills.map((skill: any) => `<span class="skill-item">${this.getSkillName(skill)}</span>`).join('')}
        </div>
      `
          : ''
      }
    `
  }

  /**
   * Helper: Generate Creative Template Right Column
   */
  private generateCreativeRightColumn(content: any, themeColors: any): string {
    const experiences = content.experiences || []
    const educations = content.educations || []
    const projects = content.projects || []
    const certifications = content.certifications || []
    const awards = content.awards || []

    return `
      ${
        experiences.length > 0
          ? `
        <div class="section">
          <h2>Experience</h2>
          ${experiences
            .map(
              (exp: any) => `
            <div class="experience-item">
              <div class="exp-title">${exp.position || 'Position'}</div>
              <div class="exp-company">${exp.company || 'Company'}</div>
              <div class="exp-date">${this.formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</div>
              <div class="exp-description">${exp.description || ''}</div>
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
          <h2>Education</h2>
          ${educations
            .map(
              (edu: any) => `
            <div class="education-item">
              <div class="edu-degree">${edu.degree || 'Degree'}</div>
              <div class="edu-school">${edu.school || 'School'}</div>
              <div class="edu-date">${this.formatDateRange(edu.start_date, edu.end_date, edu.is_current)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        projects.length > 0
          ? `
        <div class="section">
          <h2>Projects</h2>
          ${projects
            .map(
              (project: any) => `
            <div class="project-item">
              <div class="project-name">${project.name || 'Project Name'}</div>
              <div class="project-tech">${project.technologies ? project.technologies.join(', ') : ''}</div>
              <div class="project-date">${this.formatDateRange(project.start_date, project.end_date, project.is_current)}</div>
              <div class="project-description">${project.description || ''}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        certifications.length > 0 || awards.length > 0
          ? `
        <div class="section">
          <h2>Certifications & Awards</h2>
          ${certifications
            .map(
              (cert: any) => `
            <div class="experience-item">
              <div class="exp-title">${cert.name || 'Certification'}</div>
              <div class="exp-company">${cert.issuer || 'Issuer'}</div>
              <div class="exp-date">${this.formatDate(cert.date)}</div>
            </div>
          `
            )
            .join('')}
          ${awards
            .map(
              (award: any) => `
            <div class="experience-item">
              <div class="exp-title">${award.name || 'Award'}</div>
              <div class="exp-company">${award.issuer || 'Issuer'}</div>
              <div class="exp-date">${this.formatDate(award.date)}</div>
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
}
