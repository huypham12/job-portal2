import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { Prisma, user_role } from '@prisma/client'
import { AdminUpdateUserBody } from './admin.validator'
import { elasticsearchSyncService } from '@/config/elasticsearch-sync.service'
import { jobToESDoc } from '@/shared/utils/es-transformers'

// Định nghĩa kiểu dữ liệu cho queryOptions mà controller gửi xuống
interface QueryOptions {
  pagination: { page: number; limit: number }
  search?: string
  filters: {
    role?: user_role
    verified?: boolean
    deleted?: boolean
  }
}

export class AdminService {
  /**
   * @description Lấy danh sách người dùng từ CSDL, tách biệt logic khỏi controller
   */
  public async getAllUsers(options: QueryOptions) {
    const { pagination, search, filters } = options
    const { page, limit } = pagination
    const skip = (page - 1) * limit

    // 1. Xây dựng điều kiện WHERE động
    const where: Prisma.usersWhereInput = {}

    // Lọc theo search (email hoặc tên trong profile)
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profiles: { full_name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Lọc theo role
    if (filters.role) {
      where.role = filters.role
    }

    // Lọc theo trạng thái 'verified'
    if (filters.verified !== undefined) {
      where.verified = filters.verified
    }

    // Lọc theo trạng thái 'deleted' (khóa)
    if (filters.deleted !== undefined) {
      where.deleted = filters.deleted
    }

    // 2. Thực hiện 2 truy vấn song song: 1 lấy data, 1 đếm tổng số
    const [users, total] = await Promise.all([
      // Truy vấn lấy data
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        // Chỉ chọn các trường cần thiết, **TUYỆT ĐỐI KHÔNG** trả về password_hash
        select: {
          id: true,
          email: true,
          role: true,
          verified: true,
          deleted: true,
          created_at: true,
          updated_at: true,
          profiles: {
            // Join với bảng profile để lấy tên
            select: {
              full_name: true,
              phone_number: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      // Truy vấn đếm tổng số
      prisma.users.count({ where })
    ])

    // 3. Tính toán phân trang
    const totalPages = Math.ceil(total / limit)

    return {
      users,
      total,
      page,
      limit,
      totalPages
    }
  }

  /**
   * @description Lấy thông tin chi tiết của một user (dùng cho admin)
   * @param userId - ID của user cần xem
   */
  public async getUserDetailsById(userId: string) {
    const user = await prisma.users.findUnique({
      where: {
        id: userId
      },
      // Chỉ chọn các trường cần thiết, **TUYỆT ĐỐI KHÔNG** trả về password_hash
      select: {
        id: true,
        email: true,
        role: true,
        verified: true,
        deleted: true, // Trạng thái khóa (soft delete)
        created_at: true,
        updated_at: true,
        profiles: {
          select: {
            id: true,
            full_name: true,
            phone_number: true,
            location_id: true
          }
        }
        // Bạn có thể join thêm thông tin nếu cần, ví dụ:
        // _count: {
        //   select: {
        //     applications: true // Đếm số đơn ứng tuyển
        //   }
        // }
      }
    })

    return user
  }

  /**
   * @description (Admin) Cập nhật thông tin user (Khóa, Mở khóa, đổi Role)
   * @param userId - ID của user cần cập nhật
   * @param body - Dữ liệu cập nhật (từ DTO AdminUpdateUserBody)
   */
  public async adminUpdateUser(userId: string, body: AdminUpdateUserBody) {
    try {
      const updatedUser = await prisma.users.update({
        where: { id: userId },
        // Chỉ cập nhật các trường có trong body (role, verified, deleted)
        data: body,
        select: {
          id: true,
          email: true,
          role: true,
          verified: true,
          deleted: true,
          updated_at: true
        }
      })
      return updatedUser
    } catch (error) {
      // Xử lý lỗi nếu không tìm thấy user để update
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error // Ném các lỗi khác
    }
  }

  /**
   * @description (Admin) Xóa vĩnh viễn một user
   * @param userId - ID của user cần xóa
   */
  public async deleteUserById(userId: string) {
    try {
      await prisma.users.delete({
        where: { id: userId }
      })
      // Xóa thành công, không cần trả về gì
    } catch (error) {
      // Xử lý lỗi nếu không tìm thấy user để xóa
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error // Ném các lỗi khác
    }
  }

  // Chúng ta sẽ thêm các phương thức khác như getUserById, lockUser... vào đây

  // ========================== JOB MANAGEMENT METHODS ==========================

  /**
   * @description Lấy danh sách tất cả công việc với phân trang và bộ lọc
   * @param options - Tùy chọn tìm kiếm và lọc
   */
  public async getAllJobs(options: {
    pagination: { page: number; limit: number }
    search?: string
    filters: {
      status?: 'draft' | 'approved' | 'closed'
      deleted?: boolean
    }
  }) {
    const { pagination, search, filters } = options
    const { page, limit } = pagination
    const skip = (page - 1) * limit

    const where: Prisma.jobsWhereInput = {}

    // Lọc theo search (title hoặc description)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Lọc theo status
    if (filters.status) {
      where.status = filters.status
    }

    // Lọc theo deleted
    if (filters.deleted !== undefined) {
      where.deleted = filters.deleted
    }

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          company_id: true,
          location_id: true,
          salary_range: true,
          job_type: true,
          experience_level: true,
          posted_at: true,
          expires_at: true,
          status: true,
          metadata: true,
          deleted: true,
          updated_at: true,
              companies: {
                include: {
                  users: true,
                  company_details: true,
                  // keep basic fields accessible
                }
              },
          locations: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          posted_at: 'desc'
        }
      }),
      prisma.jobs.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      jobs,
      total,
      page,
      limit,
      totalPages
    }
  }

