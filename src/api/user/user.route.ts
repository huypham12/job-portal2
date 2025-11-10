import { Router } from 'express'
import { UserController } from './user.controller'
import { UserService } from './services/user.service'
import { wrapController } from '@/shared/utils/wrap-controller'
import { prisma } from '@/config/database.service'
import { authenticateAccessToken, authenticateRefreshToken } from '@/shared/middleware/verify.middleware'
import { accessTokenValidator, refreshTokenValidator } from '../auth/auth.validator'
import { authorize, adminOnly, authenticatedUser, candidate, recruiter } from '@/shared/middleware/authorize.middleware'

const userRouter = Router()
const userService = new UserService()
const userController = new UserController(userService)

// lấy thông tin của chính bản thân
userRouter.get(
  '/me',
  accessTokenValidator,
  authenticateAccessToken,
  authenticatedUser,
  wrapController(userController.getMe)
)

// chỉnh sửa profile
userRouter.put(
  '/me/profile',
  accessTokenValidator,
  authenticateAccessToken,
  authenticatedUser,
  wrapController(userController.updateProfile)
)

export default userRouter
