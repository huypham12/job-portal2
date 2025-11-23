import { SuccessResponseDto } from '@/shared/common/success-response.dto'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'

export class RefreshTokenBodyDto {
  constructor(public refresh_token: string) {}
}

export interface RefreshTokenData {
  access_token: string
  refresh_token: string
}

export class RefreshTokenResponseDto extends SuccessResponseDto<RefreshTokenData> {
  constructor(data: RefreshTokenData) {
    super(HTTP_STATUS.CREATED, MESSAGES.REFRESH_TOKEN_SUCCESS, data)
  }
}
