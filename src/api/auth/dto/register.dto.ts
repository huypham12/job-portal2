import { SuccessResponseDto } from '@/shared/common/success-response.dto'

// REQUEST
export class RegisterBodyDto {
  constructor(
    public name: string,
    public email: string,
    public password: string,
    public confirm_password: string,
    public role: 'candidate' | 'recruiter' | 'admin'
  ) {}
}

// RESPONSE
export interface RegisterResponseData {
  access_token: string
  refresh_token: string
}

export class RegisterResponseDto extends SuccessResponseDto<RegisterResponseData> {
  constructor(statusCode: number, message: string, data: RegisterResponseData) {
    super(statusCode, message, data)
  }
}
