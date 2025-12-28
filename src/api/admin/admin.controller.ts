import { DeleteHandler, GetHandler, PatchHandler, PostHandler } from '@/types/controller-handler.type'
import { AdminService } from './admin.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import {
  AdminUpdateUserBody,
  GetAllJobsQuery,
  GetAllUsersQuery,
  JobIdParams,
  JobLabelBody,
  JobRejectBody,
  UserIdParams
} from './admin.validator'

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * @description Lấy danh sách tất cả người dùng với phân trang, tìm kiếm và bộ lọc
   * @route GET /admin/users
   * @access Admin
   */
  getAllUserController: GetHandler<any, GetAllUsersQuery> = async (req, res) => {
    const { page = 1, limit = 10, search, role, verified, deleted } = req.validatedQuery

    const queryOptions = {
      pagination: { page, limit },
      search,
      filters: { role, verified, deleted }
    }

    const result = await this.adminService.getAllUsers(queryOptions)

    res.json({
      message: 'Lấy danh sách người dùng thành công.',
      data: {
        users: result.users,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    })
  }

  /**
   * @description Lấy thông tin chi tiết một người dùng
   * @route GET /admin/users/:userId
   * @access Admin
   */
  getUserDetailsController: GetHandler<any, UserIdParams> = async (req, res) => {
    const { userId } = req.validatedParams
    const userDetails = await this.adminService.getUserDetailsById(userId)

    if (!userDetails) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: MESSAGES.USER_NOT_FOUND
      })
      return
    }

    res.json({
      message: 'Lấy thông tin chi tiết người dùng thành công.',
      data: userDetails
    })
  }

  /**
   * @description (Admin) Cập nhật thông tin user (Khóa, Mở khóa, đổi Role)
   * @route PATCH /admin/users/:userId
   * @access Admin
   */
  adminUpdateUserController: PatchHandler<AdminUpdateUserBody, any, UserIdParams> = async (req, res) => {
    const { userId } = req.validatedParams
    const body = req.validatedBody

    const updatedUser = await this.adminService.adminUpdateUser(userId, body)

    res.json({
      message: 'Cập nhật tài khoản thành công.',
      data: updatedUser
    })
  }

  /**
   * @description (Admin) Xóa vĩnh viễn một người dùng
   * @route DELETE /admin/users/:userId
   * @access Admin
   */
  deleteUserByIdController: DeleteHandler<undefined, any, UserIdParams> = async (req, res) => {
    const { userId } = req.validatedParams
    await this.adminService.deleteUserById(userId)

    res.json({
      message: 'Xóa tài khoản người dùng thành công.'
    } as any)
  }
  // ========================== JOB MANAGEMENT CONTROLLERS ==========================

  /**
   * @description Lấy danh sách tất cả công việc với phân trang và bộ lọc
   * @route GET /admin/jobs
   * @access Admin
   */
  getAllJobsController: GetHandler<any, GetAllJobsQuery> = async (req, res) => {
    const { page = 1, limit = 10, search, status, deleted } = req.validatedQuery

    const queryOptions = {
      pagination: { page, limit },
      search,
      filters: { status, deleted }
    }

    const result = await this.adminService.getAllJobs(queryOptions)

    res.json({
      message: 'Lấy danh sách công việc thành công.',
      data: {
        jobs: result.jobs,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    })
  }

  /**
   * @description Lấy danh sách tin chờ duyệt
   * @route GET /admin/jobs/pending
   * @access Admin
   */
  getPendingJobsController: GetHandler<any, GetAllJobsQuery> = async (req, res) => {
    const { page = 1, limit = 10 } = req.validatedQuery

    const queryOptions = {
      pagination: { page, limit }
    }

    const result = await this.adminService.getPendingJobs(queryOptions)

    res.json({
      message: 'Lấy danh sách tin chờ duyệt thành công.',
      data: {
        jobs: result.jobs,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    })
  }

  /**
   * @description Lấy chi tiết một công việc (admin view)
   * @route GET /admin/jobs/:id
   * @access Admin
   */
  getJobDetailsController: GetHandler<any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const jobDetails = await this.adminService.getJobDetailsById(id)

    if (!jobDetails) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: MESSAGES.JOB_NOT_FOUND
      })
      return
    }

    res.json({
      message: 'Lấy thông tin chi tiết công việc thành công.',
      data: jobDetails
    })
  }

  /**
   * @description (Admin) Duyệt tin tuyển dụng
   * @route PATCH /admin/jobs/:id/approve
   * @access Admin
   */
  approveJobController: PatchHandler<undefined, any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const updatedJob = await this.adminService.approveJob(id)

    res.json({
      message: 'Duyệt tin tuyển dụng thành công.',
      data: updatedJob
    })
  }

  /**
   * @description (Admin) Từ chối tin tuyển dụng
   * @route PATCH /admin/jobs/:id/reject
   * @access Admin
   */
  rejectJobController: PatchHandler<JobRejectBody, any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const { reason } = req.validatedBody

    const updatedJob = await this.adminService.rejectJob(id, reason)

    res.json({
      message: 'Từ chối tin tuyển dụng thành công.',
      data: updatedJob
    })
  }

  /**
   * @description (Admin) Gán nhãn cho tin (Hot/Urgent/Featured)
   * @route PATCH /admin/jobs/:id/label
   * @access Admin
   */
  updateJobLabelsController: PatchHandler<JobLabelBody, any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const labels = req.validatedBody

    const updatedJob = await this.adminService.updateJobLabels(id, labels)

    res.json({
      message: 'Cập nhật nhãn công việc thành công.',
      data: updatedJob
    })
  }

  /**
   * @description (Admin) Gỡ tin vi phạm (soft delete)
   * @route DELETE /admin/jobs/:id/violation
   * @access Admin
   */
  deleteJobForViolationController: DeleteHandler<undefined, any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const updatedJob = await this.adminService.deleteJobForViolation(id)

    res.json({
      message: 'Gỡ tin vi phạm thành công.',
      data: updatedJob
    } as any)
  }

  /**
   * @description (Admin) Khôi phục tin đã xóa
   * @route POST /admin/jobs/:id/restore
   * @access Admin
   */
  restoreJobController: PostHandler<undefined, any, JobIdParams> = async (req, res) => {
    const { id } = req.validatedParams
    const updatedJob = await this.adminService.restoreJob(id)

    res.json({
      message: 'Khôi phục tin tuyển dụng thành công.',
      data: updatedJob
    })
  }
}
