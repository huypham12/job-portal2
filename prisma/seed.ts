// prisma/seed.ts
import { PrismaClient, user_role, job_type, job_status, application_status } from '../generated/prisma'

// Khởi tạo Prisma Client
const prisma = new PrismaClient()

// Hàm main để thực thi logic seed
async function main() {
  console.log(`Bắt đầu quá trình seeding...`)

  // --- 1. Xóa dữ liệu cũ (ĐỂ TEST) ---
  // Trong môi trường dev, xóa dữ liệu cũ để seed lại từ đầu
  // Lưu ý thứ tự xóa ngược với thứ tự tạo
  await prisma.applications.deleteMany({})
  await prisma.job_skills.deleteMany({})
  await prisma.resumes.deleteMany({})
  await prisma.jobs.deleteMany({})
  await prisma.companies.deleteMany({})
  await prisma.skills.deleteMany({})
  await prisma.users.deleteMany({})

  console.log('Đã xóa dữ liệu cũ.')

  // --- 2. Tạo Kỹ năng (Skills) ---
  const skillFE = await prisma.skills.create({
    data: {
      name: 'ReactJS',
      category: 'Frontend'
    }
  })

  const skillBE = await prisma.skills.create({
    data: {
      name: 'Node.js',
      category: 'Backend'
    }
  })
  console.log(`Đã tạo kỹ năng: ${skillFE.name}, ${skillBE.name}`)

  // --- 3. Tạo Users (Admin, Recruiter, Candidate) ---
  // LƯU Ý: Trong thực tế, bạn phải hash mật khẩu.
  // Ở đây chúng ta dùng mật khẩu giả 'password123' đã được hash (giả lập).
  // Ví dụ hash cho 'password123' (bạn nên dùng bcrypt trong app thật)
  const fakePasswordHash = '$2b$10$E.h.kvS.g.fNl3iQ.Nkm2.Kz.aY.Y.4Y0.k.E.h.kvS.g.fNl3iQ'

  const adminUser = await prisma.users.create({
    data: {
      email: 'admin@jobportal.com',
      password_hash: fakePasswordHash,
      role: user_role.admin,
      verified: true
    }
  })

  const recruiterUser = await prisma.users.create({
    data: {
      email: 'recruiter@company-a.com',
      password_hash: fakePasswordHash,
      role: user_role.recruiter,
      verified: true,
      // Tạo Profile đi kèm
      profiles: {
        create: {
          name: 'Hoàng Văn Recruiter',
          phone: '0987654321'
        }
      }
    }
  })

  const candidateUser = await prisma.users.create({
    data: {
      email: 'candidate@gmail.com',
      password_hash: fakePasswordHash,
      role: user_role.candidate,
      verified: true,
      profiles: {
        create: {
          name: 'Nguyễn Văn Candidate',
          phone: '0123456789',
          experience_years: 2
        }
      }
    }
  })
  console.log(`Đã tạo users: ${adminUser.email}, ${recruiterUser.email}, ${candidateUser.email}`)

  // --- 4. Tạo Công ty (Company) ---
  const companyA = await prisma.companies.create({
    data: {
      name: 'Công ty A (TNHH)',
      description: 'Chuyên về giải pháp phần mềm ABC.',
      recruiter_id: recruiterUser.id, // Liên kết với tài khoản recruiter
      size: 50
    }
  })
  console.log(`Đã tạo công ty: ${companyA.name}`)

  // --- 5. Tạo Tin tuyển dụng (Job) ---
  // Lưu ý cách chúng ta lồng "connect" để tạo quan hệ Many-to-Many
  const jobBE = await prisma.jobs.create({
    data: {
      title: 'Senior Backend Engineer (Node.js)',
      description: 'Tuyển gấp 5 kỹ sư Node.js...',
      company_id: companyA.id, // Liên kết Job với Company
      job_type: job_type.full_time,
      status: job_status.approved,
      experience_level: 3,
      posted_at: new Date('2025-10-01T09:00:00Z'), // Phải set ngày trong phân vùng
      expires_at: new Date('2025-11-01T09:00:00Z'),
      // Liên kết với Kỹ năng (JobSkills)
      job_skills: {
        create: [
          { skill_id: skillBE.id },
          { skill_id: skillFE.id } // Job này cần cả BE và FE
        ]
      }
    }
  })
  console.log(`Đã tạo job: ${jobBE.title}`)

  // --- 6. Tạo CV (Resume) ---
  const candidateCV = await prisma.resumes.create({
    data: {
      user_id: candidateUser.id,
      file_url: 'https://example.com/cv/nguyen-van-candidate.pdf',
      // Dùng JSONB để lưu nội dung CV đã được phân tích
      content: {
        education: 'Đại học Bách Khoa',
        experience: [{ company: 'Công ty B', title: 'Junior Dev' }],
        skills: ['Node.js', 'ReactJS', 'PostgreSQL']
      }
    }
  })
  console.log(`Đã tạo CV cho: ${candidateUser.email}`)

  // --- 7. Tạo Đơn ứng tuyển (Application) ---
  const application = await prisma.applications.create({
    data: {
      user_id: candidateUser.id,
      job_id: jobBE.id,
      job_posted_at: jobBE.posted_at, // Cần thiết vì job_id là khóa phân vùng
      resume_id: candidateCV.id,
      status: application_status.pending,
      applied_at: new Date('2025-10-05T10:00:00Z') // Phải set ngày trong phân vùng
    }
  })
  console.log(`Đã tạo đơn ứng tuyển (ID: ${application.id}) thành công.`)

  console.log('Seeding hoàn tất.')
}

// Chạy hàm main và xử lý kết quả
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // Luôn ngắt kết nối Prisma Client khi xong
    await prisma.$disconnect()
  })
