import { Request, Response } from 'express'
import { ResumeService } from './resume.service'
import { TokenPayload } from '@/types/token-payload.type'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { HttpError } from '@/shared/common/http-error'

export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * POST /api/resumes
   * Tạo CV mới từ đầu
   */
  createResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { title, content, is_default, is_public, status } = req.body

    const resume = await this.resumeService.createResume(user_id, {
      title,
      content,
      is_default,
      is_public,
      status
    })

    res.status(HTTP_STATUS.CREATED).json({
      statusCode: HTTP_STATUS.CREATED,
      message: 'Resume created successfully',
      data: resume
    })
  }

  /**
   * GET /api/resumes
   * Lấy danh sách CV của user
   */
  getResumes = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    const resumes = await this.resumeService.getResumes(user_id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Get resumes successfully',
      data: resumes
    })
  }

  /**
   * GET /api/resumes/:id
   * Lấy chi tiết CV
   */
  getResumeById = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const resume = await this.resumeService.getResumeById(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Get resume successfully',
      data: resume
    })
  }

  /**
   * PUT /api/resumes/:id
   * Cập nhật CV
   */
  updateResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params
    const { title, content, layout_settings, is_public, status } = req.body

    const resume = await this.resumeService.updateResume(user_id, id, {
      title,
      content,
      layout_settings,
      is_public,
      status
    })

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Resume updated successfully',
      data: resume
    })
  }

  /**
   * GET /api/resumes/profile-data
   * Lấy profile data formatted cho việc tạo CV
   */
  getProfileData = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    const profileData = await this.resumeService.getProfileData(user_id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Get profile data successfully',
      data: profileData
    })
  }

  /**
   * POST /api/resumes/from-profile
   * Tạo CV từ profile - Include ALL profile data
   */
  createResumeFromProfile = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { title, theme, is_default, is_public } = req.body

    const resume = await this.resumeService.createResumeFromProfile(user_id, {
      title,
      theme,
      is_default,
      is_public
    })

    res.status(HTTP_STATUS.CREATED).json({
      statusCode: HTTP_STATUS.CREATED,
      message: 'Resume created from profile successfully',
      data: resume
    })
  }

  /**
   * PATCH /api/resumes/:id/default
   * Đặt CV làm mặc định
   */
  setDefaultResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const resume = await this.resumeService.setDefaultResume(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Resume set as default successfully',
      data: resume
    })
  }

  /**
   * DELETE /api/resumes/:id
   * Xóa CV
   */
  deleteResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const result = await this.resumeService.deleteResume(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: null
    })
  }

  /**
   * POST /api/resumes/upload
   * Upload CV file
   */
  uploadResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    if (!req.file) {
      throw new HttpError('Resume file is required', HTTP_STATUS.BAD_REQUEST)
    }

    const { title, auto_parse, is_default } = req.body

    const result = await this.resumeService.uploadResume(user_id, req.file, {
      title,
      auto_parse,
      is_default
    })

    res.status(HTTP_STATUS.CREATED).json({
      statusCode: HTTP_STATUS.CREATED,
      message: 'Resume uploaded successfully',
      data: result
    })
  }

  /**
   * GET /api/resumes/:id/download
   * Download CV file
   */
  downloadResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const result = await this.resumeService.downloadResume(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Get download URL successfully',
      data: result
    })
  }

  /**
   * POST /api/resumes/:id/export
   * Export CV to PDF
   */
  exportResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params
    const { template, format } = req.body

    const result = await this.resumeService.exportResume(user_id, id, {
      template,
      format
    })

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html')
      res.status(HTTP_STATUS.OK).send(result.content)
    } else {
      res.status(HTTP_STATUS.OK).json({
        statusCode: HTTP_STATUS.OK,
        message: 'Resume exported successfully',
        data: result
      })
    }
  }

  /**
   * GET /api/resumes/:id/preview
   * Preview CV
   */
  previewResume = async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const result = await this.resumeService.previewResume(user_id, id)

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.status(HTTP_STATUS.OK).send(result.content)
  }

  /**
   * GET /api/resumes/themes
   * Get available CV themes
   */
  getAvailableThemes = async (req: Request, res: Response) => {
    const themes = await this.resumeService.getAvailableThemes()

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: 'Get themes successfully',
      data: themes
    })
  }
}
