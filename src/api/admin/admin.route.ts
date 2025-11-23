import { Router } from 'express'
import { AdminController } from './admin.controller'
import { authenticateAccessToken, verifiedUserValidator } from '@/shared/middleware/verify.middleware'
import { wrapController } from '@/shared/utils/wrap-controller'
import { adminOnly } from '@/shared/middleware/authorize.middleware'
import { AdminService } from './admin.service'
import { adminUpdateUserBodySchema, getAllUsersQuerySchema, userIdParamsSchema, validate } from './admin.validator'

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

export default adminRouter
