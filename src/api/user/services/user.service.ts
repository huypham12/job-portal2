import { prisma } from '@/config/database.service'
import { job_type, availability_status } from '@prisma/client'
import { elasticsearchSyncService } from '@/shared/services/elasticsearch-sync.service'
import { profileToESDoc } from '@/shared/utils/es-transformers'
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

        // 2. Lấy Profile với tất cả các relation (chung cho cả 2 vai trò)
        profiles: {
          select: {
            id: true,
            full_name: true,
            display_name: true,
            headline: true,
            date_of_birth: true,
            gender: true,
            phone_number: true,
            personal_website: true,
            linkedin_url: true,
            github_url: true,
            location_text: true,
            location_id: true,
            bio: true,
            years_of_experience: true,
            desired_job_title: true,
            desired_salary_min: true,
            desired_currency: true,
            desired_job_type: true,
            availability_status: true,
            created_at: true,
            updated_at: true,
            // Location với parent hierarchy
            location: {
              select: {
                id: true,
                name: true,
                type: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            },
            // Kinh nghiệm làm việc
            experiences: {
              select: {
                id: true,
                company_name: true,
                position: true,
                start_date: true,
                end_date: true,
                is_current: true,
                description: true
              },
              orderBy: { start_date: 'desc' }
            },
            // Học vấn
            educations: {
              select: {
                id: true,
                school_name: true,
                degree: true,
                field_of_study: true,
                start_date: true,
                end_date: true
              },
              orderBy: { start_date: 'desc' }
            },
            // Kỹ năng
            skills: {
              select: {
                skill_id: true,
                proficiency: true,
                level: true,
                skills: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              },
              orderBy: {
                skills: { name: 'asc' }
              }
            },
            // Chứng chỉ
            certifications: {
              select: {
                id: true,
                name: true,
                issuing_org: true,
                credential_id: true,
                credential_url: true,
                issue_date: true,
                expiry_date: true,
                never_expires: true,
                description: true,
                skills_acquired: true,
                created_at: true,
                updated_at: true
              },
              orderBy: { issue_date: 'desc' }
            },
            // Giải thưởng
            awards: {
              select: {
                id: true,
                title: true,
                issuer: true,
                date: true,
                description: true,
                url: true,
                category: true,
                level: true,
                created_at: true,
                updated_at: true
              },
              orderBy: { date: 'desc' }
            }
          }
        },

        // 3. Lấy Công ty với tất cả relation (Recruiter sẽ có, Candidate là mảng rỗng [])
        companies: {
          select: {
            id: true,
            name: true,
            description: true,
            recruiter_id: true,
            logo_url: true,
            size: true,
            created_at: true,
            updated_at: true,
            // Chi tiết công ty
            company_details: {
              select: {
                id: true,
                industry: true,
                founded_year: true,
                employee_count_min: true,
                employee_count_max: true,
                website_url: true,
                company_type: true,
                revenue_range: true,
                stock_symbol: true,
                created_at: true,
                updated_at: true,
                headquarters_location: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        type: true
                      }
                    }
                  }
                }
              }
            },
            // Phúc lợi công ty
            company_benefits: {
              select: {
                id: true,
                benefit_type: true,
                title: true,
                description: true,
                is_featured: true,
                created_at: true
              },
              orderBy: { created_at: 'desc' }
            },
            // Job posts của công ty (tóm tắt)
            jobs: {
              select: {
                id: true,
                title: true,
                status: true,
                job_type: true,
                posted_at: true,
                expires_at: true
              },
              where: {
                deleted: false,
                status: { not: 'draft' }
              },
              orderBy: { posted_at: 'desc' },
              take: 10 // Chỉ lấy 10 job gần nhất
            }
          }
        },

        // Relations that moved to profiles: resumes, applications, saved_jobs, candidate_interests
        // Use the new dedicated methods to get this data

        // 4. Applications moved to profiles - use getCandidateApplications() method

        // 5. Saved jobs moved to profiles - use getCandidateSavedJobs() method

        // 7. Lấy notifications
        notifications: {
          select: {
            id: true,
            type: true,
            content: true,
            sent_at: true,
            read: true
          },
          orderBy: { sent_at: 'desc' },
          take: 50 // Lấy 50 notification gần nhất
        }

        // 8. Connection interests moved to profiles table - use dedicated methods
        // - getCandidateInterests() for candidate interests
        // - getUserActivity() for combined notifications and interests

        // TODO: recruiter_interests needs to be handled differently
        // since candidate_id now references profiles.id not users.id
      }
    })
  }

  // Ensure we always work with an existing profile before mutating child tables
  private getProfileIdOrThrow = async (userId: string) => {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    return profile.id
  }

  // Tạo profile mới
  async createProfile(
    userId: string,
    data: {
      full_name: string
      display_name?: string
      headline?: string
      date_of_birth?: Date
      gender?: string
      phone_number?: string
      personal_website?: string
      linkedin_url?: string
      github_url?: string
      location_id?: string | null
      location_text?: string
      bio?: string
      years_of_experience?: number
      desired_job_title?: string
      desired_salary_min?: number
      desired_currency?: string
      desired_job_type?: job_type[]
      availability_status?: availability_status
    }
  ) {
    // Kiểm tra xem profile đã tồn tại chưa
    const existing = await prisma.profiles.findUnique({
      where: { user_id: userId }
    })

    if (existing) {
      throw new Error('Profile already exists')
    }

    const created = await prisma.profiles.create({
      data: {
        user_id: userId,
        full_name: data.full_name,
        display_name: data.display_name,
        headline: data.headline,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        phone_number: data.phone_number,
        personal_website: data.personal_website,
        linkedin_url: data.linkedin_url,
        github_url: data.github_url,
        location_id: data.location_id,
        location_text: data.location_text,
        bio: data.bio,
        years_of_experience: data.years_of_experience || 0,
        desired_job_title: data.desired_job_title,
        desired_salary_min: data.desired_salary_min,
        desired_currency: data.desired_currency || 'VND',
        desired_job_type: data.desired_job_type || [],
        availability_status: data.availability_status ?? 'OPEN'
      },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        display_name: true,
        headline: true,
        date_of_birth: true,
        gender: true,
        phone_number: true,
        personal_website: true,
        linkedin_url: true,
        github_url: true,
        avatar_url: true,
        location_id: true,
        location_text: true,
        bio: true,
        years_of_experience: true,
        desired_job_title: true,
        desired_salary_min: true,
        desired_currency: true,
        desired_job_type: true,
        availability_status: true,
        created_at: true,
        updated_at: true
      }
    })

    // Sync to Elasticsearch
    setImmediate(async () => {
      try {
        const esDocument = profileToESDoc(created)
        await elasticsearchSyncService.syncToElasticsearch('profiles', created.id, esDocument)
      } catch (error) {
        console.error(`Profile create sync failed: ${created.id}`, error)
      }
    })

    return created
  }

  // Thêm mới: cập nhật/khởi tạo profile theo user_id
  async updateProfileForUser(
    userId: string,
    data: {
      full_name?: string
      display_name?: string
      headline?: string
      phone_number?: string
      location_id?: string | null
      location_text?: string
      bio?: string
      years_of_experience?: number
      desired_job_title?: string
      desired_salary_min?: number
      desired_currency?: string
      desired_job_type?: job_type[]
      availability_status?: availability_status
    }
  ) {
    // Lọc bỏ các field undefined để tránh overwrite ngoài ý muốn
    const cleaned = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))

    const existing = await prisma.profiles.findUnique({
      where: { user_id: userId }
    })

    if (existing) {
      const updated = await prisma.profiles.update({
        where: { id: existing.id },
        data: cleaned,
        select: {
          id: true,
          user_id: true,
          full_name: true,
          display_name: true,
          headline: true,
          phone_number: true,
          avatar_url: true,
          location_id: true,
          location_text: true,
          bio: true,
          years_of_experience: true,
          desired_job_title: true,
          desired_salary_min: true,
          desired_currency: true,
          desired_job_type: true,
          availability_status: true,
          updated_at: true,
          created_at: true
        }
      })

      // Sync to Elasticsearch
      setImmediate(async () => {
        try {
          const esDocument = profileToESDoc(updated)
          await elasticsearchSyncService.syncToElasticsearch('profiles', updated.id, esDocument)
        } catch (error) {
          console.error(`Profile update sync failed: ${updated.id}`, error)
        }
      })

      return updated
    }

    const created = await prisma.profiles.create({
      data: {
        user_id: userId,
        full_name: data.full_name || '',
        ...cleaned
      },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        display_name: true,
        headline: true,
        phone_number: true,
        avatar_url: true,
        location_id: true,
        location_text: true,
        bio: true,
        years_of_experience: true,
        desired_job_title: true,
        desired_salary_min: true,
        desired_currency: true,
        desired_job_type: true,
        availability_status: true,
        updated_at: true,
        created_at: true
      }
    })
    return created
  }

  // Get user with complete profile data including relations
  async getUserWithCompleteProfile(userId: string) {
    return await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        verified: true,
        created_at: true,
        updated_at: true,
        profiles: {
          select: {
            id: true,
            full_name: true,
            display_name: true,
            headline: true,
            date_of_birth: true,
            gender: true,
            phone_number: true,
            personal_website: true,
            linkedin_url: true,
            github_url: true,
            location_text: true,
            location_id: true,
            bio: true,
            years_of_experience: true,
            desired_job_title: true,
            desired_salary_min: true,
            desired_currency: true,
            desired_job_type: true,
            availability_status: true,
            created_at: true,
            updated_at: true,
            location: {
              select: {
                id: true,
                name: true,
                type: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            },
            experiences: {
              select: {
                id: true,
                company_name: true,
                position: true,
                start_date: true,
                end_date: true,
                is_current: true,
                description: true
              },
              orderBy: { start_date: 'desc' }
            },
            educations: {
              select: {
                id: true,
                school_name: true,
                degree: true,
                field_of_study: true,
                start_date: true,
                end_date: true
              },
              orderBy: { start_date: 'desc' }
            },
            skills: {
              select: {
                skill_id: true,
                proficiency: true,
                level: true,
                skills: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              }
            },
            certifications: {
              select: {
                id: true,
                name: true,
                issuing_org: true,
                credential_id: true,
                credential_url: true,
                issue_date: true,
                expiry_date: true,
                never_expires: true,
                description: true,
                skills_acquired: true
              },
              orderBy: { issue_date: 'desc' }
            },
            awards: {
              select: {
                id: true,
                title: true,
                issuer: true,
                date: true,
                description: true,
                url: true,
                category: true,
                level: true
              },
              orderBy: { date: 'desc' }
            }
          }
        },
        companies: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            size: true,
            created_at: true,
            updated_at: true,
            company_details: {
              select: {
                industry: true,
                founded_year: true,
                employee_count_min: true,
                employee_count_max: true,
                website_url: true,
                company_type: true,
                headquarters_location: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            },
            company_benefits: {
              select: {
                benefit_type: true,
                title: true,
                description: true,
                is_featured: true
              }
            }
          }
        }
      }
    })
  }

  // Delete user and all related data
  async deleteUser(userId: string) {
    return await prisma.users.update({
      where: { id: userId },
      data: {
        deleted: true,
        updated_at: new Date()
      }
    })
  }

  // Get users with pagination and filtering
  async getUsers(options: { page?: number; limit?: number; role?: string; verified?: boolean; search?: string }) {
    const { page = 1, limit = 10, role, verified, search } = options
    const skip = (page - 1) * limit

    const where: any = {
      deleted: false
    }

    if (role) where.role = role
    if (verified !== undefined) where.verified = verified
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          profiles: {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { display_name: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          verified: true,
          created_at: true,
          updated_at: true,
          profiles: {
            select: {
              full_name: true,
              display_name: true,
              headline: true,
              phone_number: true,
              avatar_url: true,
              location_text: true,
              is_looking_for_job: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.users.count({ where })
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // === PROFILE EXPERIENCE METHODS ===
  async createProfileExperience(userId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)

    const experience = await prisma.profile_experiences.create({
      data: {
        profile_id: profileId,
        ...data
      },
      select: {
        id: true,
        company_name: true,
        position: true,
        start_date: true,
        end_date: true,
        is_current: true,
        description: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile experience create sync failed for profile: ${profileId}`, error)
      }
    })

    return experience
  }

  async updateProfileExperience(userId: string, experienceId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const experience = await prisma.profile_experiences.findFirst({
      where: { id: experienceId, profile_id: profileId },
      select: { id: true }
    })

    if (!experience) {
      throw new Error('Experience not found')
    }

    const updatedExperience = await prisma.profile_experiences.update({
      where: { id: experience.id },
      data,
      select: {
        id: true,
        company_name: true,
        position: true,
        start_date: true,
        end_date: true,
        is_current: true,
        description: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile experience update sync failed for profile: ${profileId}`, error)
      }
    })

    return updatedExperience
  }

  async deleteProfileExperience(userId: string, experienceId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const experience = await prisma.profile_experiences.findFirst({
      where: { id: experienceId, profile_id: profileId },
      select: { id: true }
    })

    if (!experience) {
      throw new Error('Experience not found')
    }

    await prisma.profile_experiences.delete({
      where: { id: experience.id }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile experience delete sync failed for profile: ${profileId}`, error)
      }
    })

    return { message: 'Experience deleted successfully' }
  }

  // === PROFILE EDUCATION METHODS ===
  async createProfileEducation(userId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)

    const education = await prisma.profile_educations.create({
      data: {
        profile_id: profileId,
        ...data
      },
      select: {
        id: true,
        school_name: true,
        degree: true,
        field_of_study: true,
        start_date: true,
        end_date: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile education create sync failed for profile: ${profileId}`, error)
      }
    })

    return education
  }

  async updateProfileEducation(userId: string, educationId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const education = await prisma.profile_educations.findFirst({
      where: { id: educationId, profile_id: profileId },
      select: { id: true }
    })

    if (!education) {
      throw new Error('Education not found')
    }

    const updatedEducation = await prisma.profile_educations.update({
      where: { id: education.id },
      data,
      select: {
        id: true,
        school_name: true,
        degree: true,
        field_of_study: true,
        start_date: true,
        end_date: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile education update sync failed for profile: ${profileId}`, error)
      }
    })

    return updatedEducation
  }

  async deleteProfileEducation(userId: string, educationId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const education = await prisma.profile_educations.findFirst({
      where: { id: educationId, profile_id: profileId },
      select: { id: true }
    })

    if (!education) {
      throw new Error('Education not found')
    }

    await prisma.profile_educations.delete({
      where: { id: education.id }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile education delete sync failed for profile: ${profileId}`, error)
      }
    })

    return { message: 'Education deleted successfully' }
  }

  // === PROFILE SKILL METHODS ===
  async createProfileSkill(userId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)

    // Validate skill exists
    const skillExists = await prisma.skills.findUnique({
      where: { id: data.skill_id },
      select: { id: true }
    })

    if (!skillExists) {
      throw new Error('Skill not found. Please select a valid skill from the list.')
    }

    // Check if skill already added to profile
    const existingSkill = await prisma.profile_skills.findUnique({
      where: {
        profile_id_skill_id: {
          profile_id: profileId,
          skill_id: data.skill_id
        }
      },
      select: { skill_id: true }
    })

    if (existingSkill) {
      throw new Error('This skill has already been added to your profile.')
    }

    const skill = await prisma.profile_skills.create({
      data: {
        profile_id: profileId,
        ...data
      },
      select: {
        skill_id: true,
        proficiency: true,
        level: true,
        skills: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile skill create sync failed for profile: ${profileId}`, error)
      }
    })

    return skill
  }

  async updateProfileSkill(userId: string, skillId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const where = {
      profile_id_skill_id: {
        profile_id: profileId,
        skill_id: skillId
      }
    }

    const existing = await prisma.profile_skills.findUnique({ where, select: { skill_id: true } })

    if (!existing) {
      throw new Error('Skill not found in your profile.')
    }

    // Only validate data fields, not skill_id (can't change skill_id in update)
    // Just update proficiency and level

    const updatedSkill = await prisma.profile_skills.update({
      where,
      data,
      select: {
        skill_id: true,
        proficiency: true,
        level: true,
        skills: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile skill update sync failed for profile: ${profileId}`, error)
      }
    })

    return updatedSkill
  }

  async deleteProfileSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const where = {
      profile_id_skill_id: {
        profile_id: profileId,
        skill_id: skillId
      }
    }

    const existing = await prisma.profile_skills.findUnique({ where, select: { skill_id: true } })

    if (!existing) {
      throw new Error('Skill not found in your profile.')
    }

    await prisma.profile_skills.delete({ where })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile skill delete sync failed for profile: ${profileId}`, error)
      }
    })

    return { message: 'Skill removed successfully' }
  }

  // === PROFILE CERTIFICATION METHODS ===
  async createProfileCertification(userId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)

    const certification = await prisma.profile_certifications.create({
      data: {
        profile_id: profileId,
        ...data
      },
      select: {
        id: true,
        name: true,
        issuing_org: true,
        credential_id: true,
        credential_url: true,
        issue_date: true,
        expiry_date: true,
        never_expires: true,
        description: true,
        skills_acquired: true,
        created_at: true,
        updated_at: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile certification create sync failed for profile: ${profileId}`, error)
      }
    })

    return certification
  }

  async updateProfileCertification(userId: string, certificationId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const certification = await prisma.profile_certifications.findFirst({
      where: { id: certificationId, profile_id: profileId },
      select: { id: true }
    })

    if (!certification) {
      throw new Error('Certification not found')
    }

    const updatedCertification = await prisma.profile_certifications.update({
      where: { id: certification.id },
      data,
      select: {
        id: true,
        name: true,
        issuing_org: true,
        credential_id: true,
        credential_url: true,
        issue_date: true,
        expiry_date: true,
        never_expires: true,
        description: true,
        skills_acquired: true,
        created_at: true,
        updated_at: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile certification update sync failed for profile: ${profileId}`, error)
      }
    })

    return updatedCertification
  }

  async deleteProfileCertification(userId: string, certificationId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const certification = await prisma.profile_certifications.findFirst({
      where: { id: certificationId, profile_id: profileId },
      select: { id: true }
    })

    if (!certification) {
      throw new Error('Certification not found')
    }

    await prisma.profile_certifications.delete({
      where: { id: certification.id }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile certification delete sync failed for profile: ${profileId}`, error)
      }
    })

    return { message: 'Certification deleted successfully' }
  }

  // === PROFILE AWARD METHODS ===
  async createProfileAward(userId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)

    const award = await prisma.profile_awards.create({
      data: {
        profile_id: profileId,
        ...data
      },
      select: {
        id: true,
        title: true,
        issuer: true,
        date: true,
        description: true,
        url: true,
        category: true,
        level: true,
        created_at: true,
        updated_at: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile award create sync failed for profile: ${profileId}`, error)
      }
    })

    return award
  }

  async updateProfileAward(userId: string, awardId: string, data: any) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const award = await prisma.profile_awards.findFirst({
      where: { id: awardId, profile_id: profileId },
      select: { id: true }
    })

    if (!award) {
      throw new Error('Award not found')
    }

    const updatedAward = await prisma.profile_awards.update({
      where: { id: award.id },
      data,
      select: {
        id: true,
        title: true,
        issuer: true,
        date: true,
        description: true,
        url: true,
        category: true,
        level: true,
        created_at: true,
        updated_at: true
      }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile award update sync failed for profile: ${profileId}`, error)
      }
    })

    return updatedAward
  }

  async deleteProfileAward(userId: string, awardId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const award = await prisma.profile_awards.findFirst({
      where: { id: awardId, profile_id: profileId },
      select: { id: true }
    })

    if (!award) {
      throw new Error('Award not found')
    }

    await prisma.profile_awards.delete({
      where: { id: award.id }
    })

    // Re-fetch and sync profile
    setImmediate(async () => {
      try {
        const updatedProfile = await this.getCompleteProfile(userId)
        const esDocument = profileToESDoc(updatedProfile)
        await elasticsearchSyncService.syncToElasticsearch('profiles', profileId, esDocument)
      } catch (error) {
        console.error(`Profile award delete sync failed for profile: ${profileId}`, error)
      }
    })

    return { message: 'Award deleted successfully' }
  }

  // === SPECIALIZED GET METHODS ===

  // Get basic user info (for navigation/header)
  async getBasicUserInfo(userId: string) {
    return await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        verified: true,
        created_at: true,
        profiles: {
          select: {
            id: true,
            full_name: true,
            display_name: true,
            headline: true,
            avatar_url: true,
            years_of_experience: true,
            availability_status: true,
            location_text: true
          }
        }
      }
    })
  }

  // Get complete profile data (for profile page)
  async getCompleteProfile(userId: string) {
    return await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        display_name: true,
        headline: true,
        date_of_birth: true,
        gender: true,
        phone_number: true,
        personal_website: true,
        linkedin_url: true,
        github_url: true,
        avatar_url: true,
        location_text: true,
        location_id: true,
        bio: true,
        years_of_experience: true,
        desired_job_title: true,
        desired_salary_min: true,
        desired_currency: true,
        desired_job_type: true,
        availability_status: true,
        created_at: true,
        updated_at: true,
        // Location with hierarchy
        location: {
          select: {
            id: true,
            name: true,
            type: true,
            parent: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        // All profile sub-entities
        experiences: {
          select: {
            id: true,
            company_name: true,
            position: true,
            start_date: true,
            end_date: true,
            is_current: true,
            description: true
          },
          orderBy: { start_date: 'desc' }
        },
        educations: {
          select: {
            id: true,
            school_name: true,
            degree: true,
            field_of_study: true,
            start_date: true,
            end_date: true
          },
          orderBy: { start_date: 'desc' }
        },
        skills: {
          select: {
            skill_id: true,
            proficiency: true,
            level: true,
            skills: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            skills: { name: 'asc' }
          }
        },
        certifications: {
          select: {
            id: true,
            name: true,
            issuing_org: true,
            credential_id: true,
            credential_url: true,
            issue_date: true,
            expiry_date: true,
            never_expires: true,
            description: true,
            skills_acquired: true,
            created_at: true,
            updated_at: true
          },
          orderBy: { issue_date: 'desc' }
        },
        awards: {
          select: {
            id: true,
            title: true,
            issuer: true,
            date: true,
            description: true,
            url: true,
            category: true,
            level: true,
            created_at: true,
            updated_at: true
          },
          orderBy: { date: 'desc' }
        }
      }
    })
  }

  // Get user applications (for applications page) - NEEDS MIGRATION
  async getUserApplications(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    // Get profile first
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) return { applications: [], pagination: { page, limit, total: 0, totalPages: 0 } }

    const [applications, total] = await Promise.all([
      prisma.applications.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          job_id: true,
          resume_id: true,
          status: true,
          applied_at: true,
          version: true,
          jobs: {
            select: {
              id: true,
              title: true,
              job_type: true,
              status: true,
              salary_range: true,
              posted_at: true,
              expires_at: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true
                }
              },
              locations: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: { applied_at: 'desc' }
      }),
      prisma.applications.count({ where: { profile_id: profile.id } })
    ])

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // Get user saved jobs (for saved jobs page)
  async getUserSavedJobs(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    // Get profile first
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) return { savedJobs: [], pagination: { page, limit, total: 0, totalPages: 0 } }

    const [savedJobs, total] = await Promise.all([
      prisma.saved_jobs.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          job_id: true,
          saved_at: true,
          jobs: {
            select: {
              id: true,
              title: true,
              job_type: true,
              status: true,
              salary_range: true,
              posted_at: true,
              expires_at: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true
                }
              },
              locations: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: { saved_at: 'desc' }
      }),
      prisma.saved_jobs.count({ where: { profile_id: profile.id } })
    ])

    return {
      savedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // Get user activity (notifications + interests)
  async getUserActivity(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    // Get profile for candidate interests
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    const [notifications, candidateInterests, recruiterInterests] = await Promise.all([
      prisma.notifications.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          content: true,
          sent_at: true,
          read: true
        },
        orderBy: { sent_at: 'desc' }
      }),
      // candidateInterests now need to query by profile.id
      profile
        ? prisma.connection_interests.findMany({
            where: { candidate_id: profile.id },
            select: {
              id: true,
              recruiter_id: true,
              job_id: true,
              interest_type: true,
              status: true,
              message: true,
              created_at: true,
              expires_at: true,
              responded_at: true,
              recruiter: {
                select: {
                  id: true,
                  email: true,
                  profiles: {
                    select: {
                      full_name: true,
                      display_name: true,
                      headline: true
                    }
                  }
                }
              },
              jobs: {
                select: {
                  id: true,
                  title: true,
                  companies: {
                    select: {
                      name: true,
                      logo_url: true
                    }
                  }
                }
              }
            },
            orderBy: { created_at: 'desc' },
            take: 10
          })
        : Promise.resolve([]),
      prisma.connection_interests.findMany({
        where: { recruiter_id: userId },
        select: {
          id: true,
          candidate_id: true,
          job_id: true,
          interest_type: true,
          status: true,
          message: true,
          created_at: true,
          expires_at: true,
          responded_at: true,
          candidate: {
            // This now references profiles table
            select: {
              id: true,
              full_name: true,
              display_name: true,
              headline: true,
              years_of_experience: true,
              desired_job_title: true,
              users: {
                // Get email from users table
                select: {
                  email: true
                }
              }
            }
          },
          jobs: {
            select: {
              id: true,
              title: true,
              companies: {
                select: {
                  name: true,
                  logo_url: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      })
    ])

    return {
      notifications,
      candidateInterests,
      recruiterInterests
    }
  }

  // Specialized endpoints for better performance

  // ⚠️  IMPORTANT: SCHEMA MIGRATION REQUIRED
  // The following methods will work after running the database migration
  // to apply the new schema changes where candidate data moved from 'users' to 'profiles'

  /*
  // TODO: Uncomment these methods after running migration

  // Get candidate applications (moved from users to profiles)
  async getCandidateApplications(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        applications: {
          select: {
            id: true,
            profile_id: true, // Changed from user_id
            job_id: true,
            resume_id: true,
            status: true,
            applied_at: true,
            version: true,
            jobs: {
              select: {
                id: true,
                title: true,
                job_type: true,
                status: true,
                companies: {
                  select: {
                    id: true,
                    name: true,
                    logo_url: true
                  }
                }
              }
            }
          },
          orderBy: { applied_at: 'desc' },
          skip,
          take: limit
        }
      }
    })

    return profile?.applications || []
  }

  // Get candidate resumes (moved from users to profiles)
  async getCandidateResumes(userId: string) {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        resumes: {
          select: {
            id: true,
            profile_id: true, // Changed from user_id
            content: true,
            file_url: true,
            created_at: true,
            updated_at: true
          },
          orderBy: { updated_at: 'desc' }
        }
      }
    })

    return profile?.resumes || []
  }

  // Get candidate saved jobs (moved from users to profiles)
  async getCandidateSavedJobs(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        saved_jobs: {
          select: {
            id: true,
            profile_id: true, // Changed from user_id
            job_id: true,
            saved_at: true,
            jobs: {
              select: {
                id: true,
                title: true,
                job_type: true,
                status: true,
                salary_range: true,
                posted_at: true,
                expires_at: true,
                companies: {
                  select: {
                    id: true,
                    name: true,
                    logo_url: true
                  }
                },
                locations: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { saved_at: 'desc' },
          skip,
          take: limit
        }
      }
    })

    return profile?.saved_jobs || []
  }

  // Get candidate interests (moved from users to profiles)
  async getCandidateInterests(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        candidate_interests: {
          select: {
            id: true,
            candidate_id: true, // This is now profile.id
            recruiter_id: true, // This still references users.id
            job_id: true,
            interest_type: true,
            status: true,
            message: true,
            created_at: true,
            expires_at: true,
            responded_at: true,
            recruiter: {
              select: {
                id: true,
                email: true,
                profiles: {
                  select: {
                    full_name: true,
                    display_name: true,
                    headline: true
                  }
                }
              }
            },
            jobs: {
              select: {
                id: true,
                title: true,
                companies: {
                  select: {
                    name: true,
                    logo_url: true
                  }
                }
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit
        }
      }
    })

    return profile?.candidate_interests || []
  }
  */

  // GET /me - Basic user information only
  getBasicMe = async (userId: string) => {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        verified: true,
        created_at: true,
        updated_at: true,
        profiles: {
          select: {
            id: true,
            display_name: true,
            headline: true,
            avatar_url: true,
            location_id: true,
            location_text: true,
            availability_status: true,
            location: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!user) return null

    // Transform to flat structure for basic info
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile: user.profiles || null
    }
  }

  // === GET INDIVIDUAL SUB-RESOURCES ===
  async getProfileExperience(userId: string, experienceId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const experience = await prisma.profile_experiences.findFirst({
      where: { id: experienceId, profile_id: profileId },
      select: {
        id: true,
        company_name: true,
        position: true,
        start_date: true,
        end_date: true,
        is_current: true,
        description: true
      }
    })

    if (!experience) {
      throw new Error('Experience not found')
    }

    return experience
  }

  async getProfileEducation(userId: string, educationId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const education = await prisma.profile_educations.findFirst({
      where: { id: educationId, profile_id: profileId },
      select: {
        id: true,
        school_name: true,
        degree: true,
        field_of_study: true,
        start_date: true,
        end_date: true
      }
    })

    if (!education) {
      throw new Error('Education not found')
    }

    return education
  }

  async getProfileSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const skill = await prisma.profile_skills.findFirst({
      where: { profile_id: profileId, skill_id: skillId },
      select: {
        skill_id: true,
        proficiency: true,
        level: true,
        skills: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })

    if (!skill) {
      throw new Error('Skill not found')
    }

    return skill
  }

  async getProfileCertification(userId: string, certificationId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const certification = await prisma.profile_certifications.findFirst({
      where: { id: certificationId, profile_id: profileId },
      select: {
        id: true,
        name: true,
        issuing_org: true,
        credential_id: true,
        credential_url: true,
        issue_date: true,
        expiry_date: true,
        never_expires: true,
        description: true,
        skills_acquired: true,
        created_at: true,
        updated_at: true
      }
    })

    if (!certification) {
      throw new Error('Certification not found')
    }

    return certification
  }

  async getProfileAward(userId: string, awardId: string) {
    const profileId = await this.getProfileIdOrThrow(userId)
    const award = await prisma.profile_awards.findFirst({
      where: { id: awardId, profile_id: profileId },
      select: {
        id: true,
        title: true,
        issuer: true,
        date: true,
        description: true,
        url: true,
        category: true,
        level: true,
        created_at: true,
        updated_at: true
      }
    })

    if (!award) {
      throw new Error('Award not found')
    }

    return award
  }

  // === GET COLLECTIONS WITH PAGINATION ===
  async getProfileExperiences(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      return { experiences: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const [experiences, total] = await Promise.all([
      prisma.profile_experiences.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          company_name: true,
          position: true,
          start_date: true,
          end_date: true,
          is_current: true,
          description: true
        },
        orderBy: { start_date: 'desc' }
      }),
      prisma.profile_experiences.count({ where: { profile_id: profile.id } })
    ])

    return {
      experiences,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getProfileEducations(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      return { educations: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const [educations, total] = await Promise.all([
      prisma.profile_educations.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          school_name: true,
          degree: true,
          field_of_study: true,
          start_date: true,
          end_date: true
        },
        orderBy: { start_date: 'desc' }
      }),
      prisma.profile_educations.count({ where: { profile_id: profile.id } })
    ])

    return {
      educations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getProfileSkills(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      return { skills: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const [skills, total] = await Promise.all([
      prisma.profile_skills.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          skill_id: true,
          proficiency: true,
          level: true,
          skills: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: {
          skills: { name: 'asc' }
        }
      }),
      prisma.profile_skills.count({ where: { profile_id: profile.id } })
    ])

    return {
      skills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getProfileCertifications(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      return { certifications: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const [certifications, total] = await Promise.all([
      prisma.profile_certifications.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          issuing_org: true,
          credential_id: true,
          credential_url: true,
          issue_date: true,
          expiry_date: true,
          never_expires: true,
          description: true,
          skills_acquired: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { issue_date: 'desc' }
      }),
      prisma.profile_certifications.count({ where: { profile_id: profile.id } })
    ])

    return {
      certifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getProfileAwards(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options
    const skip = (page - 1) * limit

    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      return { awards: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }

    const [awards, total] = await Promise.all([
      prisma.profile_awards.findMany({
        where: { profile_id: profile.id },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          issuer: true,
          date: true,
          description: true,
          url: true,
          category: true,
          level: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { date: 'desc' }
      }),
      prisma.profile_awards.count({ where: { profile_id: profile.id } })
    ])

    return {
      awards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get public profile information for recruiters to view candidate profiles
   * Excludes sensitive information like phone_number, email
   */
  async getPublicProfile(profileId: string) {
    const profile = await prisma.profiles.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        full_name: true,
        display_name: true,
        headline: true,
        avatar_url: true,
        bio: true,
        years_of_experience: true,
        desired_job_title: true,
        desired_salary_min: true,
        desired_currency: true,
        desired_job_type: true,
        availability_status: true,
        location_text: true,
        personal_website: true,
        linkedin_url: true,
        github_url: true,
        created_at: true,
        updated_at: true,
        // Location with hierarchy
        location: {
          select: {
            id: true,
            name: true,
            type: true,
            parent: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        // Public profile sub-entities
        experiences: {
          select: {
            id: true,
            company_name: true,
            position: true,
            start_date: true,
            end_date: true,
            is_current: true,
            description: true
          },
          orderBy: { start_date: 'desc' }
        },
        educations: {
          select: {
            id: true,
            school_name: true,
            degree: true,
            field_of_study: true,
            start_date: true,
            end_date: true
          },
          orderBy: { start_date: 'desc' }
        },
        skills: {
          select: {
            skill_id: true,
            proficiency: true,
            level: true,
            skills: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            skills: { name: 'asc' }
          }
        },
        certifications: {
          select: {
            id: true,
            name: true,
            issuing_org: true,
            credential_id: true,
            credential_url: true,
            issue_date: true,
            expiry_date: true,
            never_expires: true,
            description: true,
            skills_acquired: true
          },
          orderBy: { issue_date: 'desc' }
        },
        awards: {
          select: {
            id: true,
            title: true,
            issuer: true,
            date: true,
            description: true,
            url: true,
            category: true,
            level: true
          },
          orderBy: { date: 'desc' }
        },
        // Basic user info (without email)
        users: {
          select: {
            id: true,
            role: true,
            verified: true
          }
        }
      }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Only return profiles of candidates
    if (profile.users?.role !== 'candidate') {
      throw new Error('Profile is not available for public viewing')
    }

    // Remove users object from response, only keep role info if needed
    const { users, ...publicProfile } = profile

    return {
      ...publicProfile,
      role: users?.role
    }
  }

  /**
   * Update profile visibility (public/private)
   */
  async updateProfileVisibility(userId: string, isPublic: boolean) {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true, is_public: true }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const updatedProfile = await prisma.profiles.update({
      where: { id: profile.id },
      data: { is_public: isPublic },
      select: {
        id: true,
        user_id: true,
        is_public: true,
        updated_at: true
      }
    })

    return updatedProfile
  }

  /**
   * Calculate and return profile completeness percentage
   */
  async getProfileCompleteness(userId: string) {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        full_name: true,
        display_name: true,
        headline: true,
        avatar_url: true,
        bio: true,
        date_of_birth: true,
        gender: true,
        phone_number: true,
        personal_website: true,
        linkedin_url: true,
        github_url: true,
        location_text: true,
        location_id: true,
        years_of_experience: true,
        desired_job_title: true,
        desired_salary_min: true,
        desired_job_type: true,
        availability_status: true,
        experiences: {
          select: { id: true }
        },
        educations: {
          select: { id: true }
        },
        skills: {
          select: { skill_id: true }
        },
        certifications: {
          select: { id: true }
        },
        awards: {
          select: { id: true }
        }
      }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Define completeness criteria
    const criteria = {
      // Basic info (required) - 40% total
      basicInfo: {
        full_name: !!profile.full_name?.trim(),
        display_name: !!profile.display_name?.trim(),
        headline: !!profile.headline?.trim(),
        avatar_url: !!profile.avatar_url,
        bio: !!profile.bio?.trim()
      },

      // Contact info (optional but recommended) - 20% total
      contactInfo: {
        phone_number: !!profile.phone_number,
        personal_website: !!profile.personal_website,
        linkedin_url: !!profile.linkedin_url,
        github_url: !!profile.github_url
      },

      // Professional info (recommended) - 20% total
      professionalInfo: {
        date_of_birth: !!profile.date_of_birth,
        gender: !!profile.gender,
        location_text: !!profile.location_text || !!profile.location_id,
        years_of_experience: !!profile.years_of_experience,
        desired_job_title: !!profile.desired_job_title,
        desired_salary_min: !!profile.desired_salary_min,
        desired_job_type: !!profile.desired_job_type && profile.desired_job_type.length > 0,
        availability_status: profile.availability_status !== null
      },

      // Career data (optional but valuable) - 20% total
      careerData: {
        experiences: (profile.experiences?.length || 0) > 0,
        educations: (profile.educations?.length || 0) > 0,
        skills: (profile.skills?.length || 0) > 0,
        certifications: (profile.certifications?.length || 0) > 0,
        awards: (profile.awards?.length || 0) > 0
      }
    }

    // Calculate completion percentages
    const basicInfoComplete =
      Object.values(criteria.basicInfo).filter(Boolean).length / Object.keys(criteria.basicInfo).length
    const contactInfoComplete =
      Object.values(criteria.contactInfo).filter(Boolean).length / Object.keys(criteria.contactInfo).length
    const professionalInfoComplete =
      Object.values(criteria.professionalInfo).filter(Boolean).length / Object.keys(criteria.professionalInfo).length
    const careerDataComplete =
      Object.values(criteria.careerData).filter(Boolean).length / Object.keys(criteria.careerData).length

    // Weighted total percentage
    const totalPercentage = Math.round(
      (basicInfoComplete * 0.4 +
        contactInfoComplete * 0.2 +
        professionalInfoComplete * 0.2 +
        careerDataComplete * 0.2) *
        100
    )

    // Return detailed completeness info
    return {
      percentage: totalPercentage,
      completed: totalPercentage >= 100,
      sections: {
        basicInfo: {
          percentage: Math.round(basicInfoComplete * 100),
          completed: Object.values(criteria.basicInfo).filter(Boolean).length,
          total: Object.keys(criteria.basicInfo).length,
          items: criteria.basicInfo
        },
        contactInfo: {
          percentage: Math.round(contactInfoComplete * 100),
          completed: Object.values(criteria.contactInfo).filter(Boolean).length,
          total: Object.keys(criteria.contactInfo).length,
          items: criteria.contactInfo
        },
        professionalInfo: {
          percentage: Math.round(professionalInfoComplete * 100),
          completed: Object.values(criteria.professionalInfo).filter(Boolean).length,
          total: Object.keys(criteria.professionalInfo).length,
          items: criteria.professionalInfo
        },
        careerData: {
          percentage: Math.round(careerDataComplete * 100),
          completed: Object.values(criteria.careerData).filter(Boolean).length,
          total: Object.keys(criteria.careerData).length,
          items: {
            experiences: profile.experiences?.length || 0,
            educations: profile.educations?.length || 0,
            skills: profile.skills?.length || 0,
            certifications: profile.certifications?.length || 0,
            awards: profile.awards?.length || 0
          }
        }
      },
      recommendations: this.getCompletenessRecommendations(totalPercentage, criteria)
    }
  }

  /**
   * Generate recommendations based on profile completeness
   */
  private getCompletenessRecommendations(percentage: number, criteria: any) {
    const recommendations = []

    if (percentage < 100) {
      // Basic info recommendations
      if (!criteria.basicInfo.full_name) recommendations.push('Add your full name')
      if (!criteria.basicInfo.display_name) recommendations.push('Add a display name')
      if (!criteria.basicInfo.headline) recommendations.push('Add a professional headline')
      if (!criteria.basicInfo.avatar_url) recommendations.push('Upload a profile picture')
      if (!criteria.basicInfo.bio) recommendations.push('Write a professional bio')

      // Contact info recommendations
      if (!criteria.contactInfo.phone_number) recommendations.push('Add your phone number')
      if (!criteria.contactInfo.personal_website) recommendations.push('Add your personal website')
      if (!criteria.contactInfo.linkedin_url) recommendations.push('Add your LinkedIn profile')
      if (!criteria.contactInfo.github_url) recommendations.push('Add your GitHub profile')

      // Professional info recommendations
      if (!criteria.professionalInfo.date_of_birth) recommendations.push('Add your date of birth')
      if (!criteria.professionalInfo.gender) recommendations.push('Specify your gender')
      if (!criteria.professionalInfo.location_text && !criteria.professionalInfo.location_id)
        recommendations.push('Add your location')
      if (!criteria.professionalInfo.years_of_experience) recommendations.push('Add your years of experience')
      if (!criteria.professionalInfo.desired_job_title) recommendations.push('Add your desired job title')
      if (!criteria.professionalInfo.desired_salary_min) recommendations.push('Add your desired salary range')
      if (!criteria.professionalInfo.desired_job_type) recommendations.push('Specify your preferred job types')

      // Career data recommendations
      if (!criteria.careerData.experiences) recommendations.push('Add your work experience')
      if (!criteria.careerData.educations) recommendations.push('Add your education background')
      if (!criteria.careerData.skills) recommendations.push('Add your skills')
      if (!criteria.careerData.certifications) recommendations.push('Add your certifications')
      if (!criteria.careerData.awards) recommendations.push('Add your awards and achievements')
    }

    return recommendations.slice(0, 5) // Return top 5 recommendations
  }
}
