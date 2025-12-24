import { RequestHandler } from 'express'
import { z } from 'zod'
import { job_type, user_role, availability_status } from '@prisma/client'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

const zodValidate = (parts: SchemaParts): RequestHandler => {
  const schema = z.object({
    body: parts.body ?? z.any(),
    query: parts.query ?? z.any(),
    params: parts.params ?? z.any()
  })

  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    })
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      })
      return
    }

    // Safely assign parsed data
    if (parts.body) req.body = parsed.data.body
    if (parts.query) {
      try {
        Object.assign(req.query, parsed.data.query)
      } catch {
        req.query = parsed.data.query
      }
    }
    if (parts.params) {
      try {
        Object.assign(req.params, parsed.data.params)
      } catch {
        req.params = parsed.data.params
      }
    }
    next()
  }
}

const phoneRegex = /^[+]?[0-9\s\-().]{7,20}$/
const urlRegex = /^https?:\/\/.+\..+/

// Enum values from Prisma
const jobTypeEnum = z.nativeEnum(job_type)
const userRoleEnum = z.nativeEnum(user_role)
const availabilityStatusEnum = z.nativeEnum(availability_status)

// Updated profile fields matching current schema
const updateProfileBody = z
  .object({
    // Basic info
    full_name: z.string().trim().min(1, 'Full name cannot be empty').max(255).optional(),
    display_name: z.string().trim().max(255).optional(),
    headline: z.string().trim().max(255).optional(),
    date_of_birth: z
      .string()
      .date()
      .transform((str) => new Date(str))
      .optional(),
    gender: z.string().max(20).optional(),

    // Contact info
    phone_number: z.string().min(7).max(20).optional(),
    personal_website: z.string().url('Invalid website URL').or(z.string().regex(urlRegex)).optional(),
    linkedin_url: z.string().url('Invalid LinkedIn URL').or(z.string().min(1)).optional(),
    github_url: z.string().url('Invalid GitHub URL').or(z.string().min(1)).optional(),

    // Location
    location_text: z.string().max(100).optional(),
    location_id: z.string().uuid().optional().nullable(),

    // Professional info
    bio: z.string().max(2000).optional(),
    years_of_experience: z.number().int().min(0).max(50).optional(),

    // Job preferences
    desired_job_title: z.string().trim().max(255).optional(),
    desired_salary_min: z.number().int().min(0).optional(),
    desired_currency: z.string().max(10).default('VND').optional(),
    desired_job_type: z.array(jobTypeEnum).optional(),
    availability_status: availabilityStatusEnum.optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' })

// Create profile body (full_name is required)
const createProfileBody = z
  .object({
    // Basic info - full_name is required for profile creation
    full_name: z.string().trim().min(1, 'Full name is required').max(255),
    display_name: z.string().trim().max(255).optional(),
    headline: z.string().trim().max(255).optional(),
    date_of_birth: z
      .string()
      .date()
      .transform((str) => new Date(str))
      .optional(),
    gender: z.string().max(20).optional(),

    // Contact info
    phone_number: z.string().min(7).max(20).optional(),
    personal_website: z.string().url('Invalid website URL').or(z.string().regex(urlRegex)).optional(),
    linkedin_url: z.string().url('Invalid LinkedIn URL').or(z.string().min(1)).optional(),
    github_url: z.string().url('Invalid GitHub URL').or(z.string().min(1)).optional(),

    // Location
    location_text: z.string().max(100).optional(),
    location_id: z.string().uuid().optional().nullable(),

    // Professional info
    bio: z.string().max(2000).optional(),
    years_of_experience: z.number().int().min(0).max(50).optional(),

    // Job preferences
    desired_job_title: z.string().trim().max(255).optional(),
    desired_salary_min: z.number().int().min(0).optional(),
    desired_currency: z.string().max(10).default('VND').optional(),
    desired_job_type: z.array(jobTypeEnum).optional(),
    availability_status: availabilityStatusEnum.optional()
  })
  .strict()

// Update user basic info (email, role)
const updateUserBody = z
  .object({
    email: z.string().email('Invalid email format').optional(),
    role: userRoleEnum.optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' })

// Get users with filters
const getUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  role: userRoleEnum.optional(),
  verified: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional()
})

// Pagination query for applications/saved-jobs/activity
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional()
})

// User ID param validation
const userIdParam = z.object({
  userId: z.string().uuid('Invalid user ID format')
})

// Profile experience validation
const profileExperienceBody = z.object({
  company_name: z.string().trim().min(1).max(255),
  position: z.string().trim().min(1).max(255),
  start_date: z
    .string()
    .date()
    .transform((str) => new Date(str)),
  end_date: z
    .string()
    .date()
    .transform((str) => new Date(str))
    .optional(),
  is_current: z.boolean().default(false),
  description: z.string().max(2000).optional()
})

