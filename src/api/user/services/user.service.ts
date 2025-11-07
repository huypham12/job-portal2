import { prisma } from '@/config/database.service'
export class UserService {
  getUserById = async (userId: string) => {
    return await prisma.users.findUnique({
      where: {
        id: userId
      },

      // Dùng 'select' thay vì 'include' để:
      // 1. Chỉ chọn trường cần thiết (bỏ password_hash)
      // 2. Lấy được cả các relation lồng nhau
      select: {
        // 1. Thông tin User cốt lõi
        id: true,
        email: true,
        role: true,
        verified: true,

        // 2. Lấy Profile (chung cho cả 2 vai trò)
        profiles: {
          select: {
            name: true,
            phone: true,
            metadata: true // (chứa avatar, bio...)
          }
        },

        // 3. Lấy Công ty (Recruiter sẽ có, Candidate là mảng rỗng [])
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            size: true
          }
        },

        // 4. Lấy CV (Candidate sẽ có, Recruiter là mảng rỗng [])
        resumes: {
          select: {
            id: true,
            content: true, // (JSONB chứa skills, experience_years)
            file_url: true,
            updated_at: true
          },
          orderBy: {
            updated_at: 'desc' // Lấy CV mới nhất lên đầu
          }
        }
      }
    })
  }

  updateUserById = async (userId: string, updatedData: Partial<{ email: string; role: string }>) => {}

  // Thêm mới: cập nhật/khởi tạo profile theo user_id
  async updateProfileForUser(
    userId: string,
    data: {
      name?: string
      phone?: string
      location_id?: string | null
      metadata?: Record<string, any>
    }
  ) {
    // Lọc bỏ các field undefined để tránh overwrite ngoài ý muốn
    const cleaned = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)) as typeof data

    const existing = await prisma.profiles.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' }
    })

    if (existing) {
      const updated = await prisma.profiles.update({
        where: { id: existing.id },
        data: {
          ...cleaned,
          updated_at: new Date()
        },
        select: {
          id: true,
          user_id: true,
          name: true,
          phone: true,
          location_id: true,
          metadata: true,
          updated_at: true,
          created_at: true
        }
      })
      return updated
    }

    const created = await prisma.profiles.create({
      data: {
        user_id: userId,
        ...cleaned
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        phone: true,
        location_id: true,
        metadata: true,
        updated_at: true,
        created_at: true
      }
    })
    return created
  }
}
