// prisma/seeders/seed-jobs.ts

import { PrismaClient, job_status, LocationType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface JobRequirementJson {
  requirement_type: string
  title: string
  description: string
  is_required?: boolean
  level?: string | null
  years_experience?: number | null
}

interface JobBenefitJson {
  benefit_type: string
  title: string
  description?: string | null
}

interface JobWorkArrangementJson {
  is_remote_allowed?: boolean
  remote_percentage?: number
  flexible_hours?: boolean
  travel_requirement?: string | null
  overtime_expected?: boolean
  shift_type?: string | null
}

interface JobSalaryJson {
  min: number
  max: number
  currency: string
  unit: string
}

interface JobJson {
  company_slug: string
  title: string
  department?: string
  location_province?: string
  job_type?: string
  level?: string
  experience_years_min?: number | null
  experience_years_max?: number | null
  salary?: JobSalaryJson
  tags?: string[]
  skills?: string[]
  description?: string[]
  requirements?: JobRequirementJson[]
  benefits?: JobBenefitJson[]
  work_arrangement?: JobWorkArrangementJson
}

interface CompanyBenefitJson {
  benefit_type: string
  title: string
  description?: string | null
  is_featured?: boolean
}

interface CompanyJson {
  slug: string
  name: string
  description?: string | null
  industry?: string | null
  company_type?: string | null
  size?: number | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_address?: string | null
  website_url?: string | null
  linkedin_url?: string | null
  facebook_url?: string | null
  twitter_url?: string | null
  tax_code?: string | null
  business_license?: string | null
  headquarters_province?: string | null
  founded_year?: number | null
  employee_count_min?: number | null
  employee_count_max?: number | null
  revenue_range?: string | null
  culture_description?: string | null
  benefits?: CompanyBenefitJson[]
}

interface SkillJson {
  name: string
  category?: string | null
}

function normalizeProvinceName(name: string | undefined | null): string | null {
  if (!name) return null
  return name.replace(/^TP\.?\s*/i, '').trim()
}

export async function seedJobs(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Jobs từ jobs.json...')

  try {
    // 1. Đọc dữ liệu JSON
    const jobsPath = path.join(__dirname, 'data', 'jobs.json')
    const companiesPath = path.join(__dirname, 'data', 'companies.json')
    const skillsPath = path.join(__dirname, 'data', 'skills.json')

    const jobsJson: JobJson[] = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'))
    const companiesJson: CompanyJson[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
    const skillsJson: SkillJson[] = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'))

    if (!jobsJson.length) {
      console.warn('  ⚠️ File jobs.json không có dữ liệu. Bỏ qua seed jobs.')
      return
    }

    // 2. Lấy dữ liệu liên quan từ DB
    const provinces = await prisma.locations.findMany({
      where: { type: LocationType.province },
      select: { id: true, name: true }
    })

    const provinceNameToId = new Map<string, string>()
    provinces.forEach((p) => {
      provinceNameToId.set(p.name, p.id)
    })

    const existingSkills = await prisma.skills.findMany({
      select: { id: true, name: true }
    })
    const existingTags = await prisma.tags.findMany({
      select: { id: true, name: true }
    })

    const skillNameToId = new Map<string, string>()
    existingSkills.forEach((s) => {
      skillNameToId.set(s.name.toLowerCase(), s.id)
    })

    const skillMetaByName = new Map<string, SkillJson>()
    skillsJson.forEach((s) => {
      if (s.name) {
        skillMetaByName.set(s.name.toLowerCase(), s)
      }
    })

    const tagNameToId = new Map<string, string>()
    existingTags.forEach((t) => {
      tagNameToId.set(t.name.toLowerCase(), t.id)
    })

    const companyJsonBySlug = new Map<string, CompanyJson>()
    companiesJson.forEach((c) => {
      companyJsonBySlug.set(c.slug, c)
    })

    const companyIdBySlug = new Map<string, string>()

    // 3. Xoá dữ liệu jobs cũ để seed lại từ JSON (cascade sẽ xoá job_* liên quan)
    console.log('  Đang xoá dữ liệu jobs cũ...')
    await prisma.jobs.deleteMany({})

    // 4. Hàm hỗ trợ: lấy company ID theo slug (tìm company đã tồn tại theo tên)
    const getCompanyIdBySlug = async (slug: string): Promise<string | null> => {
      if (companyIdBySlug.has(slug)) {
        return companyIdBySlug.get(slug) as string
      }

      const companyData = companyJsonBySlug.get(slug)
      if (!companyData) {
        console.warn(`  ⚠️ Không tìm thấy company với slug "${slug}" trong companies.json. Bỏ qua job này.`)
        return null
      }

      // Tìm company đã tồn tại theo tên (đã được tạo bởi seed-users.ts)
      const existingCompany = await prisma.companies.findFirst({
        where: { name: companyData.name }
      })

      if (existingCompany) {
        companyIdBySlug.set(slug, existingCompany.id)
        return existingCompany.id
      }

      console.warn(
        `  ⚠️ Không tìm thấy company "${companyData.name}" trong database. Company này nên được tạo trong seed-users.ts.`
      )
      return null
    }

    // 5. Tạo jobs từ dữ liệu JSON
    console.log(`  Đang tạo ${jobsJson.length} jobs từ jobs.json...`)

    for (let i = 0; i < jobsJson.length; i++) {
      const job = jobsJson[i]

      const companyId = await getCompanyIdBySlug(job.company_slug)
      if (!companyId) {
        continue
      }

      const normalizedProvince = normalizeProvinceName(job.location_province)
      const locationId = normalizedProvince ? provinceNameToId.get(normalizedProvince) || null : null

      const salaryData = job.salary
      const salaryRange = salaryData
        ? {
            min: salaryData.min,
            max: salaryData.max,
            currency: salaryData.currency,
            unit: salaryData.unit
          }
        : undefined

      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 6)

      const createdJob = await prisma.jobs.create({
        data: {
          title: job.title,
          description: (job.description || []).join('\n'),
          company_id: companyId,
          location_id: locationId,
          salary_range: salaryRange,
          job_type: job.job_type ? (job.job_type as any) : null,
          experience_level: job.experience_years_min ?? null,
          status: job_status.approved,
          expires_at: expiresAt,
          metadata: {
            department: job.department,
            level: job.level,
            experience_years_min: job.experience_years_min ?? null,
            experience_years_max: job.experience_years_max ?? null,
            work_arrangement: job.work_arrangement ? JSON.parse(JSON.stringify(job.work_arrangement)) : null
          }
        }
      })

      // 5.1. Liên kết skills
      const skills = job.skills || []
      const skillIds: string[] = []

      for (const skillName of skills) {
        const key = skillName.toLowerCase()
        let skillId = skillNameToId.get(key)

        if (!skillId) {
          const meta = skillMetaByName.get(key)
          const newSkill = await prisma.skills.create({
            data: {
              name: skillName,
              category: meta?.category || null
            }
          })
          skillId = newSkill.id
          skillNameToId.set(key, skillId)
        }

        skillIds.push(skillId)
      }

      if (skillIds.length > 0) {
        await prisma.job_skills.createMany({
          data: skillIds.map((skillId) => ({
            job_id: createdJob.id,
            skill_id: skillId
          })),
          skipDuplicates: true
        })
      }

      // 5.2. Liên kết tags
      const tags = job.tags || []
      const tagIds: string[] = []

      for (const tagName of tags) {
        const key = tagName.toLowerCase()
        let tagId = tagNameToId.get(key)

        if (!tagId) {
          const newTag = await prisma.tags.create({
            data: { name: tagName }
          })
          tagId = newTag.id
          tagNameToId.set(key, tagId)
        }

        tagIds.push(tagId)
      }

      if (tagIds.length > 0) {
        await prisma.job_tags.createMany({
          data: tagIds.map((tagId) => ({
            job_id: createdJob.id,
            tag_id: tagId
          })),
          skipDuplicates: true
        })
      }

      // 5.3. Seed job_requirements từ JSON
      if (job.requirements && job.requirements.length > 0) {
        await prisma.job_requirements.createMany({
          data: job.requirements.map((req) => ({
            job_id: createdJob.id,
            requirement_type: req.requirement_type,
            title: req.title,
            description: req.description || null,
            is_required: req.is_required ?? true,
            level: req.level || null,
            years_experience: req.years_experience ?? null
          }))
        })
      }

      // 5.4. Seed job_benefits từ JSON
      if (job.benefits && job.benefits.length > 0) {
        await prisma.job_benefits.createMany({
          data: job.benefits.map((b) => ({
            job_id: createdJob.id,
            benefit_type: b.benefit_type,
            title: b.title,
            description: b.description || null,
            value_amount: null
            // value_currency sẽ dùng default "VND"
          }))
        })
      }

      // 5.5. Seed job_work_arrangements từ JSON
      if (job.work_arrangement) {
        const wa = job.work_arrangement
        await prisma.job_work_arrangements.create({
          data: {
            job_id: createdJob.id,
            is_remote_allowed: wa.is_remote_allowed ?? false,
            remote_percentage: wa.remote_percentage ?? 0,
            flexible_hours: wa.flexible_hours ?? false,
            travel_requirement: wa.travel_requirement || null,
            overtime_expected: wa.overtime_expected ?? false,
            shift_type: wa.shift_type || null
          }
        })
      }

      if ((i + 1) % 10 === 0 || i === jobsJson.length - 1) {
        console.log(`    ... Đã tạo ${i + 1} / ${jobsJson.length} jobs`)
      }
    }

    console.log(`  Seed ${jobsJson.length} jobs từ jobs.json hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu jobs từ jobs.json:', error)
    throw error
  }
}