// Profile education validation
const profileEducationBody = z.object({
  school_name: z.string().trim().min(1).max(255),
  degree: z.string().trim().max(255).optional(),
  field_of_study: z.string().trim().max(255).optional(),
  start_date: z
    .string()
    .date()
    .transform((str) => new Date(str)),
  end_date: z
    .string()
    .date()
    .transform((str) => new Date(str))
    .optional()
})

// Profile skill validation
const profileSkillBody = z.object({
  skill_id: z.string().uuid(),
  proficiency: z.number().int().min(1).max(5).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional()
})

// Profile certification validation
const profileCertificationBody = z.object({
  name: z.string().trim().min(1).max(255),
  issuing_org: z.string().trim().min(1).max(255),
  credential_id: z.string().trim().max(255).optional(),
  credential_url: z.string().url().or(z.string().min(1)).optional(),
  issue_date: z
    .string()
    .date()
    .transform((str) => new Date(str)),
  expiry_date: z
    .string()
    .date()
    .transform((str) => new Date(str))
    .optional(),
  never_expires: z.boolean().default(false),
  description: z.string().max(2000).optional(),
  skills_acquired: z.string().max(2000).optional()
})

// Profile award validation
const profileAwardBody = z.object({
  title: z.string().trim().min(1).max(255),
  issuer: z.string().trim().min(1).max(255),
  date: z
    .string()
    .date()
    .transform((str) => new Date(str)),
  description: z.string().max(2000).optional(),
  url: z.string().url().or(z.string().min(1)).optional(),
  category: z.enum(['academic', 'professional', 'competition', 'volunteer', 'other']).optional(),
  level: z.enum(['international', 'national', 'regional', 'local', 'organizational']).optional()
})

