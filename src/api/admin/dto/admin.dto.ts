// src/modules/admin/admin.dto.ts
import { user_role } from '@prisma/client'

/**
 * -----------------------------------------------------------------
 * 1. DTO cho "Xem danh sách tài khoản" (GET /admin/users)
 * -----------------------------------------------------------------
 * Định nghĩa các query params sau khi được Zod transform.
 * Note: page và limit được transform từ string thành number
 * verified và deleted được transform từ 'true'|'false' thành boolean
 */
export interface GetAllUsersQuery {
  page?: number // Sau khi Zod transform
  limit?: number // Sau khi Zod transform
  search?: string
  role?: user_role
  verified?: boolean // Sau khi Zod transform
  deleted?: boolean // Sau khi Zod transform
}

/**
 * -----------------------------------------------------------------
 * 2. DTO cho Params chứa :userId
 * -----------------------------------------------------------------
 * DTO này sẽ được tái sử dụng cho MỌI route cần `userId` trong URL
 * (Xem chi tiết, Khóa/Mở khóa, Xóa vĩnh viễn).
 */
export interface UserIdParams {
  userId: string
}

/**
 * -----------------------------------------------------------------
 * 3. DTO cho "Khóa tài khoản" (PATCH /admin/users/:userId)
 * -----------------------------------------------------------------
 * "Khóa tài khoản" tương ứng với việc "soft delete" (cập nhật cờ `deleted` = true).
 * DTO này cũng cho phép Admin cập nhật các trường khác nếu cần.
 *
 * @field `role` - Thay đổi vai trò (candidate, recruiter, admin)
 * @field `verified` - Xác thực email thủ công
 * @field `deleted` - `true` để Khóa, `false` để Mở khóa
 */
export interface AdminUpdateUserBody {
  role?: user_role
  verified?: boolean
  deleted?: boolean
}

/**
 * -----------------------------------------------------------------
 * 4. DTO cho "Xóa tài khoản" (DELETE /admin/users/:userId)
 * -----------------------------------------------------------------
 * Use case "Xóa tài khoản" sẽ tương ứng với "hard delete" (xóa vĩnh viễn khỏi DB).
 * Route này thường không cần Request Body, nó chỉ cần `UserIdParams`.
 */
// (Không cần DTO cho body, chỉ cần `UserIdParams` cho params)
