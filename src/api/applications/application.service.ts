import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { CreateApplicationDTO, GetApplicationsDTO } from './application.validator'
import { Prisma, application_status } from '@prisma/client'
import { NotificationHelper } from '@/shared/helpers/notification.helper'
import { S3Service } from '../uploads/services/s3.service'
import { ResumeService } from '../resumes/resume.service'
import { elasticsearchSyncService } from '@/config/elasticsearch-sync.service'
import { applicationToESDoc } from '@/shared/utils/es-transformers'
import { ApplicationWorkflowState, StageStatus } from '@/shared/constants/enums/application.enum'

export class ApplicationService {
  /**
   * Create a new job application
   */
  async createApplication(userId: string, data: CreateApplicationDTO) {
    const { job_id, resume_id, metadata } = data

    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, full_name: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    // Check if job exists and is active
    const job = await prisma.jobs.findUnique({
      where: { id: job_id },
      include: {
        companies: {
          select: {
            recruiter_id: true,
            name: true
          }
        }
      }
    })

    if (!job) {
      throw new HttpError('Job not found', HTTP_STATUS.NOT_FOUND)
    }

    if (job.status !== 'approved') {
      throw new HttpError('This job is not available for application', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if already applied
    const existingApplication = await prisma.applications.findFirst({
      where: {
        job_id,
        profile_id: profileId
      }
    })

    if (existingApplication) {
      throw new HttpError('You have already applied to this job', HTTP_STATUS.CONFLICT)
    }

    // Verify resume belongs to the user if resume_id is provided
    if (resume_id) {
      const resume = await prisma.resumes.findFirst({
        where: {
          id: resume_id,
          profile_id: profileId
        }
      })

      if (!resume) {
        throw new HttpError('Resume not found or does not belong to you', HTTP_STATUS.NOT_FOUND)
      }

      // Đảm bảo CV có file_url trước khi apply
      if (!resume.file_url) {
        if (resume.source_type === 'uploaded') {
          // CV upload nhưng không có file_url → lỗi dữ liệu
          throw new HttpError('Resume file is missing. Please re-upload your CV.', HTTP_STATUS.BAD_REQUEST)
        } else if (resume.source_type === 'created') {
          // CV từ profile → generate PDF ngay lập tức
          try {
            const resumeService = new ResumeService()
            const fileUrl = await resumeService.ensureResumeHasPdf(userId, resume_id)

            // Update resume với file_url mới
            await prisma.resumes.update({
              where: { id: resume_id },
              data: {
                file_url: fileUrl,
                updated_at: new Date()
              }
            })
          } catch (error) {
            console.error('Failed to generate resume PDF:', error)
            throw new HttpError(
              'Unable to prepare your CV for application. Please try again or contact support.',
              HTTP_STATUS.INTERNAL_SERVER_ERROR
            )
          }
        }
      }
    }

    // Create application
    const application = await prisma.applications.create({
      data: {
        job_id,
        profile_id: profileId,
        resume_id,
        status: application_status.pending,
        metadata: metadata as any,
        version: 1,
        view_count: 0,
        is_withdrawn: false
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            companies: {
              select: {
                id: true,
                name: true,
                logo_url: true
              }
            }
          }
        },
        resumes: {
          select: {
            id: true,
            title: true,
            file_url: true
          }
        }
      }
    })

    // Send notification to recruiter
    if (job.companies?.recruiter_id && profile.full_name) {
      console.log(
        `📬 [Application Service] Attempting to notify recruiter ${job.companies.recruiter_id} about new application`
      )
      try {
        await NotificationHelper.notifyApplicationReceived({
          recruiterId: job.companies.recruiter_id,
          candidateName: profile.full_name,
          jobTitle: job.title,
          applicationId: application.id,
          jobId: job_id
        })
        console.log(`✅ [Application Service] Recruiter notification sent successfully`)
      } catch (error) {
        console.error('❌ [Application Service] Failed to send notification:', error)
        console.error('Error details:', error instanceof Error ? error.stack : error)
        // Don't throw error, notification failure shouldn't block application creation
      }
    } else {
      console.log(
        `⚠️ [Application Service] Skipping notification - recruiterId: ${job.companies?.recruiter_id}, candidateName: ${profile.full_name}`
      )
    }

    // Sync to Elasticsearch
    setImmediate(async () => {
      try {
        // Fetch complete application data with relations for ES sync
        const fullApplication = await prisma.applications.findUnique({
          where: { id: application.id },
          include: {
            jobs: {
              select: {
                title: true,
                job_type: true,
                salary_range: true,
                companies: { select: { id: true, name: true, recruiter_id: true } }, // ensure recruiter_id present
                locations: { select: { name: true } }
              }
            },
            profiles: {
              select: {
                user_id: true,
                display_name: true,
                full_name: true,
                headline: true,
                location_text: true,
                years_of_experience: true,
                desired_salary_min: true,
                skills: {
                  include: { skills: { select: { name: true } } }
                },
                educations: { select: { degree: true } },
                users: { select: { email: true } }
              }
            }
          }
        })

        if (fullApplication) {
          const esDocument = applicationToESDoc(fullApplication)
          await elasticsearchSyncService.syncToElasticsearch('applications', application.id, esDocument)
        }
      } catch (error) {
        console.error(`Application create sync failed: ${application.id}`, error)
      }
    })

    return application
  }

