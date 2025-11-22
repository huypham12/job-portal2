import { GetHandler, PutHandler, PostHandler, DeleteHandler } from '@/types/controller-handler.type'
import { UserService } from './services/user.service'
import {
  GetUsersQuery,
  PaginationQuery,
  UpdateUserDto,
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
  UpdateAwardDto
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

  updateProfile: PutHandler<UpdateProfileDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    // body đã được validate/transform bởi Zod middleware
    const payload = req.body as UpdateProfileDto

    const profile = await this.userService.updateProfileForUser(userId, payload)
    res.json({ message: 'Profile updated', profile })
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
}