// Update profile sub-entities (for PATCH operations)
const updateProfileExperienceBody = profileExperienceBody.partial()
const updateProfileEducationBody = profileEducationBody.partial()
// For skills, only allow updating proficiency and level, not skill_id
const updateProfileSkillBody = z
  .object({
    proficiency: z.number().int().min(1).max(5).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' })
const updateProfileCertificationBody = profileCertificationBody.partial()
const updateProfileAwardBody = profileAwardBody.partial()

// ID param validators for sub-entities
const experienceIdParam = z.object({ experienceId: z.string().uuid() })
const educationIdParam = z.object({ educationId: z.string().uuid() })
const skillIdParam = z.object({ skillId: z.string().uuid() })
const certificationIdParam = z.object({ certificationId: z.string().uuid() })
const awardIdParam = z.object({ awardId: z.string().uuid() })
const profileIdParam = z.object({ id: z.string().uuid('Invalid profile ID format') })

// Combined param validators (userId + sub-entity ID)
const userExperienceParam = z.object({
  userId: z.string().uuid(),
  experienceId: z.string().uuid()
})

const userEducationParam = z.object({
  userId: z.string().uuid(),
  educationId: z.string().uuid()
})

const userSkillParam = z.object({
  userId: z.string().uuid(),
  skillId: z.string().uuid()
})

const userCertificationParam = z.object({
  userId: z.string().uuid(),
  certificationId: z.string().uuid()
})

const userAwardParam = z.object({
  userId: z.string().uuid(),
  awardId: z.string().uuid()
})

// === EXPORTED TYPES (Generated from Zod schemas) ===
// Legacy types - kept for backward compatibility
export type UpdateProfileBodyDto = z.infer<typeof updateProfileBody>
export type UpdateUserBodyDto = z.infer<typeof updateUserBody>
export type GetUsersQueryDto = z.infer<typeof getUsersQuery>
export type UserIdParamDto = z.infer<typeof userIdParam>

export type CreateProfileExperienceDto = z.infer<typeof profileExperienceBody>
export type UpdateProfileExperienceDto = z.infer<typeof updateProfileExperienceBody>
export type ExperienceIdParamDto = z.infer<typeof experienceIdParam>

export type CreateProfileEducationDto = z.infer<typeof profileEducationBody>
export type UpdateProfileEducationDto = z.infer<typeof updateProfileEducationBody>
export type EducationIdParamDto = z.infer<typeof educationIdParam>

export type CreateProfileSkillDto = z.infer<typeof profileSkillBody>
export type UpdateProfileSkillDto = z.infer<typeof updateProfileSkillBody>
export type SkillIdParamDto = z.infer<typeof skillIdParam>

export type CreateProfileCertificationDto = z.infer<typeof profileCertificationBody>
export type UpdateProfileCertificationDto = z.infer<typeof updateProfileCertificationBody>
export type CertificationIdParamDto = z.infer<typeof certificationIdParam>

export type CreateProfileAwardDto = z.infer<typeof profileAwardBody>
export type UpdateProfileAwardDto = z.infer<typeof updateProfileAwardBody>
export type AwardIdParamDto = z.infer<typeof awardIdParam>

// === EXPORTED VALIDATORS ===
export const createProfileValidator = zodValidate({ body: createProfileBody })
export const updateProfileValidator = zodValidate({ body: updateProfileBody })
export const updateUserValidator = zodValidate({ body: updateUserBody })
export const getUsersValidator = zodValidate({ query: getUsersQuery })
export const userIdValidator = zodValidate({ params: userIdParam })

// Profile sub-entities validators - CREATE operations (no params needed for /me routes)
export const createProfileExperienceValidator = zodValidate({
  body: profileExperienceBody
})
export const createProfileEducationValidator = zodValidate({
  body: profileEducationBody
})
export const createProfileSkillValidator = zodValidate({
  body: profileSkillBody
})
export const createProfileCertificationValidator = zodValidate({
  body: profileCertificationBody
})
export const createProfileAwardValidator = zodValidate({
  body: profileAwardBody
})

// Profile sub-entities validators - UPDATE operations
export const updateProfileExperienceValidator = zodValidate({
  body: updateProfileExperienceBody,
  params: experienceIdParam
})
export const updateProfileEducationValidator = zodValidate({
  body: updateProfileEducationBody,
  params: educationIdParam
})
export const updateProfileSkillValidator = zodValidate({
  body: updateProfileSkillBody,
  params: skillIdParam
})
export const updateProfileCertificationValidator = zodValidate({
  body: updateProfileCertificationBody,
  params: certificationIdParam
})
export const updateProfileAwardValidator = zodValidate({
  body: updateProfileAwardBody,
  params: awardIdParam
})

// Profile sub-entities validators - DELETE operations
export const deleteProfileExperienceValidator = zodValidate({ params: experienceIdParam })
export const deleteProfileEducationValidator = zodValidate({ params: educationIdParam })
export const deleteProfileSkillValidator = zodValidate({ params: skillIdParam })
export const deleteProfileCertificationValidator = zodValidate({ params: certificationIdParam })
export const deleteProfileAwardValidator = zodValidate({ params: awardIdParam })

// Profile sub-entities validators - GET individual operations
export const getProfileExperienceValidator = zodValidate({ params: experienceIdParam })
export const getProfileEducationValidator = zodValidate({ params: educationIdParam })
export const getProfileSkillValidator = zodValidate({ params: skillIdParam })
export const getProfileCertificationValidator = zodValidate({ params: certificationIdParam })
export const getProfileAwardValidator = zodValidate({ params: awardIdParam })

// Pagination validators
export const paginationValidator = zodValidate({
  query: paginationQuery
})

// Profile ID validator for public profile
export const profileIdValidator = zodValidate({
  params: profileIdParam
})

// Profile visibility validator
const updateProfileVisibilityBody = z.object({
  is_public: z.boolean()
})

export const updateProfileVisibilityValidator = zodValidate({
  body: updateProfileVisibilityBody
})

// Profile completeness - no validator needed (GET endpoint with no params)

// Export generated types from Zod schemas
export type GetUsersQuery = z.infer<typeof getUsersQuery>
export type PaginationQuery = z.infer<typeof paginationQuery>
export type UpdateUserDto = z.infer<typeof updateUserBody>
export type CreateProfileDto = z.infer<typeof createProfileBody>
export type UpdateProfileDto = z.infer<typeof updateProfileBody>
export type CreateExperienceDto = z.infer<typeof profileExperienceBody>
export type UpdateExperienceDto = z.infer<typeof updateProfileExperienceBody>
export type CreateEducationDto = z.infer<typeof profileEducationBody>
export type UpdateEducationDto = z.infer<typeof updateProfileEducationBody>
export type CreateSkillDto = z.infer<typeof profileSkillBody>
export type UpdateSkillDto = z.infer<typeof updateProfileSkillBody>
export type CreateCertificationDto = z.infer<typeof profileCertificationBody>
export type UpdateCertificationDto = z.infer<typeof updateProfileCertificationBody>
export type CreateAwardDto = z.infer<typeof profileAwardBody>
export type UpdateAwardDto = z.infer<typeof updateProfileAwardBody>
export type UpdateProfileVisibilityDto = z.infer<typeof updateProfileVisibilityBody>