  /**
   * Get list of applications for current user with pagination and filters
   */
  async getApplications(userId: string, filters: GetApplicationsDTO) {
    const { page = 1, limit = 20, status, sort_by = 'applied_at', order = 'desc' } = filters

    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.applicationsWhereInput = {
      profile_id: profileId
    }

    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.applications.count({ where })

    // Get applications
    const applications = await prisma.applications.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sort_by]: order
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            location_id: true,
            salary_range: true,
            companies: {
              select: {
                id: true,
                name: true,
                logo_url: true,
                is_verified: true
              }
            },
            locations: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        resumes: {
          select: {
            id: true,
            title: true,
            file_url: true
          }
        }
      }
    })

    return {
      data: applications,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        per_page: limit
      }
    }
  }

  /**
   * Get application by ID with full details
   */
  async getApplicationById(userId: string, applicationId: string) {
    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        profile_id: profileId
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            location_id: true,
            salary_range: true,
            job_type: true,
            companies: {
              select: {
                id: true,
                name: true,
                logo_url: true,
                is_verified: true,
                description: true,
                contact_email: true,
                contact_phone: true
              }
            },
            locations: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        resumes: {
          select: {
            id: true,
            title: true,
            file_url: true,
            created_at: true
          }
        },
        application_stages: {
          orderBy: {
            stage_order: 'asc'
          },
          select: {
            id: true,
            stage_name: true,
            stage_order: true,
            status: true,
            scheduled_at: true,
            completed_at: true,
            created_at: true,
            location: true,
            duration_minutes: true,
            candidate_accepted_at: true,
            candidate_declined_at: true,
            decline_reason: true,
            recruiter_decision: true,
            decision_at: true,
            candidate_response_deadline: true
          }
        },
        application_documents: {
          orderBy: {
            created_at: 'desc'
          },
          select: {
            id: true,
            document_type: true,
            file_url: true,
            original_filename: true,
            mime_type: true,
            file_size_bytes: true,
            created_at: true
          }
        }
      }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    return application
  }

  /**
   * Get application stages history
   */
  async getApplicationStages(userId: string, applicationId: string) {
    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        profile_id: profileId
      },
      select: { id: true }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Get stages
    const stages = await prisma.application_stages.findMany({
      where: {
        application_id: applicationId
      },
      orderBy: {
        stage_order: 'asc'
      },
      select: {
        id: true,
        stage_name: true,
        stage_order: true,
        status: true,
        scheduled_at: true,
        completed_at: true,
        location: true,
        interviewer_id: true,
        duration_minutes: true,
        created_at: true,
        candidate_accepted_at: true,
        candidate_declined_at: true,
        decline_reason: true,
        recruiter_decision: true,
        decision_at: true,
        candidate_response_deadline: true
      }
    })

    return stages
  }

  /**
   * Get single stage details for candidate
   */
  async getStageDetails(userId: string, applicationId: string, stageId: string) {
    // Verify profile
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: { id: applicationId, profile_id: profile.id },
      select: { id: true }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    const stage = await prisma.application_stages.findFirst({
      where: {
        id: stageId,
        application_id: applicationId
      },
      select: {
        id: true,
        stage_name: true,
        stage_order: true,
        status: true,
        scheduled_at: true,
        completed_at: true,
        location: true,
        duration_minutes: true,
        recruiter_decision: true,
        decision_at: true,
        candidate_response_deadline: true,
        candidate_accepted_at: true,
        candidate_declined_at: true,
        decline_reason: true,
        created_at: true
      }
    })

    if (!stage) {
      throw new HttpError('Stage not found', HTTP_STATUS.NOT_FOUND)
    }

    return stage
  }

  /**
   * Candidate accepts a stage
   */
  async acceptStage(userId: string, applicationId: string, stageId: string) {
    // Verify profile
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, full_name: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: { id: applicationId, profile_id: profile.id },
      include: {
        jobs: { select: { title: true, companies: { select: { recruiter_id: true } } } },
        profiles: { select: { full_name: true } }
      }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    const stage = await prisma.application_stages.findFirst({
      where: { id: stageId, application_id: applicationId }
    })

    if (!stage) {
      throw new HttpError('Stage not found', HTTP_STATUS.NOT_FOUND)
    }

    // Check response deadline
    if (stage.candidate_response_deadline && new Date() > new Date(stage.candidate_response_deadline)) {
      throw new HttpError('Response deadline has passed', HTTP_STATUS.BAD_REQUEST)
    }

    const updated = await prisma.application_stages.update({
      where: { id: stageId },
      data: {
        candidate_accepted_at: new Date(),
        status: StageStatus.SCHEDULED
      }
    })

    // Notify recruiter
    const recruiterId = application.jobs?.companies?.recruiter_id
    if (recruiterId) {
      try {
        await NotificationHelper.notifyCandidateRespondedToRecruiter({
          recruiterId,
          candidateName: profile.full_name || application.profiles?.full_name || 'Candidate',
          jobTitle: application.jobs?.title || '',
          applicationId,
          stageId,
          jobId: application.job_id,
          action: 'accepted'
        })
      } catch (error) {
        console.error('Failed to send recruiter notification for stage accept:', error)
      }
    }

    return updated
  }

  /**
   * Candidate declines a stage
   */
  async declineStage(userId: string, applicationId: string, stageId: string, reason: string) {
    // Verify profile
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, full_name: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: { id: applicationId, profile_id: profile.id },
      include: {
        jobs: { select: { title: true, companies: { select: { recruiter_id: true } } } },
        profiles: { select: { full_name: true } }
      }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    const stage = await prisma.application_stages.findFirst({
      where: { id: stageId, application_id: applicationId }
    })

    if (!stage) {
      throw new HttpError('Stage not found', HTTP_STATUS.NOT_FOUND)
    }

    const updated = await prisma.application_stages.update({
      where: { id: stageId },
      data: {
        candidate_declined_at: new Date(),
        decline_reason: reason || undefined
      }
    })

    // Notify recruiter
    const recruiterId = application.jobs?.companies?.recruiter_id
    if (recruiterId) {
      try {
        await NotificationHelper.notifyCandidateRespondedToRecruiter({
          recruiterId,
          candidateName: profile.full_name || application.profiles?.full_name || 'Candidate',
          jobTitle: application.jobs?.title || '',
          applicationId,
          stageId,
          jobId: application.job_id,
          action: 'declined',
          reason
        })
      } catch (error) {
        console.error('Failed to send recruiter notification for stage decline:', error)
      }
    }

    return updated
  }

  /**
   * Get application documents
   */
  async getApplicationDocuments(userId: string, applicationId: string) {
    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        profile_id: profileId
      },
      select: { id: true }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Get documents
    const documents = await prisma.application_documents.findMany({
      where: {
        application_id: applicationId
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        document_type: true,
        file_url: true,
        original_filename: true,
        mime_type: true,
        file_size_bytes: true,
        created_at: true
      }
    })

    return documents
  }

  /**
   * Upload additional document for application
   */
  async uploadApplicationDocument(
    userId: string,
    applicationId: string,
    documentType: string,
    file: Express.Multer.File
  ) {
    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        profile_id: profileId
      },
      select: { id: true, status: true }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Don't allow upload if application is rejected
    if (application.status === application_status.rejected) {
      throw new HttpError('Cannot upload documents for rejected applications', HTTP_STATUS.BAD_REQUEST)
    }

    // Validate document upload permissions
    await this.validateDocumentUpload(applicationId)

    // Upload file to S3
    const s3Service = new S3Service()
    const uploadResult = await s3Service.uploadFile({
      file,
      folder: `applications/${applicationId}/documents`
    })

    // Create document record
    const document = await prisma.application_documents.create({
      data: {
        application_id: applicationId,
        document_type: documentType,
        file_url: uploadResult.url,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size_bytes: file.size
      }
    })

    // Send notification to recruiter
    const fullApplication = await prisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          select: {
            title: true,
            companies: { select: { recruiter_id: true } }
          }
        },
        profiles: { select: { full_name: true } }
      }
    })

    if (fullApplication?.jobs.companies?.recruiter_id) {
      try {
        await NotificationHelper.notifyApplicationDocumentUploaded({
          recruiterId: fullApplication.jobs.companies.recruiter_id,
          candidateName: fullApplication.profiles?.full_name || 'Candidate',
          jobTitle: fullApplication.jobs.title,
          documentType,
          documentId: document.id,
          applicationId
        })
      } catch (error) {
        console.error('Failed to send document upload notification:', error)
        // Don't throw error, notification failure shouldn't block upload
      }
    }

    return document
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(userId: string, applicationId: string) {
    // Get profile for the user
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, full_name: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    const profileId = profile.id

    // Verify application belongs to user
    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        profile_id: profileId
      },
      include: {
        jobs: {
          select: {
            title: true,
            companies: {
              select: {
                recruiter_id: true
              }
            }
          }
        },
        profiles: {
          select: {
            full_name: true
          }
        }
      }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Check if already withdrawn or rejected
    if (application.is_withdrawn || application.status === application_status.withdrawn) {
      throw new HttpError('Application has already been withdrawn', HTTP_STATUS.BAD_REQUEST)
    }

    if (application.status === application_status.rejected) {
      throw new HttpError('Cannot withdraw rejected application', HTTP_STATUS.BAD_REQUEST)
    }

    // Update status to withdrawn
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status: application_status.withdrawn,
        is_withdrawn: true
      }
    })

    // Send notification to recruiter
    if (application.jobs.companies?.recruiter_id && application.profiles?.full_name) {
      try {
        await NotificationHelper.notifyApplicationWithdrawn({
          recruiterId: application.jobs.companies.recruiter_id,
          candidateName: application.profiles.full_name,
          jobTitle: application.jobs.title,
          applicationId: application.id
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
        // Don't throw error, notification failure shouldn't block withdrawal
      }
    }

    return updatedApplication
  }

  /**
   * Validate application workflow state transition
   */
  async validateApplicationWorkflow(applicationId: string, newState: ApplicationWorkflowState) {
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      include: { application_stages: { orderBy: { stage_order: 'asc' } } }
    })

    if (!application) throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)

    const metadata = application.metadata as any
    const currentState = metadata?.workflow_state || ApplicationWorkflowState.APPLIED
    const stages = application.application_stages

    // Business rules validation
    switch (newState) {
      case ApplicationWorkflowState.INTERVIEWING:
        // ✅ Cho phép chuyển trực tiếp sang INTERVIEWING mà không cần stages trước
        break

      case ApplicationWorkflowState.ACCEPTED:
      case ApplicationWorkflowState.REJECTED:
        // ✅ Có thể chuyển sang ACCEPTED/REJECTED bất cứ lúc nào
        break
    }

    return { currentState, stages }
  }

  /**
   * Validate stage workflow
   */
  async validateStageWorkflow(applicationId: string, stageId: string, newStatus: StageStatus) {
    const [stage, allStages] = await Promise.all([
      prisma.application_stages.findUnique({
        where: { id: stageId }
      }),
      prisma.application_stages.findMany({
        where: { application_id: applicationId },
        orderBy: { stage_order: 'asc' }
      })
    ])

    if (!stage) throw new HttpError('Stage not found', HTTP_STATUS.NOT_FOUND)

    // Validate thứ tự: stage trước phải complete
    if (newStatus === StageStatus.IN_PROGRESS || newStatus === StageStatus.SCHEDULED) {
      const previousStages = allStages.filter((s) => s.stage_order < stage.stage_order)
      const hasIncompletePrevious = previousStages.some((s) => s.status !== StageStatus.COMPLETED)

      if (hasIncompletePrevious) {
        throw new HttpError('Previous stages must be completed first', HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Theo quy trình mới: không tự động chuyển trạng thái khi hoàn thành stages
    // Recruiter có thể chọn ACCEPTED/REJECTED bất cứ lúc nào từ INTERVIEWING

    return { stage, allStages }
  }

  /**
   * Update workflow state in metadata
   */
  async updateApplicationWorkflowState(applicationId: string, newState: ApplicationWorkflowState) {
    const currentApp = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: { metadata: true }
    })

    const metadata = (currentApp?.metadata as any) || {}
    const stateHistory = metadata.state_history || []

    // Add to history
    stateHistory.push({
      state: newState,
      changed_at: new Date().toISOString(),
      changed_by: 'system'
    })

    await prisma.applications.update({
      where: { id: applicationId },
      data: {
        metadata: {
          ...(metadata as object),
          workflow_state: newState,
          state_updated_at: new Date().toISOString(),
          state_history: stateHistory.slice(-10) // Keep last 10 entries
        }
      }
    })
  }

  /**
   * Centralized status update helper used by recruiter / system
   */
  async updateStatus(applicationId: string, newStatus: ApplicationWorkflowState, reason?: string) {
    // Validate available transitions
    await this.validateApplicationWorkflow(applicationId, newStatus)

    // Get current metadata
    const currentApp = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: { metadata: true, jobs: { select: { title: true } }, profiles: { select: { user_id: true } } }
    })

    if (!currentApp) throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)

    const currentMetadata = (currentApp?.metadata as any) || {}

    // Map workflow state to DB enum `application_status`
    let dbStatus: any
    switch (newStatus) {
      case ApplicationWorkflowState.APPLIED:
        dbStatus = application_status.pending
        break
      case ApplicationWorkflowState.REVIEWED:
        dbStatus = application_status.reviewed
        break
      case ApplicationWorkflowState.INTERVIEWING:
        dbStatus = application_status.interviewing
        break
      case ApplicationWorkflowState.ACCEPTED:
        dbStatus = application_status.accepted
        break
      case ApplicationWorkflowState.REJECTED:
        dbStatus = application_status.rejected
        break
      case ApplicationWorkflowState.WITHDRAWN:
        dbStatus = application_status.withdrawn
        break
      default:
        dbStatus = application_status.pending
    }

    // Update status on application
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status: dbStatus,
        metadata:
          reason && reason.trim() !== ''
            ? ({
                ...currentMetadata,
                status_reason: reason.trim()
              } as any)
            : currentMetadata
      }
    })

    // Update workflow state metadata
    await this.updateApplicationWorkflowState(applicationId, newStatus)

    // Send notification to candidate if user_id exists
    const candidateUserId = currentApp.profiles?.user_id
    if (candidateUserId) {
      console.log(
        `📬 [Application Service] Attempting to notify candidate ${candidateUserId} about status change to ${newStatus}`
      )
      try {
        await NotificationHelper.notifyApplicationStatusChanged({
          candidateId: candidateUserId,
          jobTitle: currentApp.jobs?.title || '',
          status: newStatus as any,
          applicationId,
          statusDisplay: undefined,
          reason
        })
        console.log(`✅ [Application Service] Candidate notification sent successfully`)
      } catch (err) {
        console.error('❌ [Application Service] Failed to send application status changed notification:', err)
        console.error('Error details:', err instanceof Error ? err.stack : err)
      }
    } else {
      console.log(`⚠️ [Application Service] Skipping notification - no candidateUserId found`)
    }

    return {
      id: updatedApplication.id,
      status: updatedApplication.status,
      updated_at: new Date()
    }
  }

  /**
   * Validate document upload permissions
   */
  async validateDocumentUpload(applicationId: string) {
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        metadata: true,
        application_stages: { select: { id: true } }
      }
    })

    if (!application) throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)

    const metadata = application.metadata as any
    const workflowState = metadata?.workflow_state || ApplicationWorkflowState.APPLIED

    if (workflowState !== ApplicationWorkflowState.INTERVIEWING) {
      throw new HttpError(
        'Documents can only be uploaded after the interview process has started',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    if (application.application_stages.length === 0) {
      throw new HttpError(
        'Cannot upload additional documents until interview stages are set up',
        HTTP_STATUS.BAD_REQUEST
      )
    }
  }

  /**
   * Get offers for candidate
   */
}
