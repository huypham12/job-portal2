import { DeleteHandler, GetHandler, PatchHandler } from '@/types/controller-handler.type'
import { AdminService } from './admin.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { AdminUpdateUserBody, GetAllUsersQuery, UserIdParams } from './dto/admin.dto'

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
}
