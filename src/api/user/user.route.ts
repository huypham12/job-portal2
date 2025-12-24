import { Router } from 'express'
import { UserController } from './user.controller'
import { UserService } from './services/user.service'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { accessTokenValidator } from '../auth/auth.validator'
import { candidate, recruiter } from '@/middleware/authorize.middleware'
import {
  createProfileValidator,
  updateProfileValidator,
  updateUserValidator,
  paginationValidator,
  createProfileExperienceValidator,
  updateProfileExperienceValidator,
  deleteProfileExperienceValidator,
  getProfileExperienceValidator,
  createProfileEducationValidator,
  updateProfileEducationValidator,
  deleteProfileEducationValidator,
  getProfileEducationValidator,
  createProfileSkillValidator,
  updateProfileSkillValidator,
  deleteProfileSkillValidator,
  getProfileSkillValidator,
  createProfileCertificationValidator,
  updateProfileCertificationValidator,
  deleteProfileCertificationValidator,
  getProfileCertificationValidator,
  createProfileAwardValidator,
  updateProfileAwardValidator,
  deleteProfileAwardValidator,
  getProfileAwardValidator,
  profileIdValidator
} from './user.validator'

const userRouter = Router()
const userService = new UserService()
const userController = new UserController(userService)

// Middleware chung cho tất cả routes - chỉ candidate được truy cập
const candidateAuth = [accessTokenValidator, authenticateAccessToken, candidate]

// === MAIN USER DATA ===
// Basic user info (optimized for dashboard)
userRouter.get('/me', accessTokenValidator, authenticateAccessToken, wrapController(userController.getMe))

// === PUBLIC PROFILE (Recruiter only) ===
// Get public profile of candidate (for recruiters to view)
userRouter.get(
  '/profiles/:id/public',
  accessTokenValidator,
  authenticateAccessToken,
  recruiter,
  profileIdValidator,
  wrapController(userController.getPublicProfile)
)

// Complete profile with all sub-entities
userRouter.get('/me/profile', ...candidateAuth, wrapController(userController.getProfile))

// === PROFILE MANAGEMENT ===
// Create new profile
userRouter.post('/me/profile', ...candidateAuth, createProfileValidator, wrapController(userController.createProfile))

// Update main profile
userRouter.put('/me/profile', ...candidateAuth, updateProfileValidator, wrapController(userController.updateProfile))

// === PROFILE EXPERIENCES ===
// Collection endpoint - get all experiences with pagination
userRouter.get(
  '/me/profile/experiences',
  ...candidateAuth,
  paginationValidator,
  wrapController(userController.getExperiences)
)

// Individual endpoint - get single experience
userRouter.get(
  '/me/profile/experiences/:experienceId',
  ...candidateAuth,
  getProfileExperienceValidator,
  wrapController(userController.getExperience)
)

userRouter.post(
  '/me/profile/experiences',
  ...candidateAuth,
  createProfileExperienceValidator,
  wrapController(userController.createExperience)
)

userRouter.put(
  '/me/profile/experiences/:experienceId',
  ...candidateAuth,
  updateProfileExperienceValidator,
  wrapController(userController.updateExperience)
)

userRouter.delete(
  '/me/profile/experiences/:experienceId',
  ...candidateAuth,
  deleteProfileExperienceValidator,
  wrapController(userController.deleteExperience)
)

// === PROFILE EDUCATIONS ===
// Collection endpoint - get all educations with pagination
userRouter.get(
  '/me/profile/educations',
  ...candidateAuth,
  paginationValidator,
  wrapController(userController.getEducations)
)

// Individual endpoint - get single education
userRouter.get(
  '/me/profile/educations/:educationId',
  ...candidateAuth,
  getProfileEducationValidator,
  wrapController(userController.getEducation)
)

userRouter.post(
  '/me/profile/educations',
  ...candidateAuth,
  createProfileEducationValidator,
  wrapController(userController.createEducation)
)

userRouter.put(
  '/me/profile/educations/:educationId',
  ...candidateAuth,
  updateProfileEducationValidator,
  wrapController(userController.updateEducation)
)

userRouter.delete(
  '/me/profile/educations/:educationId',
  ...candidateAuth,
  deleteProfileEducationValidator,
  wrapController(userController.deleteEducation)
)

// === PROFILE SKILLS ===
// Collection endpoint - get all skills with pagination
userRouter.get('/me/profile/skills', ...candidateAuth, paginationValidator, wrapController(userController.getSkills))

// Individual endpoint - get single skill
userRouter.get(
  '/me/profile/skills/:skillId',
  ...candidateAuth,
  getProfileSkillValidator,
  wrapController(userController.getSkill)
)

userRouter.post(
  '/me/profile/skills',
  ...candidateAuth,
  createProfileSkillValidator,
  wrapController(userController.createSkill)
)

userRouter.put(
  '/me/profile/skills/:skillId',
  ...candidateAuth,
  updateProfileSkillValidator,
  wrapController(userController.updateSkill)
)

userRouter.delete(
  '/me/profile/skills/:skillId',
  ...candidateAuth,
  deleteProfileSkillValidator,
  wrapController(userController.deleteSkill)
)

// === PROFILE CERTIFICATIONS ===
// Collection endpoint - get all certifications with pagination
userRouter.get(
  '/me/profile/certifications',
  ...candidateAuth,
  paginationValidator,
  wrapController(userController.getCertifications)
)

// Individual endpoint - get single certification
userRouter.get(
  '/me/profile/certifications/:certificationId',
  ...candidateAuth,
  getProfileCertificationValidator,
  wrapController(userController.getCertification)
)

userRouter.post(
  '/me/profile/certifications',
  ...candidateAuth,
  createProfileCertificationValidator,
  wrapController(userController.createCertification)
)

userRouter.put(
  '/me/profile/certifications/:certificationId',
  ...candidateAuth,
  updateProfileCertificationValidator,
  wrapController(userController.updateCertification)
)

userRouter.delete(
  '/me/profile/certifications/:certificationId',
  ...candidateAuth,
  deleteProfileCertificationValidator,
  wrapController(userController.deleteCertification)
)

// === PROFILE AWARDS ===
// Collection endpoint - get all awards with pagination
userRouter.get('/me/profile/awards', ...candidateAuth, paginationValidator, wrapController(userController.getAwards))

// Individual endpoint - get single award
userRouter.get(
  '/me/profile/awards/:awardId',
  ...candidateAuth,
  getProfileAwardValidator,
  wrapController(userController.getAward)
)

userRouter.post(
  '/me/profile/awards',
  ...candidateAuth,
  createProfileAwardValidator,
  wrapController(userController.createAward)
)

userRouter.put(
  '/me/profile/awards/:awardId',
  ...candidateAuth,
  updateProfileAwardValidator,
  wrapController(userController.updateAward)
)

userRouter.delete(
  '/me/profile/awards/:awardId',
  ...candidateAuth,
  deleteProfileAwardValidator,
  wrapController(userController.deleteAward)
)

export default userRouter
