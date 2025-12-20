import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import {
  CreateApplicationDTO,
  GetApplicationsDTO,
  GetOffersDTO,
  AcceptOfferDTO,
  DeclineOfferDTO,
  CandidateFeedbackDTO
} from './application.validator'
import { Prisma, application_status } from '@prisma/client'
import { NotificationHelper } from '@/shared/helpers/notification.helper'
import { S3Service } from '../uploads/services/s3.service'

export class ApplicationService {
  /**
   * Create a new job application
   */
  async createApplication(profileId: string, data: CreateApplicationDTO) {
    const { job_id, resume_id, metadata } = data

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
    }

    // Get profile info for notification
    const profile = await prisma.profiles.findUnique({
      where: { id: profileId },
      select: {
        full_name: true
      }
    })

    // Create application
    const application = await prisma.applications.create({
      data: {
        job_id,
        profile_id: profileId,
        resume_id,
        status: application_status.pending,
        metadata: metadata as any,
        version: 1
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
    if (job.companies?.recruiter_id && profile?.full_name) {
      try {
        await NotificationHelper.notifyApplicationReceived({
          recruiterId: job.companies.recruiter_id,
          candidateName: profile.full_name,
          jobTitle: job.title,
          applicationId: application.id,
          jobId: job_id
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
        // Don't throw error, notification failure shouldn't block application creation
      }
    }

    return application
  }

  /**
   * Get list of applications for current user with pagination and filters
   */
  async getApplications(profileId: string, filters: GetApplicationsDTO) {
    const { page = 1, limit = 20, status, sort_by = 'applied_at', order = 'desc' } = filters

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
  async getApplicationById(profileId: string, applicationId: string) {
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
            feedback: true,
            rating: true,
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

    return application
  }

  /**
   * Get application stages history
   */
  async getApplicationStages(profileId: string, applicationId: string) {
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
        feedback: true,
        rating: true,
        interviewer_notes: true,
        created_at: true
      }
    })

    return stages
  }

  /**
   * Get application documents
   */
  async getApplicationDocuments(profileId: string, applicationId: string) {
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
    profileId: string,
    applicationId: string,
    documentType: string,
    file: Express.Multer.File
  ) {
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

    // Don't allow upload if application is rejected
    if (application.status === application_status.rejected) {
      throw new HttpError('Cannot upload documents for rejected applications', HTTP_STATUS.BAD_REQUEST)
    }

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
    if (application.jobs.companies?.recruiter_id && application.profiles?.full_name) {
      try {
        await NotificationHelper.notifyApplicationDocumentUploaded({
          recruiterId: application.jobs.companies.recruiter_id,
          candidateName: application.profiles.full_name,
          jobTitle: application.jobs.title,
          applicationId: applicationId,
          documentType: documentType,
          documentId: document.id
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
        // Don't throw error, notification failure shouldn't block document upload
      }
    }

    return document
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(profileId: string, applicationId: string) {
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

    // Check if already withdrawn
    if (application.is_withdrawn) {
      throw new HttpError('Application has already been withdrawn', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if already accepted - cannot withdraw accepted application
    if (application.status === application_status.accepted) {
      throw new HttpError('Cannot withdraw accepted application', HTTP_STATUS.BAD_REQUEST)
    }

    // Update application with withdrawal flags
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        is_withdrawn: true,
        withdrawn_at: new Date(),
        status: application_status.withdrawn
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
   * Get list of offers for current candidate
   */
  async getOffers(profileId: string, filters: GetOffersDTO) {
    const { page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where: Prisma.applicationsWhereInput = {
      profile_id: profileId,
      status: application_status.offered,
      is_withdrawn: false
    }

    const [offers, total] = await Promise.all([
      prisma.applications.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          offer_sent_at: 'desc'
        },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              description: true,
              job_type: true,
              salary_range: true,
              experience_level: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true
                }
              },
              locations: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.applications.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      offers,
      total,
      page,
      limit,
      totalPages
    }
  }

  /**
   * Accept offer
   */
  async acceptOffer(profileId: string, applicationId: string, data: AcceptOfferDTO['body']) {
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
                recruiter_id: true,
                name: true
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

    // Check if application has an offer
    if (application.status !== application_status.offered || !application.offer_sent_at) {
      throw new HttpError('This application does not have an active offer', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if offer already accepted or declined
    if (application.offer_accepted_at) {
      throw new HttpError('Offer has already been accepted', HTTP_STATUS.BAD_REQUEST)
    }

    if (application.offer_declined_at) {
      throw new HttpError('Offer has already been declined', HTTP_STATUS.BAD_REQUEST)
    }

    // Update application
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status: application_status.accepted,
        offer_accepted_at: new Date(),
        metadata: {
          ...((application.metadata as any) || {}),
          acceptance_message: data.message
        } as any
      },
      include: {
        jobs: {
          select: {
            title: true,
            companies: {
              select: {
                recruiter_id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Send notification to recruiter
    if (application.jobs.companies?.recruiter_id) {
      try {
        await NotificationHelper.notifyOfferAccepted({
          recruiterId: application.jobs.companies.recruiter_id,
          candidateName: application.profiles.full_name,
          jobTitle: application.jobs.title,
          applicationId: applicationId
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return updatedApplication
  }

  /**
   * Decline offer
   */
  async declineOffer(profileId: string, applicationId: string, data: DeclineOfferDTO['body']) {
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
                recruiter_id: true,
                name: true
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

    // Check if application has an offer
    if (application.status !== application_status.offered || !application.offer_sent_at) {
      throw new HttpError('This application does not have an active offer', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if offer already accepted or declined
    if (application.offer_accepted_at) {
      throw new HttpError('Offer has already been accepted', HTTP_STATUS.BAD_REQUEST)
    }

    if (application.offer_declined_at) {
      throw new HttpError('Offer has already been declined', HTTP_STATUS.BAD_REQUEST)
    }

    // Update application
    const updatedApplication = await prisma.applications.update({
      where: { id: applicationId },
      data: {
        status: application_status.rejected,
        offer_declined_at: new Date(),
        rejected_reason: data.reason || 'Candidate declined the offer',
        metadata: {
          ...((application.metadata as any) || {}),
          decline_reason: data.reason
        } as any
      },
      include: {
        jobs: {
          select: {
            title: true,
            companies: {
              select: {
                recruiter_id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Send notification to recruiter
    if (application.jobs.companies?.recruiter_id) {
      try {
        await NotificationHelper.notifyOfferDeclined({
          recruiterId: application.jobs.companies.recruiter_id,
          candidateName: application.profiles.full_name,
          jobTitle: application.jobs.title,
          applicationId: applicationId,
          reason: data.reason
        })
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return updatedApplication
  }

  /**
   * Add candidate feedback for interview stage
   */
  async addCandidateFeedback(profileId: string, applicationId: string, stageId: string, data: CandidateFeedbackDTO['body']) {
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

    // Verify stage belongs to application
    const stage = await prisma.application_stages.findFirst({
      where: {
        id: stageId,
        application_id: applicationId
      }
    })

    if (!stage) {
      throw new HttpError('Stage not found or does not belong to this application', HTTP_STATUS.NOT_FOUND)
    }

    // Update stage with candidate feedback
    const updatedStage = await prisma.application_stages.update({
      where: { id: stageId },
      data: {
        candidate_feedback: data.candidate_feedback
      },
      include: {
        applications: {
          select: {
            jobs: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    return updatedStage
  }
}