  /**
   * @description Lấy danh sách tin chờ duyệt (status = draft)
   */
  public async getPendingJobs(options: { pagination: { page: number; limit: number } }) {
    const { pagination } = options
    const { page, limit } = pagination
    const skip = (page - 1) * limit

    const where: Prisma.jobsWhereInput = {
      status: 'draft',
      deleted: false
    }

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          company_id: true,
          location_id: true,
          salary_range: true,
          job_type: true,
          experience_level: true,
          posted_at: true,
          expires_at: true,
          status: true,
          metadata: true,
          updated_at: true,
              companies: {
                include: {
                  users: true,
                  company_details: true,
                  // keep basic fields accessible
                }
              },
          locations: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          posted_at: 'desc'
        }
      }),
      prisma.jobs.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      jobs,
      total,
      page,
      limit,
      totalPages
    }
  }

  /**
   * @description Lấy chi tiết một công việc (admin view - bao gồm cả tin đã xóa)
   * @param jobId - ID của job cần xem
   */
  public async getJobDetailsById(jobId: string) {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            size: true,
            contact_email: true,
            contact_phone: true
          }
        },
        locations: {
          select: {
            id: true,
            name: true,
            parent_id: true
          }
        },
        job_skills: {
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        },
        job_requirements: true,
        job_benefits: true,
        job_work_arrangements: true,
        _count: {
          select: {
            applications: true,
            saved_jobs: true,
            job_views: true
          }
        }
      }
    })

    return job
  }

  /**
   * @description (Admin) Duyệt tin tuyển dụng
   * @param jobId - ID của job cần duyệt
   */
  public async approveJob(jobId: string) {
    try {
      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: {
          status: 'approved',
          updated_at: new Date()
        },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true
        }
      })

      // Sync to Elasticsearch after status update
      setImmediate(async () => {
        try {
          // Get full job data for sync
          const jobWithRelations = await prisma.jobs.findUnique({
            where: { id: jobId },
            include: {
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
                  name: true,
                  type: true
                }
              },
              job_requirements: true,
              job_benefits: true,
              job_skills: {
                include: {
                  skills: true
                }
              },
              job_categories: {
                include: {
                  categories: true
                }
              },
              job_work_arrangements: true
            }
          })

          if (jobWithRelations) {
            // Ensure recruiter ownership present
            if (!((jobWithRelations.companies as any)?.recruiter_id)) {
              try {
                if (jobWithRelations.company_id) {
                  const companyRecord = await prisma.companies.findUnique({
                    where: { id: jobWithRelations.company_id as string },
                    select: { recruiter_id: true }
                  })
                  if (companyRecord && jobWithRelations.companies) {
                    ;(jobWithRelations.companies as any).recruiter_id = companyRecord.recruiter_id
                  }
                }
              } catch (e) {
                // ignore and let transformer handle missing ownership
              }
            }

            const esDocument = jobToESDoc(jobWithRelations)
            await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
            console.log(`✅ Synced job approval for ${jobId} to Elasticsearch`)
          }
        } catch (error) {
          console.error(`❌ Failed to sync job approval for ${jobId} to Elasticsearch:`, error)
        }
      })

      return updatedJob
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * @description (Admin) Từ chối tin tuyển dụng
   * @param jobId - ID của job cần từ chối
   * @param reason - Lý do từ chối
   */
  public async rejectJob(jobId: string, reason: string) {
    try {
      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: {
          status: 'closed',
          metadata: {
            rejection_reason: reason,
            rejected_at: new Date().toISOString()
          } as any,
          updated_at: new Date()
        },
        select: {
          id: true,
          title: true,
          status: true,
          metadata: true,
          updated_at: true
        }
      })

      // Sync to Elasticsearch after status update
      setImmediate(async () => {
        try {
          // Get full job data for sync
          const jobWithRelations = await prisma.jobs.findUnique({
            where: { id: jobId },
            include: {
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
                  name: true,
                  type: true
                }
              },
              job_requirements: true,
              job_benefits: true,
              job_skills: {
                include: {
                  skills: true
                }
              },
              job_categories: {
                include: {
                  categories: true
                }
              },
              job_work_arrangements: true
            }
          })

          if (jobWithRelations) {
            // Ensure recruiter ownership present
            if (!((jobWithRelations.companies as any)?.recruiter_id)) {
              try {
                if (jobWithRelations.company_id) {
                  const companyRecord = await prisma.companies.findUnique({
                    where: { id: jobWithRelations.company_id as string },
                    select: { recruiter_id: true }
                  })
                  if (companyRecord && jobWithRelations.companies) {
                    ;(jobWithRelations.companies as any).recruiter_id = companyRecord.recruiter_id
                  }
                }
              } catch (e) {
                // ignore and let transformer handle missing ownership
              }
            }

            const esDocument = jobToESDoc(jobWithRelations)
            await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
            console.log(`✅ Synced job rejection for ${jobId} to Elasticsearch`)
          }
        } catch (error) {
          console.error(`❌ Failed to sync job rejection for ${jobId} to Elasticsearch:`, error)
        }
      })

      return updatedJob
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * @description (Admin) Gán nhãn cho tin (Hot/Urgent/Featured)
   * @param jobId - ID của job cần gán nhãn
   * @param labels - Các nhãn cần gán
   */
  public async updateJobLabels(jobId: string, labels: { hot?: boolean; urgent?: boolean; featured?: boolean }) {
    try {
      // Lấy metadata hiện tại
      const currentJob = await prisma.jobs.findUnique({
        where: { id: jobId },
        select: { metadata: true }
      })

      if (!currentJob) {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Merge metadata cũ với labels mới
      const currentMetadata = (currentJob.metadata as any) || {}
      const updatedMetadata = {
        ...currentMetadata,
        labels: {
          ...(currentMetadata.labels || {}),
          ...labels
        }
      }

      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: {
          metadata: updatedMetadata as any,
          updated_at: new Date()
        },
        select: {
          id: true,
          title: true,
          metadata: true,
          updated_at: true
        }
      })

      // TODO: Đồng bộ với Elasticsearch
      return updatedJob
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * @description (Admin) Gỡ tin vi phạm (soft delete)
   * @param jobId - ID của job cần gỡ
   */
  public async deleteJobForViolation(jobId: string) {
    try {
      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: {
          deleted: true,
          status: 'closed',
          updated_at: new Date()
        },
        select: {
          id: true,
          title: true,
          deleted: true,
          status: true,
          updated_at: true
        }
      })
      // TODO: Xóa khỏi Elasticsearch
      return updatedJob
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }

  /**
   * @description (Admin) Khôi phục tin đã xóa
   * @param jobId - ID của job cần khôi phục
   */
  public async restoreJob(jobId: string) {
    try {
      const updatedJob = await prisma.jobs.update({
        where: { id: jobId },
        data: {
          deleted: false,
          updated_at: new Date()
        },
        select: {
          id: true,
          title: true,
          deleted: true,
          status: true,
          updated_at: true
        }
      })
      // TODO: Đồng bộ lại với Elasticsearch nếu status = approved
      return updatedJob
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(MESSAGES.JOB_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      throw error
    }
  }
}
