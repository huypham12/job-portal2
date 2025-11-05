import { SuccessResponseDto } from '@/shared/common/success-response.dto'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'

export class SendEmailBodyDto {
  constructor(public email: string) {}
}

export class SendEmailResponseDto extends SuccessResponseDto {
  constructor(message: string) {
    super(HTTP_STATUS.OK, message)
  }
}
