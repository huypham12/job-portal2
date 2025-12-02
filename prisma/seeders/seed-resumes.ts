// prisma/seeders/seed-resumes.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

export async function seedResumes(prisma: PrismaClient) {
  console.log('  Bắt đầu seed dữ liệu Resumes...')

  try {
    // 1. Lấy danh sách profiles của candidates với full data
    const candidateProfiles = await prisma.profiles.findMany({
      where: {
        users: { role: 'candidate' }
      },
      include: {
        users: true,
        experiences: true,
        educations: true,
        skills: { include: { skills: true } },
        certifications: true,
        awards: true
      },
      take: 100 // Chỉ lấy 100 candidate profiles đầu tiên
    })

    if (candidateProfiles.length === 0) {
      console.warn('  ⚠️ Không có candidate profiles nào. Bỏ qua seed resumes.')
      return
    }

    // 2. Tạo resume cho mỗi candidate profile
    console.log(`  Đang tạo resumes cho ${candidateProfiles.length} candidate profiles...`)

    const templates = ['modern', 'classic', 'minimal', 'creative']
    const colorSchemes = ['#3B82F6', '#1F2937', '#000000', '#8B5CF6', '#10B981', '#EF4444']

    for (let i = 0; i < candidateProfiles.length; i++) {
      const profile = candidateProfiles[i]

      // Mỗi candidate có thể có 1-3 CV
      const numResumes = faker.number.int({ min: 1, max: 3 })

      for (let j = 0; j < numResumes; j++) {
        const template = faker.helpers.arrayElement(templates)
        const colorScheme = faker.helpers.arrayElement(colorSchemes)
        const isCreated = faker.datatype.boolean({ probability: 0.7 }) // 70% created, 30% uploaded

        // Build resume content từ profile data
        const resumeContent = isCreated
          ? {
              template: {
                id: template,
                colorScheme: colorScheme,
                fontFamily: faker.helpers.arrayElement(['Inter', 'Roboto', 'Times New Roman', 'Helvetica'])
              },
              layout: {
                type: faker.helpers.arrayElement(['single-column', 'two-column', 'sidebar']),
                columnRatio: [30, 70],
                fontSize: {
                  name: faker.number.int({ min: 24, max: 32 }),
                  heading: faker.number.int({ min: 16, max: 20 }),
                  subheading: faker.number.int({ min: 12, max: 16 }),
                  body: faker.number.int({ min: 10, max: 12 })
                },
                spacing: {
                  sectionGap: faker.number.int({ min: 16, max: 32 }),
                  itemGap: faker.number.int({ min: 8, max: 16 }),
                  lineHeight: faker.number.float({ min: 1.4, max: 1.8, fractionDigits: 1 })
                },
                margins: {
                  top: faker.number.int({ min: 15, max: 30 }),
                  right: faker.number.int({ min: 15, max: 30 }),
                  bottom: faker.number.int({ min: 15, max: 30 }),
                  left: faker.number.int({ min: 15, max: 30 })
                },
                avatarSize: faker.number.int({ min: 80, max: 150 }),
                avatarPosition: faker.helpers.arrayElement(['left', 'center', 'right'])
              },
              personalInfo: {
                fullName: profile.full_name,
                email: profile.users.email,
                phone: profile.phone_number || faker.phone.number(),
                location: profile.location_text || faker.location.city(),
                headline: profile.headline || faker.person.jobTitle(),
                avatar: profile.avatar_url,
                linkedin: profile.linkedin_url,
                github: profile.github_url,
                website: profile.personal_website,
                showAvatar: faker.datatype.boolean({ probability: 0.7 }),
                showSocialLinks: faker.datatype.boolean({ probability: 0.8 })
              },
              summary: profile.bio
                ? {
                    enabled: true,
                    content: profile.bio
                  }
                : undefined,
              experiences:
                profile.experiences.length > 0
                  ? {
                      enabled: true,
                      items: profile.experiences
                        .slice(0, faker.number.int({ min: 2, max: profile.experiences.length }))
                        .map((exp, idx) => ({
                          id: exp.id,
                          companyName: exp.company_name,
                          position: exp.position,
                          startDate: exp.start_date.toISOString().slice(0, 7),
                          endDate: exp.end_date?.toISOString().slice(0, 7),
                          isCurrent: exp.is_current,
                          description: exp.description,
                          displayOrder: idx,
                          isVisible: true
                        }))
                    }
                  : undefined,
              educations:
                profile.educations.length > 0
                  ? {
                      enabled: true,
                      items: profile.educations.map((edu, idx) => ({
                        id: edu.id,
                        schoolName: edu.school_name,
                        degree: edu.degree,
                        fieldOfStudy: edu.field_of_study,
                        startDate: edu.start_date.toISOString().slice(0, 7),
                        endDate: edu.end_date?.toISOString().slice(0, 7),
                        displayOrder: idx,
                        isVisible: true
                      }))
                    }
                  : undefined,
              skills:
                profile.skills.length > 0
                  ? {
                      enabled: true,
                      groupBy: faker.helpers.arrayElement(['category', 'level', 'none']),
                      items: profile.skills
                        .slice(0, faker.number.int({ min: 5, max: profile.skills.length }))
                        .map((ps, idx) => ({
                          id: ps.skill_id,
                          name: ps.skills.name,
                          category: ps.skills.category,
                          level: ps.level,
                          proficiency: ps.proficiency,
                          displayOrder: idx,
                          isVisible: true
                        }))
                    }
                  : undefined,
              certifications:
                profile.certifications.length > 0
                  ? {
                      enabled: faker.datatype.boolean({ probability: 0.6 }),
                      items: profile.certifications.map((cert, idx) => ({
                        id: cert.id,
                        name: cert.name,
                        issuingOrg: cert.issuing_org,
                        issueDate: cert.issue_date.toISOString().slice(0, 10),
                        expiryDate: cert.expiry_date?.toISOString().slice(0, 10),
                        credentialId: cert.credential_id,
                        credentialUrl: cert.credential_url,
                        displayOrder: idx,
                        isVisible: true
                      }))
                    }
                  : undefined,
              awards:
                profile.awards.length > 0
                  ? {
                      enabled: faker.datatype.boolean({ probability: 0.5 }),
                      items: profile.awards.map((award, idx) => ({
                        id: award.id,
                        title: award.title,
                        issuer: award.issuer,
                        date: award.date.toISOString().slice(0, 10),
                        description: award.description,
                        displayOrder: idx,
                        isVisible: true
                      }))
                    }
                  : undefined,
              sectionOrder: [
                'personalInfo',
                'summary',
                'experiences',
                'skills',
                'educations',
                'certifications',
                'awards'
              ].filter((section) => {
                if (section === 'personalInfo') return true
                if (section === 'summary') return !!profile.bio
                if (section === 'experiences') return profile.experiences.length > 0
                if (section === 'educations') return profile.educations.length > 0
                if (section === 'skills') return profile.skills.length > 0
                if (section === 'certifications') return profile.certifications.length > 0
                if (section === 'awards') return profile.awards.length > 0
                return false
              })
            }
          : null

        // Generate file info - uploaded CVs always have file
        const fileUrl = isCreated
          ? faker.datatype.boolean({ probability: 0.3 })
            ? `https://s3.amazonaws.com/job-portal-resumes/${profile.id}/${faker.string.uuid()}.pdf`
            : null
          : `https://s3.amazonaws.com/job-portal-resumes/${profile.id}/${faker.string.uuid()}.pdf` // Uploaded always has file

        const fileName = fileUrl ? `CV_${profile.full_name.replace(/\s+/g, '_')}_${j + 1}.pdf` : null
        const fileSize = fileUrl ? faker.number.int({ min: 500000, max: 3000000 }) : null // 500KB - 3MB

        const title = isCreated
          ? faker.helpers.arrayElement([
              `CV ${profile.full_name}`,
              `Resume ${faker.person.jobTitle()}`,
              `CV ${faker.helpers.arrayElement(['Software Engineer', 'Full Stack Developer', 'Backend Developer'])} ${new Date().getFullYear()}`
            ])
          : `CV ${profile.full_name} (Uploaded)`

        await prisma.resumes.create({
          data: {
            profile_id: profile.id,
            title: title,
            source_type: isCreated ? 'created' : 'uploaded',
            content: resumeContent || undefined, // Use undefined instead of null for Prisma
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize,
            mime_type: fileUrl ? 'application/pdf' : null,
            is_default: j === 0, // First resume is default
            is_public: faker.datatype.boolean({ probability: 0.3 }),
            status: faker.helpers.weightedArrayElement([
              { value: 'active', weight: 7 },
              { value: 'draft', weight: 2 },
              { value: 'archived', weight: 1 }
            ])
          }
        })
      }

      if ((i + 1) % 20 === 0) {
        console.log(`    ... Đã tạo resumes cho ${i + 1} / ${candidateProfiles.length} profiles`)
      }
    }

    const totalResumes = await prisma.resumes.count()
    console.log(`  Seed ${totalResumes} resumes hoàn tất.`)
  } catch (error) {
    console.error('  Lỗi khi seed dữ liệu resumes:', error)
    throw error
  }
}
