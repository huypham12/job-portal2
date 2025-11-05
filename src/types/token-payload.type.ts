import { JwtPayload } from 'jsonwebtoken'
import { TokenType, UserVerifyStatus } from '@/shared/constants/enums'

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
  verify: UserVerifyStatus
  exp?: number
}
