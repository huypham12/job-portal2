import { GetHandler, PutHandler } from '@/types/controller-handler.type'
import { UserService } from './services/user.service'
import { UpdateProfileBodyDto } from './user.dto'

export class UserController {
  constructor(private userService: UserService) {}

  getMe: GetHandler = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await this.userService.getUserById(userId)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    // respond with the user
    res.json(user)
    return
  }

  updateProfile: PutHandler<UpdateProfileBodyDto> = async (req, res) => {
    const userId = req.decoded_authorization?.user_id
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    // body đã được validate/transform bởi Zod middleware
    const payload = req.body as UpdateProfileBodyDto

    const profile = await this.userService.updateProfileForUser(userId, payload)
    res.json({ message: 'Profile updated', profile })
    return
  }
}
