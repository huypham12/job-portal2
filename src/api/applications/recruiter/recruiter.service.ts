import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import {
  GetApplicationsByJobDTO,
  UpdateStatusDTO,
  UpdateStageDTO,
  CreateStageDTO,
  AddNotesDTO,
  ContactCandidateDTO,
  BulkUpdateDTO
} from './recruiter.validator'
import { Prisma, application_status } from '@prisma/client'
import { NotificationHelper } from '@/shared/helpers/notification.helper'

export class RecruiterApplicationService {
  /**
   * Verify that the job belongs to the recruiter's company
   */
  private async verifyJobOwnership(jobId: string, recruiterId: string) {
    const job = await prisma.jobs.findFirst({
      where: {
        id: jobId,
        companies: {
          recruiter_id: recruiterId
        }
      },
      select: { id: true }
    })

    if (!job) {
      throw new HttpError('Job not found or you do not have permission to access it', HTTP_STATUS.FORBIDDEN)
    }

    return job
  }

  /**
   * Verify that the application belongs to a job owned by the recruiter
   */
  private async verifyApplicationAccess(applicationId: string, recruiterId: string) {
    const application = await prisma.applications.findFirst({
      where: {
        id: applicationId,
        jobs: {
          companies: {
            recruiter_id: recruiterId
          }
        }
      },
      select: {
        id: true,
        job_id: true,
        profile_id: true,
        profiles: {
          select: {
            user_id: true
          }
        }
      }
    })

    if (!application) {
      throw new HttpError('Application not found or you do not have permission to access it', HTTP_STATUS.FORBIDDEN)
    }

    return application
  }

