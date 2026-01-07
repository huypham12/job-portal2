import { Router } from 'express'
import { AdminController } from './admin.controller'
import { authenticateAccessToken, verifiedUserValidator } from '@/middleware/verify.middleware'
import { wrapController } from '@/shared/utils/wrap-controller'
import { adminOnly } from '@/middleware/authorize.middleware'
import { AdminService } from './admin.service'
import {
  adminUpdateUserBodySchema,
  getAllJobsQuerySchema,
  getAllUsersQuerySchema,
  jobIdParamsSchema,
  jobRejectBodySchema,
  userIdParamsSchema,
  validate
} from './admin.validator'

const adminRouter = Router()
const adminService = new AdminService()
const adminController = new AdminController(adminService)

// xem danh sách tất cả người dùng
// {{host}}/api/admin/users?page=1&limit=20&role=candidate&verified=true
adminRouter.get(
  '/users',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ query: getAllUsersQuerySchema }),
  wrapController(adminController.getAllUserController)
)

adminRouter.get(
  '/users/:userId',
  authenticateAccessToken, // 1. Xác thực token
  verifiedUserValidator, // 2. (Optional, nhưng đã có) Kiểm tra admin đã verify
  adminOnly, // 3. Kiểm tra vai trò admin
  validate({ params: userIdParamsSchema }),
  wrapController(adminController.getUserDetailsController) // 5. Handler
)

/**
 * @route PATCH /api/admin/users/:userId
 * @desc Admin cập nhật user (Khóa, Mở khóa, đổi Role)
 * @access Private (Admin only)
 */
adminRouter.patch(
  '/users/:userId',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({
    params: userIdParamsSchema, // <-- THAY THẾ (Validate params)
    body: adminUpdateUserBodySchema // <-- THAY THẾ (Validate body)
  }),
  wrapController(adminController.adminUpdateUserController)
)

/**
 * @route DELETE /api/admin/users/:userId
 * @desc Admin xóa vĩnh viễn user
 * @access Private (Admin only)
 */
adminRouter.delete(
  '/users/:userId',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: userIdParamsSchema }), // <-- THAY THẾ
  wrapController(adminController.deleteUserByIdController)
)

// ========================== JOB MANAGEMENT ROUTES ==========================

/**
 * @route GET /api/admin/jobs
 * @desc Lấy danh sách tất cả công việc với phân trang và bộ lọc
 * @access Private (Admin only)
 * @query page, limit, search, status, deleted
 */
adminRouter.get(
  '/jobs',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ query: getAllJobsQuerySchema }),
  wrapController(adminController.getAllJobsController)
)

/**
 * @route GET /api/admin/jobs/pending
 * @desc Lấy danh sách tin chờ duyệt
 * @access Private (Admin only)
 * @query page, limit
 */
adminRouter.get(
  '/jobs/pending',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ query: getAllJobsQuerySchema }),
  wrapController(adminController.getPendingJobsController)
)

/**
 * @route GET /api/admin/jobs/:id
 * @desc Lấy chi tiết một công việc (admin view)
 * @access Private (Admin only)
 */
adminRouter.get(
  '/jobs/:id',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: jobIdParamsSchema }),
  wrapController(adminController.getJobDetailsController)
)

/**
 * @route PATCH /api/admin/jobs/:id/approve
 * @desc Duyệt tin tuyển dụng → Sync ES
 * @access Private (Admin only)
 */
adminRouter.patch(
  '/jobs/:id/approve',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: jobIdParamsSchema }),
  wrapController(adminController.approveJobController)
)

/**
 * @route PATCH /api/admin/jobs/:id/reject
 * @desc Từ chối tin tuyển dụng
 * @access Private (Admin only)
 * @body reason
 */
adminRouter.patch(
  '/jobs/:id/reject',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({
    params: jobIdParamsSchema,
    body: jobRejectBodySchema
  }),
  wrapController(adminController.rejectJobController)
)

/**
 * @route DELETE /api/admin/jobs/:id/violation
 * @desc Gỡ tin vi phạm (soft delete)
 * @access Private (Admin only)
 */
adminRouter.delete(
  '/jobs/:id/violation',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: jobIdParamsSchema }),
  wrapController(adminController.deleteJobForViolationController)
)

/**
 * @route POST /api/admin/jobs/:id/restore
 * @desc Khôi phục tin đã xóa
 * @access Private (Admin only)
 */
adminRouter.post(
  '/jobs/:id/restore',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: jobIdParamsSchema }),
  wrapController(adminController.restoreJobController)
)

/**
 * @route DELETE /api/admin/jobs/:id/hard-delete
 * @desc Xóa vĩnh viễn tin tuyển dụng
 * @access Private (Admin only)
 */
adminRouter.delete(
  '/jobs/:id/hard-delete',
  authenticateAccessToken,
  verifiedUserValidator,
  adminOnly,
  validate({ params: jobIdParamsSchema }),
  wrapController(adminController.hardDeleteJobController)
)

export default adminRouter
