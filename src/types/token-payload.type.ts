import { JwtPayload } from 'jsonwebtoken'
import { TokenType, UserRole, UserVerifyStatus } from '@/shared/constants/enums'

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
  verify: UserVerifyStatus
  role: UserRole
  exp?: number
}
