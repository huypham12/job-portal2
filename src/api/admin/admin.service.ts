import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { Prisma, user_role } from '@prisma/client'
import { AdminUpdateUserBody } from './dto/admin.dto'

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
}
