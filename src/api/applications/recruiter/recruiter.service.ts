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
  BulkUpdateDTO,
  CompareCandidatesDTO,
  ShortlistCandidateDTO,
  GetShortlistedDTO
} from './recruiter.validator'
import { Prisma, application_status } from '@prisma/client'
import { NotificationHelper } from '@/shared/helpers/notification.helper'
import { elasticsearchSyncService } from '@/shared/services/elasticsearch-sync.service'
import { applicationToESDoc } from '@/shared/utils/es-transformers'

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
    const {
      page = 1,
      limit = 20,
      status,
      stage,
      skills,
      experience_min,
      experience_max,
      education_level,
      location,
      salary_min,
      salary_max,
      has_rating,
      rating_min,
      applied_after,
      applied_before,
      sort_by = 'applied_at',
      order = 'desc'
    } = filters

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

    // Advanced filters - build profiles filter separately
    const profilesFilter: Prisma.profilesWhereInput = {}

    if (skills && skills.length > 0) {
      profilesFilter.skills = {
        some: {
          skills: {
            name: { in: skills }
          }
        }
      }
    }

    if (experience_min !== undefined || experience_max !== undefined) {
      profilesFilter.years_of_experience = {
        ...(experience_min !== undefined && { gte: experience_min }),
        ...(experience_max !== undefined && { lte: experience_max })
      }
    }

    if (education_level && education_level.length > 0) {
      profilesFilter.educations = {
        some: {
          degree: { in: education_level }
        }
      }
    }

    if (location) {
      profilesFilter.location_text = {
        contains: location,
        mode: 'insensitive'
      }
    }

    if (salary_min !== undefined || salary_max !== undefined) {
      profilesFilter.desired_salary_min = {
        ...(salary_min !== undefined && { gte: salary_min }),
        ...(salary_max !== undefined && { lte: salary_max })
      }
    }

    // Apply profiles filter if any conditions were set
    if (Object.keys(profilesFilter).length > 0) {
      where.profiles = profilesFilter
    }

    if (has_rating === true) {
      where.application_stages = {
        some: {
          rating: { not: null }
        }
      }
    }

    if (rating_min !== undefined) {
      where.application_stages = {
        some: {
          rating: { gte: rating_min }
        }
      }
    }

    if (applied_after || applied_before) {
      where.applied_at = {
        ...(applied_after && { gte: new Date(applied_after) }),
        ...(applied_before && { lte: new Date(applied_before) })
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
    } else if (sort_by === 'experience') {
      orderBy = { profiles: { years_of_experience: order } }
    } else if (sort_by === 'salary') {
      orderBy = { profiles: { desired_salary_max: order } }
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
            desired_salary_min: true,
            desired_currency: true,
            location_text: true,
            user_id: true,
            users: {
              select: {
                email: true
              }
            },
            skills: {
              select: {
                skills: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              },
              take: 10 // Limit skills for performance
            },
            educations: {
              select: {
                degree: true
              },
              take: 5
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
          profile_id: app.profiles?.id,
          user_id: app.profiles?.user_id,
          display_name: app.profiles?.display_name || app.profiles?.full_name,
          full_name: app.profiles?.full_name,
          avatar_url: app.profiles?.avatar_url,
          headline: app.profiles?.headline,
          years_of_experience: app.profiles?.years_of_experience,
          location: app.profiles?.location_text,
          salary_expectation: app.profiles?.desired_salary_min
            ? {
                min: app.profiles.desired_salary_min,
                currency: app.profiles.desired_currency || 'VND'
              }
            : null,
          top_skills: app.profiles.skills.slice(0, 5).map((s: any) => s.skills.name),
          education_levels: app.profiles.educations.map((e: any) => e.degree).filter(Boolean),
          email: app.profiles.users?.email
        },
        resume: app.resumes,
        current_stage: app.application_stages[0] || null,
        has_notes: metadata?.notes ? metadata.notes.length > 0 : false,
        has_rating: app.application_stages.some((stage: any) => stage.rating !== null)
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

    // Update view tracking
    const currentApp = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: { view_count: true, first_viewed_at: true }
    })

    const updateData: any = {
      last_viewed_at: new Date(),
      view_count: { increment: 1 }
    }

    if (!currentApp?.first_viewed_at) {
      updateData.first_viewed_at = new Date()
    }

    await prisma.applications.update({
      where: { id: applicationId },
      data: updateData
    })

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
        metadata:
          reason && reason.trim() !== ''
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
        const statusDisplayMap: Record<string, string> = {
          reviewed: 'Đã xem',
          rejected: 'Đã từ chối',
          interviewing: 'Đang phỏng vấn',
          offered: 'Đã gửi offer',
          accepted: 'Đã chấp nhận'
        }

        await NotificationHelper.notifyApplicationStatusChanged({
          candidateId: app.profiles.user_id,
          jobTitle: updatedApplication.jobs.title,
          status: status,
          applicationId: applicationId,
          statusDisplay: statusDisplayMap[status] || status,
          reason: data.reason
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    // Sync to Elasticsearch
    setImmediate(async () => {
      try {
        // Re-fetch complete application data for ES sync
        const fullApplication = await prisma.applications.findUnique({
          where: { id: applicationId },
          include: {
            jobs: {
              select: {
                title: true,
                job_type: true,
                salary_range: true,
                companies: { select: { name: true } },
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
          await elasticsearchSyncService.syncToElasticsearch('applications', applicationId, esDocument)
        }
      } catch (error) {
        console.error(`Application status update sync failed: ${applicationId}`, error)
      }
    })

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

    const {
      stage_name,
      stage_order,
      scheduled_at,
      location,
      meeting_link,
      meeting_password,
      interviewer_id,
      duration_minutes,
      interviewer_notes
    } = data

    // Create stage
    const newStage = await prisma.application_stages.create({
      data: {
        application_id: applicationId,
        stage_name,
        stage_order,
        status: scheduled_at ? 'scheduled' : 'pending',
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        location: location || null,
        meeting_link: meeting_link || null,
        meeting_password: meeting_password || null,
        interviewer_id: interviewer_id || null,
        duration_minutes: duration_minutes || null,
        interviewer_notes
      }
    })

    // Update application status to interviewing if not already
    await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status: application_status.interviewing
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

  /**
   * Compare multiple candidates side-by-side
   */
  async compareCandidates(recruiterId: string, data: CompareCandidatesDTO) {
    const { application_ids, criteria } = data

    // Verify all applications belong to recruiter's jobs and get full data
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
            desired_salary_min: true,
            desired_currency: true,
            location_text: true,
            linkedin_url: true,
            github_url: true,
            personal_website: true,
            skills: {
              select: {
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
            experiences: {
              select: {
                id: true,
                company_name: true,
                position: true,
                start_date: true,
                end_date: true,
                is_current: true,
                description: true
              },
              orderBy: {
                start_date: 'desc'
              }
            },
            educations: {
              select: {
                id: true,
                school_name: true,
                degree: true,
                field_of_study: true,
                start_date: true,
                end_date: true
              },
              orderBy: {
                start_date: 'desc'
              }
            },
            certifications: {
              select: {
                id: true,
                name: true,
                issuing_org: true,
                issue_date: true,
                expiry_date: true,
                credential_id: true,
                credential_url: true
              },
              orderBy: {
                issue_date: 'desc'
              }
            },
            awards: {
              select: {
                id: true,
                title: true,
                issuer: true,
                date: true,
                description: true
              },
              orderBy: {
                date: 'desc'
              }
            }
          }
        },
        application_stages: {
          select: {
            id: true,
            stage_name: true,
            status: true,
            scheduled_at: true,
            completed_at: true,
            rating: true,
            feedback: true
          },
          orderBy: {
            stage_order: 'desc'
          },
          take: 1
        }
      }
    })

    if (applications.length !== application_ids.length) {
      throw new HttpError(
        'Some applications not found or you do not have permission to access them',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Transform data for comparison
    const candidates = applications.map((app) => {
      const profile = app.profiles
      const currentStage = app.application_stages[0]

      const candidateData: any = {
        application_id: app.id,
        applied_at: app.applied_at,
        status: app.status,
        current_stage: currentStage || null,
        profile: {
          id: profile.id,
          user_id: profile.user_id,
          display_name: profile.display_name || profile.full_name,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          headline: profile.headline,
          bio: profile.bio,
          contact: {
            phone_number: profile.phone_number,
            linkedin_url: profile.linkedin_url,
            github_url: profile.github_url,
            personal_website: profile.personal_website
          },
          location: profile.location_text,
          years_of_experience: profile.years_of_experience,
          salary_expectation: profile.desired_salary_min
            ? {
                min: profile.desired_salary_min,
                currency: profile.desired_currency || 'VND'
              }
            : null
        }
      }

      // Add criteria-specific data
      if (criteria.includes('skills')) {
        candidateData.skills = profile.skills.map((s) => ({
          id: s.skills.id,
          name: s.skills.name,
          category: s.skills.category,
          level: s.level,
          proficiency: s.proficiency
        }))
      }

      if (criteria.includes('experience')) {
        candidateData.experience = profile.experiences
      }

      if (criteria.includes('education')) {
        candidateData.education = profile.educations
      }

      if (criteria.includes('certifications')) {
        candidateData.certifications = profile.certifications
      }

      if (criteria.includes('awards')) {
        candidateData.awards = profile.awards
      }

      return candidateData
    })

    // Calculate comparison insights
    const insights = this.generateComparisonInsights(candidates, criteria)

    return {
      candidates,
      criteria,
      insights,
      compared_at: new Date()
    }
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(candidates: any[], criteria: string[]) {
    const insights: any = {
      total_candidates: candidates.length,
      criteria_coverage: {}
    }

    // Skills comparison
    if (criteria.includes('skills')) {
      const allSkills = new Map<string, Set<string>>()
      candidates.forEach((candidate, index) => {
        candidate.skills.forEach((skill: any) => {
          if (!allSkills.has(skill.name)) {
            allSkills.set(skill.name, new Set())
          }
          allSkills.get(skill.name)!.add(`candidate_${index + 1}`)
        })
      })

      const uniqueSkills = Array.from(allSkills.entries()).map(([skill, owners]) => ({
        skill,
        candidates: Array.from(owners),
        coverage: owners.size / candidates.length
      }))

      insights.criteria_coverage.skills = {
        unique_skills: uniqueSkills.length,
        most_common: uniqueSkills.filter((s) => s.coverage > 0.5).sort((a, b) => b.coverage - a.coverage),
        unique_to_candidates: uniqueSkills.filter((s) => s.coverage === 0.5)
      }
    }

    // Experience comparison
    if (criteria.includes('experience')) {
      const experienceStats = candidates.map((candidate, index) => ({
        candidate_index: index + 1,
        years_experience: candidate.profile.years_of_experience || 0,
        positions: candidate.experience.length,
        current_company: candidate.experience.find((exp: any) => exp.is_current)?.company_name
      }))

      insights.criteria_coverage.experience = {
        average_years: experienceStats.reduce((sum, stat) => sum + stat.years_experience, 0) / candidates.length,
        max_years: Math.max(...experienceStats.map((s) => s.years_experience)),
        min_years: Math.min(...experienceStats.map((s) => s.years_experience)),
        experience_distribution: experienceStats
      }
    }

    // Education comparison
    if (criteria.includes('education')) {
      const educationStats = candidates.map((candidate, index) => ({
        candidate_index: index + 1,
        degrees: candidate.education.map((edu: any) => edu.degree).filter(Boolean),
        fields: candidate.education.map((edu: any) => edu.field_of_study).filter(Boolean),
        schools: candidate.education.map((edu: any) => edu.school_name)
      }))

      const allDegrees = new Set(educationStats.flatMap((s) => s.degrees))
      const allFields = new Set(educationStats.flatMap((s) => s.fields))

      insights.criteria_coverage.education = {
        degree_distribution: Array.from(allDegrees).map((degree) => ({
          degree,
          count: educationStats.filter((s) => s.degrees.includes(degree)).length
        })),
        field_distribution: Array.from(allFields).map((field) => ({
          field,
          count: educationStats.filter((s) => s.fields.includes(field)).length
        }))
      }
    }

    return insights
  }

  /**
   * Add or remove candidate from shortlist
   */
  async shortlistCandidate(recruiterId: string, data: ShortlistCandidateDTO) {
    const { application_id, action, note } = data

    // Verify access to application
    const app = await this.verifyApplicationAccess(application_id, recruiterId)

    if (action === 'add') {
      // Check if already shortlisted
      const existingShortlist = await prisma.connection_interests.findFirst({
        where: {
          candidate_id: app.profile_id,
          recruiter_id: recruiterId,
          interest_type: 'shortlist',
          job_id: app.job_id
        }
      })

      if (existingShortlist) {
        throw new HttpError('Candidate is already shortlisted for this job', HTTP_STATUS.CONFLICT)
      }

      // Create shortlist entry
      const shortlist = await prisma.connection_interests.create({
        data: {
          candidate_id: app.profile_id,
          recruiter_id: recruiterId,
          job_id: app.job_id,
          interest_type: 'shortlist',
          status: 'active',
          message: note || 'Added to shortlist'
        }
      })

      return {
        id: shortlist.id,
        action: 'added',
        shortlisted_at: shortlist.created_at
      }
    } else {
      // Remove from shortlist
      const deleted = await prisma.connection_interests.deleteMany({
        where: {
          candidate_id: app.profile_id,
          recruiter_id: recruiterId,
          interest_type: 'shortlist',
          job_id: app.job_id
        }
      })

      if (deleted.count === 0) {
        throw new HttpError('Candidate is not shortlisted for this job', HTTP_STATUS.NOT_FOUND)
      }

      return {
        action: 'removed',
        removed_count: deleted.count
      }
    }
  }

  /**
   * Get shortlisted candidates
   */
  async getShortlistedCandidates(recruiterId: string, filters: GetShortlistedDTO) {
    const { job_id, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      recruiter_id: recruiterId,
      interest_type: 'shortlist',
      status: 'active'
    }

    if (job_id) {
      where.job_id = job_id
    }

    // Get total count
    const total = await prisma.connection_interests.count({ where })

    // Get shortlisted candidates with application details
    const shortlists = await prisma.connection_interests.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        candidate: {
          select: {
            id: true,
            user_id: true,
            full_name: true,
            display_name: true,
            avatar_url: true,
            headline: true,
            years_of_experience: true,
            location_text: true,
            desired_salary_min: true,
            desired_currency: true,
            skills: {
              select: {
                skills: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              },
              take: 5
            }
          }
        },
        jobs: {
          select: {
            id: true,
            title: true,
            company_id: true,
            companies: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Format response
    const formattedShortlists = shortlists.map((shortlist) => ({
      id: shortlist.id,
      shortlisted_at: shortlist.created_at,
      note: shortlist.message,
      candidate: {
        profile_id: shortlist.candidate.id,
        display_name: shortlist.candidate.display_name || shortlist.candidate.full_name,
        avatar_url: shortlist.candidate.avatar_url,
        headline: shortlist.candidate.headline,
        years_of_experience: shortlist.candidate.years_of_experience,
        location: shortlist.candidate.location_text,
        salary_expectation: shortlist.candidate.desired_salary_min
          ? {
              min: shortlist.candidate.desired_salary_min,
              currency: shortlist.candidate.desired_currency || 'VND'
            }
          : null,
        top_skills: shortlist.candidate.skills.map((s: any) => s.skills.name)
      },
      job: shortlist.jobs
        ? {
            id: shortlist.jobs.id,
            title: shortlist.jobs.title,
            company_name: shortlist.jobs.companies?.name
          }
        : null,
      application: null // TODO: Fetch application data separately if needed
    }))

    return {
      data: formattedShortlists,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        per_page: limit
      }
    }
  }

  /**
   * Get full application timeline with all stages and activities
   */
  async getApplicationTimeline(recruiterId: string, applicationId: string) {
    // Verify access
    await this.verifyApplicationAccess(applicationId, recruiterId)

    // Get application with job details
    const application = await prisma.applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        job_id: true,
        profile_id: true,
        status: true,
        applied_at: true,
        first_viewed_at: true,
        last_viewed_at: true,
        view_count: true,
        metadata: true,
        jobs: {
          select: {
            title: true,
            companies: {
              select: {
                name: true
              }
            }
          }
        },
        profiles: {
          select: {
            display_name: true,
            full_name: true
          }
        }
      }
    })

    if (!application) {
      throw new HttpError('Application not found', HTTP_STATUS.NOT_FOUND)
    }

    // Get all stages with full details
    const stages = await prisma.application_stages.findMany({
      where: { application_id: applicationId },
      orderBy: [{ stage_order: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        stage_name: true,
        stage_order: true,
        status: true,
        scheduled_at: true,
        completed_at: true,
        feedback: true,
        rating: true,
        interviewer_notes: true,
        candidate_feedback: true,
        location: true,
        meeting_link: true,
        meeting_password: true,
        interviewer_id: true,
        duration_minutes: true,
        result: true,
        created_at: true
      }
    })

    // Build timeline events
    const timelineEvents: any[] = []

    // Application submitted event
    timelineEvents.push({
      id: `application_submitted_${application.id}`,
      type: 'application_submitted',
      title: 'Application Submitted',
      description: `${application.profiles.display_name || application.profiles.full_name} applied for ${application.jobs.title}`,
      timestamp: application.applied_at,
      data: {
        job_title: application.jobs.title,
        company_name: application.jobs.companies?.name
      }
    })

    // First viewed event
    if (application.first_viewed_at) {
      timelineEvents.push({
        id: `first_viewed_${application.id}`,
        type: 'application_viewed',
        title: 'Application First Viewed',
        description: 'Recruiter viewed this application for the first time',
        timestamp: application.first_viewed_at,
        data: {
          view_count: application.view_count
        }
      })
    }

    // Stage events
    for (const stage of stages) {
      // Stage created/scheduled
      if (stage.scheduled_at) {
        timelineEvents.push({
          id: `stage_scheduled_${stage.id}`,
          type: 'stage_scheduled',
          title: `${stage.stage_name} Scheduled`,
          description: stage.scheduled_at
            ? `Interview scheduled for ${new Date(stage.scheduled_at).toLocaleString()}`
            : `${stage.stage_name} stage initiated`,
          timestamp: stage.created_at,
          data: {
            stage_id: stage.id,
            stage_name: stage.stage_name,
            stage_order: stage.stage_order,
            scheduled_at: stage.scheduled_at,
            location: stage.location,
            meeting_link: stage.meeting_link,
            interviewer_id: stage.interviewer_id,
            duration_minutes: stage.duration_minutes
          }
        })
      }

      // Stage completed
      if (stage.completed_at) {
        timelineEvents.push({
          id: `stage_completed_${stage.id}`,
          type: 'stage_completed',
          title: `${stage.stage_name} Completed`,
          description: stage.result ? `Result: ${stage.result}` : `${stage.stage_name} stage completed`,
          timestamp: stage.completed_at,
          data: {
            stage_id: stage.id,
            stage_name: stage.stage_name,
            status: stage.status,
            result: stage.result,
            rating: stage.rating,
            feedback: stage.feedback,
            candidate_feedback: stage.candidate_feedback
          }
        })
      }
    }

    // Status change events from metadata
    const metadata = application.metadata as any
    if (metadata?.status_history) {
      for (const statusChange of metadata.status_history) {
        timelineEvents.push({
          id: `status_change_${statusChange.timestamp}`,
          type: 'status_changed',
          title: 'Status Changed',
          description: `Application status changed to ${statusChange.status}`,
          timestamp: new Date(statusChange.timestamp),
          data: {
            old_status: statusChange.old_status,
            new_status: statusChange.status,
            reason: statusChange.reason
          }
        })
      }
    }

    // Notes events
    if (metadata?.notes) {
      for (const note of metadata.notes) {
        timelineEvents.push({
          id: `note_${note.id}`,
          type: 'note_added',
          title: 'Note Added',
          description: note.content,
          timestamp: new Date(note.created_at),
          data: {
            note_id: note.id,
            content: note.content,
            created_by: note.created_by
          }
        })
      }
    }

    // Sort timeline events by timestamp
    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      application: {
        id: application.id,
        status: application.status,
        applied_at: application.applied_at,
        view_count: application.view_count,
        candidate_name: application.profiles.display_name || application.profiles.full_name,
        job_title: application.jobs.title,
        company_name: application.jobs.companies?.name
      },
      stages: stages.map((stage) => ({
        id: stage.id,
        stage_name: stage.stage_name,
        stage_order: stage.stage_order,
        status: stage.status,
        scheduled_at: stage.scheduled_at,
        completed_at: stage.completed_at,
        result: stage.result,
        rating: stage.rating,
        feedback: stage.feedback,
        interviewer_notes: stage.interviewer_notes,
        candidate_feedback: stage.candidate_feedback,
        meeting_details:
          stage.location || stage.meeting_link
            ? {
                location: stage.location,
                meeting_link: stage.meeting_link,
                meeting_password: stage.meeting_password,
                duration_minutes: stage.duration_minutes
              }
            : null
      })),
      timeline: timelineEvents,
      summary: {
        total_stages: stages.length,
        completed_stages: stages.filter((s) => s.status === 'completed').length,
        pending_stages: stages.filter((s) => s.status === 'pending' || s.status === 'scheduled').length,
        average_rating:
          stages.filter((s) => s.rating).length > 0
            ? stages.reduce((sum, s) => sum + (s.rating || 0), 0) / stages.filter((s) => s.rating).length
            : null
      }
    }
  }
}
