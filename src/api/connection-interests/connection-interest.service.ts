import { prisma } from '@/config/database.service'
import { CreateInterestDTO, GetInterestsDTO } from './connection-interest.validator'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { NotificationHelper } from '@/shared/helpers/notification.helper'

/**
 * Create a new connection interest
 */
export const createConnectionInterest = async (recruiter_id: string, data: CreateInterestDTO) => {
  // Verify candidate exists
  const candidate = await prisma.profiles.findUnique({
    where: { id: data.candidate_id }
  })

  if (!candidate) {
    throw new HttpError('Candidate not found', HTTP_STATUS.NOT_FOUND)
  }

  // If job_id provided, verify job exists and belongs to recruiter
  if (data.job_id) {
    const job = await prisma.jobs.findFirst({
      where: {
        id: data.job_id,
        companies: {
          recruiter_id: recruiter_id
        }
      }
    })

    if (!job) {
      throw new HttpError('Job not found or you do not have permission', HTTP_STATUS.NOT_FOUND)
    }
  }

  // Check for duplicate interest
  const existingInterest = await prisma.connection_interests.findFirst({
    where: {
      candidate_id: data.candidate_id,
      recruiter_id,
      job_id: data.job_id || null,
      interest_type: data.interest_type,
      status: {
        in: ['pending', 'accepted']
      }
    }
  })

  if (existingInterest) {
    throw new HttpError('You already have an active interest with this candidate', HTTP_STATUS.CONFLICT)
  }

  // Create connection interest with expiry in 7 days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const createdInterest = await prisma.connection_interests.create({
    data: {
      candidate_id: data.candidate_id,
      recruiter_id,
      job_id: data.job_id,
      interest_type: data.interest_type,
      message: data.message,
      contact_info: data.contact_info || {},
      status: 'pending',
      expires_at: expiresAt
    }
  })

  // Fetch the created interest with relations
  const interest = await prisma.connection_interests.findUnique({
    where: { id: createdInterest.id },
    include: {
      candidate: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          users: {
            select: {
              id: true,
              email: true
            }
          }
        }
      },
      recruiter: {
        select: {
          id: true,
          email: true,
          profiles: {
            select: {
              full_name: true,
              avatar_url: true
            }
          }
        }
      },
      jobs: {
        select: {
          id: true,
          title: true,
          company_id: true
        }
      }
    }
  })

  if (!interest) {
    throw new HttpError('Failed to create connection interest', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Send notification to candidate
  await NotificationHelper.notifyConnectionInterestReceived({
    candidateId: interest.candidate.users.id,
    recruiterName: interest.recruiter.profiles?.full_name || interest.recruiter.email,
    interestId: interest.id,
    jobId: interest.jobs?.id
  })

  return interest
}

/**
 * Get connection interests list with filters
 */
export const getConnectionInterests = async (
  user_id: string,
  role: 'candidate' | 'recruiter',
  filters: GetInterestsDTO
) => {
  const { page = 1, limit = 20, status, interest_type, role: filterRole } = filters

  const skip = (page - 1) * limit

  // Build where clause based on role
  const whereClause: any = {}

  if (role === 'recruiter') {
    if (filterRole === 'sent' || !filterRole) {
      whereClause.recruiter_id = user_id
    }
    if (filterRole === 'received') {
      // Recruiters don't receive interests
      return { data: [], total: 0, page, limit }
    }
  } else {
    // Candidate
    // Get profile_id from user_id
    const profile = await prisma.profiles.findFirst({
      where: { user_id }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    if (filterRole === 'received' || !filterRole) {
      whereClause.candidate_id = profile.id
    }
    if (filterRole === 'sent') {
      // Candidates don't send interests
      return { data: [], total: 0, page, limit }
    }
  }

  // Add additional filters
  if (status) {
    whereClause.status = status
  }
  if (interest_type) {
    whereClause.interest_type = interest_type
  }

  const [total, interests] = await Promise.all([
    prisma.connection_interests.count({ where: whereClause }),
    prisma.connection_interests.findMany({
      where: whereClause,
      include: {
        candidate: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
            headline: true,
            users: {
              select: {
                id: true,
                email: true
              }
            }
          }
        },
        recruiter: {
          select: {
            id: true,
            email: true,
            profiles: {
              select: {
                full_name: true,
                avatar_url: true,
                headline: true
              }
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
                id: true,
                name: true,
                logo_url: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit
    })
  ])

  return {
    data: interests,
    total,
    page,
    limit
  }
}

/**
 * Get connection interest by ID
 */
export const getConnectionInterestById = async (
  user_id: string,
  role: 'candidate' | 'recruiter',
  interest_id: string
) => {
  const interest = await prisma.connection_interests.findUnique({
    where: { id: interest_id },
    include: {
      candidate: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          headline: true,
          users: {
            select: {
              id: true,
              email: true
            }
          }
        }
      },
      recruiter: {
        select: {
          id: true,
          email: true,
          profiles: {
            select: {
              full_name: true,
              avatar_url: true,
              headline: true
            }
          }
        }
      },
      jobs: {
        select: {
          id: true,
          title: true,
          description: true,
          company_id: true,
          companies: {
            select: {
              id: true,
              name: true,
              logo_url: true
            }
          }
        }
      }
    }
  })

  if (!interest) {
    throw new HttpError('Connection interest not found', HTTP_STATUS.NOT_FOUND)
  }

  // Verify access
  if (role === 'recruiter') {
    if (interest.recruiter_id !== user_id) {
      throw new HttpError('You do not have permission to view this interest', HTTP_STATUS.FORBIDDEN)
    }
  } else {
    // Get candidate profile_id
    const profile = await prisma.profiles.findFirst({
      where: { user_id }
    })

    if (!profile || interest.candidate_id !== profile.id) {
      throw new HttpError('You do not have permission to view this interest', HTTP_STATUS.FORBIDDEN)
    }
  }

  return interest
}

/**
 * Respond to connection interest (accept/reject)
 */
export const respondToInterest = async (
  user_id: string,
  interest_id: string,
  action: 'accept' | 'reject',
  message?: string
) => {
  // Get candidate profile
  const profile = await prisma.profiles.findFirst({
    where: { user_id }
  })

  if (!profile) {
    throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
  }

  const interest = await prisma.connection_interests.findUnique({
    where: { id: interest_id },
    include: {
      candidate: true,
      recruiter: {
        select: {
          id: true,
          email: true,
          profiles: {
            select: {
              full_name: true
            }
          }
        }
      },
      jobs: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  if (!interest) {
    throw new HttpError('Connection interest not found', HTTP_STATUS.NOT_FOUND)
  }

  // Verify this interest is for the current candidate
  if (interest.candidate_id !== profile.id) {
    throw new HttpError('You do not have permission to respond to this interest', HTTP_STATUS.FORBIDDEN)
  }

  // Check if already responded or expired
  if (interest.status !== 'pending') {
    throw new HttpError(`This interest has already been ${interest.status}`, HTTP_STATUS.BAD_REQUEST)
  }

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'

  // Update interest
  const updatedInterest = await prisma.connection_interests.update({
    where: { id: interest_id },
    data: {
      status: newStatus,
      responded_at: new Date(),
      message: message || interest.message
    },
    include: {
      candidate: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          users: {
            select: {
              id: true,
              email: true
            }
          }
        }
      },
      recruiter: {
        select: {
          id: true,
          email: true,
          profiles: {
            select: {
              full_name: true,
              avatar_url: true
            }
          }
        }
      },
      jobs: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  // Send notification to recruiter
  if (action === 'accept') {
    await NotificationHelper.notifyConnectionInterestAccepted({
      recruiterId: updatedInterest.recruiter_id,
      candidateName: updatedInterest.candidate.full_name,
      interestId: updatedInterest.id
    })
  } else {
    await NotificationHelper.notifyConnectionInterestRejected({
      recruiterId: updatedInterest.recruiter_id,
      candidateName: updatedInterest.candidate.full_name,
      interestId: updatedInterest.id
    })
  }

  return updatedInterest
}

/**
 * Delete connection interest
 */
export const deleteConnectionInterest = async (user_id: string, interest_id: string) => {
  const interest = await prisma.connection_interests.findUnique({
    where: { id: interest_id }
  })

  if (!interest) {
    throw new HttpError('Connection interest not found', HTTP_STATUS.NOT_FOUND)
  }

  // Verify this interest belongs to the recruiter
  if (interest.recruiter_id !== user_id) {
    throw new HttpError('You do not have permission to delete this interest', HTTP_STATUS.FORBIDDEN)
  }

  // Can only delete pending interests
  if (interest.status !== 'pending') {
    throw new HttpError('Can only delete pending interests', HTTP_STATUS.BAD_REQUEST)
  }

  await prisma.connection_interests.delete({
    where: { id: interest_id }
  })

  return { message: 'Connection interest deleted successfully' }
}

/**
 * Get connection interest statistics
 */
export const getConnectionInterestStats = async (user_id: string, role: 'candidate' | 'recruiter') => {
  const whereClause: any = {}

  if (role === 'recruiter') {
    whereClause.recruiter_id = user_id
  } else {
    // Get candidate profile
    const profile = await prisma.profiles.findFirst({
      where: { user_id }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    whereClause.candidate_id = profile.id
  }

  const [total, pending, accepted, rejected, expired] = await Promise.all([
    prisma.connection_interests.count({ where: whereClause }),
    prisma.connection_interests.count({ where: { ...whereClause, status: 'pending' } }),
    prisma.connection_interests.count({ where: { ...whereClause, status: 'accepted' } }),
    prisma.connection_interests.count({ where: { ...whereClause, status: 'rejected' } }),
    prisma.connection_interests.count({ where: { ...whereClause, status: 'expired' } })
  ])

  // Get acceptance rate
  const totalResponded = accepted + rejected
  const acceptanceRate = totalResponded > 0 ? (accepted / totalResponded) * 100 : 0

  // Get average response time for responded interests
  const respondedInterests = await prisma.connection_interests.findMany({
    where: {
      ...whereClause,
      status: { in: ['accepted', 'rejected'] },
      responded_at: { not: null }
    },
    select: {
      created_at: true,
      responded_at: true
    }
  })

  let avgResponseTime = 0
  if (respondedInterests.length > 0) {
    const totalResponseTime = respondedInterests.reduce((sum: number, interest: any) => {
      const responseTime = interest.responded_at!.getTime() - interest.created_at.getTime()
      return sum + responseTime
    }, 0)
    avgResponseTime = totalResponseTime / respondedInterests.length / (1000 * 60 * 60) // Convert to hours
  }

  return {
    total,
    by_status: {
      pending,
      accepted,
      rejected,
      expired
    },
    acceptance_rate: parseFloat(acceptanceRate.toFixed(2)),
    avg_response_time_hours: parseFloat(avgResponseTime.toFixed(2))
  }
}

/**
 * Auto-expire pending interests (for cronjob)
 */
export const autoExpireInterests = async () => {
  const now = new Date()

  const result = await prisma.connection_interests.updateMany({
    where: {
      status: 'pending',
      expires_at: {
        lt: now
      }
    },
    data: {
      status: 'expired'
    }
  })

  console.log(`Auto-expired ${result.count} connection interests`)

  return result.count
}
