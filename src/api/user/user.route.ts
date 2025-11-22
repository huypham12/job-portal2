import { Router } from 'express'
import { UserController } from './user.controller'
import { UserService } from './services/user.service'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { accessTokenValidator } from '../auth/auth.validator'
import { candidate } from '@/shared/middleware/authorize.middleware'
import {
  updateProfileValidator,
  updateUserValidator,
  paginationValidator,
  createProfileExperienceValidator,
  updateProfileExperienceValidator,
  deleteProfileExperienceValidator,
  createProfileEducationValidator,
  updateProfileEducationValidator,
  deleteProfileEducationValidator,
  createProfileSkillValidator,
  updateProfileSkillValidator,
  deleteProfileSkillValidator,
  createProfileCertificationValidator,
  updateProfileCertificationValidator,
  deleteProfileCertificationValidator,
  createProfileAwardValidator,
  updateProfileAwardValidator,
  deleteProfileAwardValidator
} from './user.validator'

const userRouter = Router()
const userService = new UserService()
const userController = new UserController(userService)

// Middleware chung cho tất cả routes - chỉ candidate được truy cập
const candidateAuth = [accessTokenValidator, authenticateAccessToken, candidate]

// === MAIN USER DATA ===
// Basic user info (optimized for dashboard)
userRouter.get('/me', accessTokenValidator, authenticateAccessToken, wrapController(userController.getMe))

// Complete profile with all sub-entities
userRouter.get('/me/profile', ...candidateAuth, wrapController(userController.getProfile))

// === PROFILE MANAGEMENT ===
// Update main profile
userRouter.put('/me/profile', ...candidateAuth, updateProfileValidator, wrapController(userController.updateProfile))

// === PROFILE EXPERIENCES ===
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
