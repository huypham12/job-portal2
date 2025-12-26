import { GetHandler, PutHandler, PostHandler, DeleteHandler } from '@/types/controller-handler.type'
import { UserService } from './services/user.service'
import {
  GetUsersQuery,
  PaginationQuery,
  UpdateUserDto,
  CreateProfileDto,
  UpdateProfileDto,
  CreateExperienceDto,
  UpdateExperienceDto,
  CreateEducationDto,
  UpdateEducationDto,
  CreateSkillDto,
  UpdateSkillDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  CreateAwardDto,
  UpdateAwardDto,
  UpdateProfileVisibilityDto
} from './user.validator'

export class UserController {
  constructor(private userService: UserService) {}

  // GET /me - Basic user info
  getMe: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await this.userService.getBasicMe(userId)

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    res.json({
      success: true,
      data: user
    })
  }

  // GET /me/profile - Complete profile with all sub-entities
  getProfile: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const profile = await this.userService.getCompleteProfile(userId)

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      })
      return
    }

    res.json({
      success: true,
      data: profile
    })
  }

  createProfile: PostHandler<CreateProfileDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    try {
      const payload = req.validated!.body as CreateProfileDto
      const profile = await this.userService.createProfile(userId, payload)
      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile
      })
    } catch (error: any) {
      if (error.message === 'Profile already exists') {
        res.status(409).json({
          success: false,
          message: 'Profile already exists for this user'
        })
        return
      }
      throw error
    }
  }

  updateProfile: PutHandler<UpdateProfileDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    // body đã được validate/transform bởi Zod middleware
    const payload = req.validated!.body as UpdateProfileDto

    const profile = await this.userService.updateProfileForUser(userId, payload)
    res.json({
      success: true,
      message: 'Profile updated',
      data: profile
    })
    return
  }

  // === EXPERIENCE HANDLERS ===
  createExperience: PostHandler<CreateExperienceDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const experience = await this.userService.createProfileExperience(userId, req.body)
    res.status(201).json({ message: 'Experience created', experience })
  }

  updateExperience: PutHandler<UpdateExperienceDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { experienceId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const experience = await this.userService.updateProfileExperience(userId, experienceId, req.body)
    res.json({ message: 'Experience updated', experience })
  }

  deleteExperience: DeleteHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { experienceId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await this.userService.deleteProfileExperience(userId, experienceId)
    res.json({ message: 'Experience deleted' })
  }

  // === EDUCATION HANDLERS ===
  createEducation: PostHandler<CreateEducationDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const education = await this.userService.createProfileEducation(userId, req.body)
    res.status(201).json({ message: 'Education created', education })
  }

  updateEducation: PutHandler<UpdateEducationDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { educationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const education = await this.userService.updateProfileEducation(userId, educationId, req.body)
    res.json({ message: 'Education updated', education })
  }

  deleteEducation: DeleteHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { educationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await this.userService.deleteProfileEducation(userId, educationId)
    res.json({ message: 'Education deleted' })
  }

  // === SKILL HANDLERS ===
  createSkill: PostHandler<CreateSkillDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const skill = await this.userService.createProfileSkill(userId, req.body)
    res.status(201).json({ message: 'Skill added', skill })
  }

  updateSkill: PutHandler<UpdateSkillDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { skillId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const skill = await this.userService.updateProfileSkill(userId, skillId, req.body)
    res.json({ message: 'Skill updated', skill })
  }

  deleteSkill: DeleteHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { skillId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await this.userService.deleteProfileSkill(userId, skillId)
    res.json({ message: 'Skill removed' })
  }

  // === CERTIFICATION HANDLERS ===
  createCertification: PostHandler<CreateCertificationDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const certification = await this.userService.createProfileCertification(userId, req.body)
    res.status(201).json({ message: 'Certification created', certification })
  }

  updateCertification: PutHandler<UpdateCertificationDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { certificationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const certification = await this.userService.updateProfileCertification(userId, certificationId, req.body)
    res.json({ message: 'Certification updated', certification })
  }

  deleteCertification: DeleteHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { certificationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await this.userService.deleteProfileCertification(userId, certificationId)
    res.json({ message: 'Certification deleted' })
  }

  // === AWARD HANDLERS ===
  createAward: PostHandler<CreateAwardDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const award = await this.userService.createProfileAward(userId, req.body)
    res.status(201).json({ message: 'Award created', award })
  }

  updateAward: PutHandler<UpdateAwardDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { awardId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const award = await this.userService.updateProfileAward(userId, awardId, req.body)
    res.json({ message: 'Award updated', award })
  }

  deleteAward: DeleteHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { awardId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await this.userService.deleteProfileAward(userId, awardId)
    res.json({ message: 'Award deleted' })
  }

  // === GET INDIVIDUAL SUB-RESOURCES ===
  getExperience: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { experienceId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const experience = await this.userService.getProfileExperience(userId, experienceId)
    if (!experience) {
      res.status(404).json({ success: false, message: 'Experience not found' })
      return
    }

    res.json({ success: true, data: experience })
  }

  getEducation: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { educationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const education = await this.userService.getProfileEducation(userId, educationId)
    if (!education) {
      res.status(404).json({ success: false, message: 'Education not found' })
      return
    }

    res.json({ success: true, data: education })
  }

  getSkill: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { skillId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const skill = await this.userService.getProfileSkill(userId, skillId)
    if (!skill) {
      res.status(404).json({ success: false, message: 'Skill not found' })
      return
    }

    res.json({ success: true, data: skill })
  }

  getCertification: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { certificationId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const certification = await this.userService.getProfileCertification(userId, certificationId)
    if (!certification) {
      res.status(404).json({ success: false, message: 'Certification not found' })
      return
    }

    res.json({ success: true, data: certification })
  }

  getAward: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    const { awardId } = req.params
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const award = await this.userService.getProfileAward(userId, awardId)
    if (!award) {
      res.status(404).json({ success: false, message: 'Award not found' })
      return
    }

    res.json({ success: true, data: award })
  }

  // === GET COLLECTIONS WITH PAGINATION ===
  getExperiences: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const result = await this.userService.getProfileExperiences(userId, { page, limit })
    res.json({ success: true, data: result.experiences, pagination: result.pagination })
  }

  getEducations: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const result = await this.userService.getProfileEducations(userId, { page, limit })
    res.json({ success: true, data: result.educations, pagination: result.pagination })
  }

  getSkills: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await this.userService.getProfileSkills(userId, { page, limit })
    res.json({ success: true, data: result.skills, pagination: result.pagination })
  }

  getCertifications: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const result = await this.userService.getProfileCertifications(userId, { page, limit })
    res.json({ success: true, data: result.certifications, pagination: result.pagination })
  }

  getAwards: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const result = await this.userService.getProfileAwards(userId, { page, limit })
    res.json({ success: true, data: result.awards, pagination: result.pagination })
  }

  /**
   * GET /profiles/:id/public
   * Get public profile information (for recruiters)
   */
  getPublicProfile: GetHandler = async (req, res) => {
    const { id: profileId } = req.params

    try {
      const profile = await this.userService.getPublicProfile(profileId)
      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      })
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        })
        return
      }
      if (error.message === 'Profile is not available for public viewing') {
        res.status(403).json({
          success: false,
          message: 'This profile is not available for public viewing'
        })
        return
      }
      throw error
    }
  }

  /**
   * PUT /me/profile/visibility
   * Update profile visibility (public/private)
   */
  updateProfileVisibility: PutHandler<UpdateProfileVisibilityDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { is_public } = req.body

    try {
      const profile = await this.userService.updateProfileVisibility(userId, is_public)
      res.json({
        success: true,
        message: `Profile visibility updated to ${is_public ? 'public' : 'private'}`,
        data: profile
      })
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        })
        return
      }
      throw error
    }
  }

  /**
   * GET /me/profile/completeness
   * Get profile completeness percentage
   */
  getProfileCompleteness: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    try {
      const completeness = await this.userService.getProfileCompleteness(userId)
      res.json({
        success: true,
        data: completeness
      })
    } catch (error: any) {
      if (error.message === 'Profile not found') {
        res.status(404).json({
          success: false,
          message: 'Profile not found'
        })
        return
      }
      throw error
    }
  }
}
