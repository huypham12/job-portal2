import { Request, Response, NextFunction } from 'express'
import { RecruiterApplicationService } from './recruiter.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import {
  GetApplicationsByJobDTO,
  UpdateStatusDTO,
  UpdateStageDTO,
  CreateStageDTO,
  AddNotesDTO,
  ContactCandidateDTO,
  BulkUpdateDTO,
  CompareCandidatesDTO,
  ShortlistCandidateDTO,
  GetShortlistedDTO,
  GetApplicationTimelineDTO
} from './recruiter.validator'
import { TokenPayload } from '@/types/token-payload.type'

export class RecruiterApplicationController {
  private recruiterService: RecruiterApplicationService

  constructor() {
    this.recruiterService = new RecruiterApplicationService()
  }

  /**
   * GET /api/applications/job/:jobId
   * Get all applications for a specific job
   */
  getApplicationsByJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const params = req.validated?.params as GetApplicationsByJobDTO['params']
      const filters = req.validated?.query as GetApplicationsByJobDTO['query']

      const result = await this.recruiterService.getApplicationsByJob(user_id, params, filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/job/:jobId/stats
   * Get application statistics for a job
   */
  getJobApplicationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { jobId } = req.params

      const stats = await this.recruiterService.getJobApplicationStats(user_id, jobId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/timeline
   * Get full application timeline with all stages
   */
  getApplicationTimeline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const timeline = await this.recruiterService.getApplicationTimeline(user_id, applicationId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: timeline
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/cv
   * View detailed CV of an applicant
   */
  getApplicationCV = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const cv = await this.recruiterService.getApplicationCV(user_id, applicationId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: cv
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id
   * Get full application details (Recruiter)
   */
  getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const result = await this.recruiterService.getApplicationCV(user_id, applicationId)

      // Normalize to a shape similar to candidate-facing detail to keep frontend compatibility
      const responsePayload = {
        id: result.application.id,
        applied_at: result.application.applied_at,
        status: result.application.status,
        metadata: { notes: result.application.notes || [] },
        jobs: {
          title: result.application.job_title,
          companies: { name: result.application.company_name }
        },
        profiles: {
          id: result.candidate.profile_id,
          user_id: result.candidate.user_id,
          full_name: result.candidate.full_name,
          display_name: result.candidate.display_name,
          avatar_url: result.candidate.avatar_url,
          headline: result.candidate.headline,
          years_of_experience: result.candidate.years_of_experience,
          location_text: result.candidate.location_text,
          linkedin_url: result.candidate.social_links?.linkedin_url,
          github_url: result.candidate.social_links?.github_url,
          personal_website: result.candidate.social_links?.personal_website,
          users: { email: result.candidate.email },
          experiences: result.candidate.experiences || [],
          educations: result.candidate.educations || [],
          skills: (result.candidate.skills || []).map((s: any) => ({
            skills: { id: s.id, name: s.name, category: s.category },
            proficiency: s.proficiency,
            level: s.level
          })),
          certifications: result.candidate.certifications || [],
          awards: result.candidate.awards || []
        },
        resumes: result.resume || [],
        application_documents: result.documents || []
      }

      // Convert BigInt to string for JSON serialization
      const serializedPayload = JSON.parse(JSON.stringify(responsePayload, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedPayload
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/status
   * Update application status
   */
  updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const data = req.body as UpdateStatusDTO['body']

      const result = await this.recruiterService.updateApplicationStatus(user_id, applicationId, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Application status updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/stage
   * Update existing application stage
   */
  updateApplicationStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const data = req.body as UpdateStageDTO['body']

      const result = await this.recruiterService.updateApplicationStage(user_id, applicationId, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Application stage updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/stage
   * Create new application stage
   */
  createApplicationStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const data = req.body as CreateStageDTO['body']

      const result = await this.recruiterService.createApplicationStage(user_id, applicationId, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Application stage created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/stage/:stageId/decision
   * Recruiter decision after a stage (create next stage or accept application)
   */
  makeStageDecision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId, stageId } = req.params
      const data = req.body as any

      const result = await this.recruiterService.makeStageDecision(user_id, applicationId, stageId, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Stage decision processed successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/notes
   * Add internal notes to application
   */
  addApplicationNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const data = req.body as AddNotesDTO['body']

      const result = await this.recruiterService.addApplicationNotes(user_id, applicationId, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Note added successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/contact
   * Contact candidate via email/notification
   */
  contactCandidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const data = req.body as ContactCandidateDTO['body']

      const result = await this.recruiterService.contactCandidate(user_id, applicationId, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Message sent successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/bulk-update
   * Bulk update multiple applications
   */
  bulkUpdateApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as BulkUpdateDTO

      const result = await this.recruiterService.bulkUpdateApplications(user_id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Applications updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/shortlist
   * Add or remove candidate from shortlist
   */
  shortlistCandidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as ShortlistCandidateDTO

      const result = await this.recruiterService.shortlistCandidate(user_id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: data.action === 'add' ? 'Candidate added to shortlist' : 'Candidate removed from shortlist'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/shortlisted
   * Get shortlisted candidates
   */
  getShortlistedCandidates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const filters = req.validated?.query as GetShortlistedDTO

      const result = await this.recruiterService.getShortlistedCandidates(user_id, filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/compare
   * Compare multiple candidates side-by-side
   */
  compareCandidates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as CompareCandidatesDTO

      const result = await this.recruiterService.compareCandidates(user_id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }
}
