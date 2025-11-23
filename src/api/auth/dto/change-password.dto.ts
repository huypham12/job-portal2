import { SuccessResponseDto } from '@/shared/common/success-response.dto'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'

export class ChangePasswordBodyDto {
  constructor(
    public old_password: string,
    public new_password: string,
    public user_id: string
  ) {}
}

export class ChangePasswordResponseDto extends SuccessResponseDto {
  constructor() {
    super(HTTP_STATUS.OK, MESSAGES.CHANGE_PASSWORD_SUCCESS)
  }
}