  /**
   * Get applications for a specific job with pagination and filters
   */
  async getApplicationsByJob(
    recruiterId: string,
    params: GetApplicationsByJobDTO['params'],
    filters: GetApplicationsByJobDTO['query']
  ) {
    const { jobId } = params
    const { page = 1, limit = 20, status, stage, sort_by = 'applied_at', order = 'desc' } = filters

    // Verify job ownership
    await this.verifyJobOwnership(jobId, recruiterId)

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.applicationsWhereInput = {
      job_id: jobId
    }

    if (status) {
      where.status = status
    }

    if (stage) {
      where.application_stages = {
        some: {
          stage_name: stage
        }
      }
    }

    // Get total count
    const total = await prisma.applications.count({ where })

    // Build orderBy
    let orderBy: any = {}
    if (sort_by === 'applied_at') {
      orderBy = { applied_at: order }
    } else if (sort_by === 'name') {
      orderBy = { profiles: { full_name: order } }
    }
    // Note: rating sorting would require aggregation or computed field

    // Get applications
    const applications = await prisma.applications.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        profiles: {
          select: {
            id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
            headline: true,
            years_of_experience: true,
            user_id: true,
            users: {
              select: {
                email: true
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
        },
        application_stages: {
          orderBy: {
            stage_order: 'desc'
          },
          take: 1,
          select: {
            id: true,
            stage_name: true,
            stage_order: true,
            status: true,
            scheduled_at: true,
            rating: true
          }
        }
      }
    })

    // Format response to include current_stage and check for notes
    const formattedApplications = applications.map((app) => {
      const metadata = app.metadata as any
      return {
        id: app.id,
        status: app.status,
        applied_at: app.applied_at,
        candidate: {
          profile_id: app.profiles.id,
          user_id: app.profiles.user_id,
          display_name: app.profiles.display_name || app.profiles.full_name,
          full_name: app.profiles.full_name,
          avatar_url: app.profiles.avatar_url,
          headline: app.profiles.headline,
          years_of_experience: app.profiles.years_of_experience,
          email: app.profiles.users?.email
        },
        resume: app.resumes,
        current_stage: app.application_stages[0] || null,
        has_notes: metadata?.notes ? metadata.notes.length > 0 : false
      }
    })

    return {
      data: formattedApplications,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        per_page: limit
      }
    }
  }

  /**
   * Get application statistics for a job
   */
  async getJobApplicationStats(recruiterId: string, jobId: string) {
    // Verify job ownership
    await this.verifyJobOwnership(jobId, recruiterId)

    // Get total count
    const total = await prisma.applications.count({
      where: { job_id: jobId }
    })

    // Get count by status
    const statusCounts = await prisma.applications.groupBy({
      by: ['status'],
      where: { job_id: jobId },
      _count: true
    })

    const by_status = statusCounts.reduce(
      (acc, item) => {
        if (item.status) {
          acc[item.status] = item._count
        }
        return acc
      },
      {} as Record<string, number>
    )

    // Get count by stage
    const stageCounts = await prisma.application_stages.groupBy({
      by: ['stage_name'],
      where: {
        applications: {
          job_id: jobId
        }
      },
      _count: true
    })

    const by_stage = stageCounts.reduce(
      (acc, item) => {
        acc[item.stage_name] = item._count
        return acc
      },
      {} as Record<string, number>
    )

    // Get recent applications
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [todayCount, weekCount, monthCount] = await Promise.all([
      prisma.applications.count({
        where: {
          job_id: jobId,
          applied_at: { gte: today }
        }
      }),
      prisma.applications.count({
        where: {
          job_id: jobId,
          applied_at: { gte: weekAgo }
        }
      }),
      prisma.applications.count({
        where: {
          job_id: jobId,
          applied_at: { gte: monthAgo }
        }
      })
    ])

    // Calculate average rating
    const ratings = await prisma.application_stages.aggregate({
      where: {
        applications: {
          job_id: jobId
        },
        rating: { not: null }
      },
      _avg: {
        rating: true
      }
    })

    return {
      total,
      by_status,
      by_stage,
      recent_applications: {
        today: todayCount,
        this_week: weekCount,
        this_month: monthCount
      },
      average_rating: ratings._avg.rating || 0
    }
  }

  /**
   * Get detailed CV view of an application
   */
  async getApplicationCV(recruiterId: string, applicationId: string) {
    // Verify access
    const app = await this.verifyApplicationAccess(applicationId, recruiterId)

    // Get full application details
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        applied_at: true,
        status: true,
        metadata: true,
        profiles: {
          select: {
            id: true,
            user_id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
            headline: true,
            bio: true,
            phone_number: true,
            years_of_experience: true,
            location_text: true,
            linkedin_url: true,
            github_url: true,
            personal_website: true,
            users: {
              select: {
                email: true
              }
            },
            experiences: {
              orderBy: {
                start_date: 'desc'
              },
              select: {
                id: true,
                company_name: true,
                position: true,
                start_date: true,
                end_date: true,
                is_current: true,
                description: true
              }
            },
            educations: {
              orderBy: {
                start_date: 'desc'
              },
              select: {
                id: true,
                school_name: true,
                degree: true,
                field_of_study: true,
                start_date: true,
                end_date: true
              }
            },
            skills: {
              select: {
                skill_id: true,
                proficiency: true,
                level: true,
                skills: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              }
            },
            certifications: {
              orderBy: {
                issue_date: 'desc'
              },
              select: {
                id: true,
                name: true,
                issuing_org: true,
                issue_date: true,
                expiry_date: true,
                credential_id: true,
                credential_url: true
              }
            },
            awards: {
              orderBy: {
                date: 'desc'
              },
              select: {
                id: true,
                title: true,
                issuer: true,
                date: true,
                description: true
              }
            }
          }
        },
        resumes: {
          select: {
            id: true,
            title: true,
            file_url: true,
            source_type: true,
            created_at: true
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

    // Format candidate data
    const candidate = {
      profile_id: application!.profiles.id,
      user_id: application!.profiles.user_id,
      full_name: application!.profiles.full_name,
      display_name: application!.profiles.display_name,
      email: application!.profiles.users?.email,
      phone_number: application!.profiles.phone_number,
      avatar_url: application!.profiles.avatar_url,
      headline: application!.profiles.headline,
      bio: application!.profiles.bio,
      years_of_experience: application!.profiles.years_of_experience,
      location_text: application!.profiles.location_text,
      social_links: {
        linkedin_url: application!.profiles.linkedin_url,
        github_url: application!.profiles.github_url,
        personal_website: application!.profiles.personal_website
      },
      experiences: application!.profiles.experiences,
      educations: application!.profiles.educations,
      skills: application!.profiles.skills.map((s: any) => ({
        id: s.skills.id,
        name: s.skills.name,
        category: s.skills.category,
        level: s.level,
        proficiency: s.proficiency
      })),
      certifications: application!.profiles.certifications,
      awards: application!.profiles.awards
    }

    return {
      application: {
        id: application!.id,
        applied_at: application!.applied_at,
        status: application!.status,
        notes: (application!.metadata as any)?.notes || []
      },
      candidate,
      resume: application!.resumes,
      documents: application!.application_documents
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(recruiterId: string, applicationId: string, data: UpdateStatusDTO['body']) {
    // Verify access
    const app = await this.verifyApplicationAccess(applicationId, recruiterId)

    const { status, reason } = data

    // Get current metadata
    const currentApp = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: { metadata: true }
    })

    const currentMetadata = (currentApp?.metadata as any) || {}

    // Update status
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status,
        metadata: reason && reason.trim() !== ''
          ? ({
              ...currentMetadata,
              status_reason: reason.trim()
            } as any)
          : currentMetadata
      },
      include: {
        jobs: {
          select: {
            title: true
          }
        }
      }
    })

    // Send notification to candidate
    if (app.profiles?.user_id) {
      try {
        await NotificationHelper.notifyApplicationStatusChanged({
          candidateId: app.profiles.user_id,
          jobTitle: updatedApplication.jobs.title,
          status: status,
          applicationId: applicationId
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return {
      id: updatedApplication.id,
      status: updatedApplication.status,
      updated_at: new Date()
    }
  }

  /**
   * Update application stage
   */
  async updateApplicationStage(recruiterId: string, applicationId: string, data: UpdateStageDTO['body']) {
    // Verify access
    await this.verifyApplicationAccess(applicationId, recruiterId)

    const { stage_id, status, feedback, rating, interviewer_notes, completed_at } = data

    // Verify stage belongs to application
    const stage = await prisma.application_stages.findFirst({
      where: {
        id: stage_id,
        application_id: applicationId
      }
    })

    if (!stage) {
      throw new HttpError('Stage not found', HTTP_STATUS.NOT_FOUND)
    }

    // Update stage
    const updatedStage = await prisma.application_stages.update({
      where: { id: stage_id },
      data: {
        status,
        feedback,
        rating,
        interviewer_notes,
        completed_at: completed_at ? new Date(completed_at) : status === 'completed' ? new Date() : undefined
      }
    })

    return updatedStage
  }

  /**
   * Create new application stage
   */
  async createApplicationStage(recruiterId: string, applicationId: string, data: CreateStageDTO['body']) {
    // Verify access
    const app = await this.verifyApplicationAccess(applicationId, recruiterId)

    const { stage_name, stage_order, scheduled_at, interviewer_notes } = data

    // Create stage
    const newStage = await prisma.application_stages.create({
      data: {
        application_id: applicationId,
        stage_name,
        stage_order,
        status: scheduled_at ? 'scheduled' : 'pending',
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        interviewer_notes
      }
    })

    // Send notification to candidate if interview is scheduled
    if (scheduled_at) {
      try {
        const application = await prisma.applications.findUnique({
          where: { id: applicationId },
          include: {
            jobs: {
              select: {
                title: true
              }
            }
          }
        })

        if (application && app.profiles?.user_id) {
          await NotificationHelper.notifyInterviewScheduled({
            candidateId: app.profiles.user_id,
            jobTitle: application.jobs.title,
            scheduledAt: scheduled_at,
            applicationId: applicationId,
            stageId: newStage.id
          })
        }
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return newStage
  }

  /**
   * Add internal notes to application
   */
  async addApplicationNotes(recruiterId: string, applicationId: string, data: AddNotesDTO['body']) {
    // Verify access
    await this.verifyApplicationAccess(applicationId, recruiterId)

    const { note } = data

    // Get current metadata
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: { metadata: true }
    })

    const currentMetadata = (application?.metadata as any) || {}
    const notes = currentMetadata.notes || []

    // Add new note
    const newNote = {
      id: `note_${Date.now()}`,
      content: note,
      created_by: recruiterId,
      created_at: new Date().toISOString()
    }

    notes.push(newNote)

    // Update application
    await prisma.applications.update({
      where: { id: applicationId },
      data: {
        metadata: {
          ...currentMetadata,
          notes
        } as any
      }
    })

    return newNote
  }

  /**
   * Contact candidate
   */
  async contactCandidate(recruiterId: string, applicationId: string, data: ContactCandidateDTO['body']) {
    // Verify access
    const app = await this.verifyApplicationAccess(applicationId, recruiterId)

    if (!app.profiles?.user_id) {
      throw new HttpError('Candidate user not found', HTTP_STATUS.NOT_FOUND)
    }

    const { subject, message, send_email } = data

    // Create notification
    const notificationContent = `${subject}: ${message}`

    try {
      await prisma.notifications.create({
        data: {
          user_id: app.profiles.user_id,
          type: 'application_contact',
          content: notificationContent,
          read: false
        }
      })
    } catch (error) {
      console.error('Failed to create notification:', error)
    }

    // TODO: Implement email sending if send_email is true
    // This would require an email service integration

    return {
      notification_id: 'created',
      email_sent: send_email,
      sent_at: new Date()
    }
  }

  /**
   * Bulk update applications
   */
  async bulkUpdateApplications(recruiterId: string, data: BulkUpdateDTO) {
    const { application_ids, action, reason } = data

    // Verify all applications belong to recruiter's jobs
    const applications = await prisma.applications.findMany({
      where: {
        id: { in: application_ids },
        jobs: {
          companies: {
            recruiter_id: recruiterId
          }
        }
      },
      select: {
        id: true,
        profile_id: true,
        profiles: {
          select: {
            user_id: true
          }
        },
        jobs: {
          select: {
            title: true
          }
        }
      }
    })

    if (applications.length !== application_ids.length) {
      throw new HttpError(
        'Some applications not found or you do not have permission to access them',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Determine status based on action
    let status: application_status
    switch (action) {
      case 'accept':
        status = application_status.accepted
        break
      case 'reject':
        status = application_status.rejected
        break
      case 'review':
        status = application_status.reviewed
        break
      default:
        throw new HttpError('Invalid action', HTTP_STATUS.BAD_REQUEST)
    }

    // Update all applications
    await prisma.applications.updateMany({
      where: {
        id: { in: application_ids }
      },
      data: {
        status
      }
    })

    // Send notifications to all candidates
    for (const app of applications) {
      if (app.profiles?.user_id) {
        try {
          await NotificationHelper.notifyApplicationStatusChanged({
            candidateId: app.profiles.user_id,
            jobTitle: app.jobs.title,
            status: status,
            applicationId: app.id
          })
        } catch (error) {
          console.error(`Failed to send notification for application ${app.id}:`, error)
        }
      }
    }

    return {
      updated_count: applications.length,
      failed: []
    }
  }
}
