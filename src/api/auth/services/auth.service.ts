import { prisma } from '@/config/database.service'
import {
  LoginData,
  LoginResponseDto,
  RegisterBodyDto,
  LogoutResponseDto,
  RefreshTokenResponseDto,
  VerifyEmailResponseDto,
  ResetPasswordResponseDto,
  ChangePasswordResponseDto,
  RegisterResponseData
} from '../dto'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { TokenType, UserVerifyStatus } from '@/shared/constants/enums'
import { signTokenByType, verifyToken } from '@/shared/utils/jwt'
import { compareHash, generateHash } from '@/shared/utils/crypto'
import { envConfig } from '@/config/getEnvConfig'
import { HttpError } from '@/shared/common/http-error'
import { getVerifyEmailTemplate } from '@/shared/utils/email-templete'
import { EmailService } from './email.service'
import { TokenPayload } from '@/types/token-payload.type'

export class AuthService {
  constructor(private readonly emailService: EmailService) {}

  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }): Promise<string> {
    return signTokenByType({
      user_id,
      verify,
      token_type: TokenType.AccessToken,
      secretKey: envConfig.secrets.jwt.access as string,
      expiresIn: envConfig.tokenExpires.access
    })
  }

  private signRefreshToken({
    user_id,
    verify,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    exp?: number
  }): Promise<string> {
    return signTokenByType({
      user_id,
      verify,
      token_type: TokenType.RefreshToken,
      secretKey: envConfig.secrets.jwt.refresh as string,
      expiresIn: exp ? undefined : envConfig.tokenExpires.refresh,
      exp
    })
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }): Promise<string> {
    return signTokenByType({
      user_id,
      verify,
      token_type: TokenType.EmailVerifyToken,
      secretKey: envConfig.secrets.jwt.emailVerify as string,
      expiresIn: envConfig.tokenExpires.emailVerify
    })
  }

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }): Promise<string> {
    return signTokenByType({
      user_id,
      verify,
      token_type: TokenType.ForgotPasswordToken,
      secretKey: envConfig.secrets.jwt.forgotPassword as string,
      expiresIn: envConfig.tokenExpires.forgotPassword
    })
  }

  private signAccessAndRefreshToken({
    user_id,
    verify,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    exp?: number
  }): Promise<[string, string]> {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify, exp })])
  }

  private decodeToken(token: string, secretKey: string) {
    return verifyToken({
      token,
      secretKey
    })
  }

  resendVerifyEmail = async (email: string): Promise<string> => {
    // 1. Tìm user bằng email
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      throw new HttpError(MESSAGES.USER_DOES_NOT_EXIST, 401)
    }

    // 2. Kiểm tra trạng thái 'verified' (kiểu boolean trong Postgres)
    if (user.verified) {
      // [SỬA ĐỔI] Dùng cột 'verified' (boolean)
      throw new HttpError(MESSAGES.USER_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST)
    }

    // 3. Tạo email verify token
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user.id, // [SỬA ĐỔI] Dùng user.id (UUID string)
      verify: UserVerifyStatus.Unverified // Giữ nguyên logic payload của JWT
    })

    // 4. [LOGIC MỚI] Lấy 'expires_at' từ token vừa tạo
    // Schema 'user_tokens' yêu cầu expires_at
    const decodedToken = await this.decodeToken(email_verify_token, envConfig.secrets.jwt.emailVerify as string)

    if (!decodedToken.exp) {
      throw new HttpError('Token creation failed or token has no expiration', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
    // Chuyển đổi 'exp' (seconds) sang miliseconds để tạo Date
    const expiresAt = new Date(decodedToken.exp * 1000)

    // 5. [LOGIC MỚI] Cập nhật CSDL trong một transaction
    // Chúng ta cần:
    // a. Xóa token 'verify_email' cũ (nếu có) để mô phỏng logic "ghi đè" của Mongo.
    // b. Thêm token mới vào bảng 'user_tokens'.
    // c. Cập nhật 'updated_at' của user (mô phỏng $currentDate) bằng cách 'chạm' vào bản ghi.
    //  [BẢO MẬT] Hash token thô để lưu vào DB
    const hashed_token_to_store = await generateHash(email_verify_token)

    await prisma.$transaction(async (tx) => {
      // a. Xóa token cũ
      await tx.user_tokens.deleteMany({
        where: {
          user_id: user.id,
          type: 'verify_email' // Giả định Prisma Enum là 'verify_email'
        }
      })

      // b. Thêm token mới
      await tx.user_tokens.create({
        data: {
          // Lưu ý: Tên cột là tokenHash, nhưng logic cũ lưu token thô.
          // Chúng ta sẽ tạm lưu token thô để logic middleware 'authenticateEmailVerifyToken' hoạt động.
          // Lý tưởng nhất là hash token và middleware cũng hash để so sánh.
          token_hash: hashed_token_to_store,
          user_id: user.id,
          type: 'verify_email',
          expires_at: expiresAt
        }
      })

      // c. Chạm vào user để trigger 'updated_at'
      // Tận dụng trigger 'trigger_set_timestamp'
      await tx.users.update({
        where: { id: user.id },
        data: {
          version: { increment: 1 } // Tăng version để buộc trigger 'updated_at' chạy
        }
      })
    })

    return email_verify_token
  }

  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA + BẢO MẬT]
  forgotPassword = async (email: string) => {
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      throw new HttpError(MESSAGES.USER_DOES_NOT_EXIST, 401)
    }

    // 1. Tạo forgot password token (token thô)
    const forgot_password_token = await this.signForgotPasswordToken({
      user_id: user.id,
      verify: UserVerifyStatus.Unverified
    })

    // 2. Lấy 'expires_at' từ token
    const decodedToken = await this.decodeToken(forgot_password_token, envConfig.secrets.jwt.forgotPassword as string)
    if (!decodedToken.exp) {
      throw new HttpError('Token creation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
    const expiresAt = new Date(decodedToken.exp * 1000)

    // 3. [BẢO MẬT] Hash token thô để lưu vào DB
    // Dùng hàm có sẵn trong crypto.ts
    const hashed_token_to_store = await generateHash(forgot_password_token)

    // 4. Cập nhật CSDL
    await prisma.$transaction(async (tx) => {
      // a. Xóa các token 'reset_password' cũ
      await tx.user_tokens.deleteMany({
        where: {
          user_id: user.id,
          type: 'reset_password'
        }
      })

      // b. Thêm token MỚI (đã hash)
      await tx.user_tokens.create({
        data: {
          token_hash: hashed_token_to_store, // <-- Lưu bản hash
          user_id: user.id,
          type: 'reset_password',
          expires_at: expiresAt
        }
      })

      // c. "Chạm" vào user
      await tx.users.update({
        where: { id: user.id },
        data: { version: { increment: 1 } }
      })
    })

    // 5. Trả về token thô (để gửi cho user, vd: qua email)
    return forgot_password_token
  }

  checkEmailExists = async (email: string) => {
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })
    if (existingUser) {
      throw new HttpError(MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.BAD_REQUEST)
    }
  }

  // hiện tại thì đăng ký chưa cho nhập luôn username, chờ làm được cái search nhanh thì mới cho nhập được vì check username đã tồn tại chưa khá lâu
  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA + BẢO MẬT]
  register = async (payload: RegisterBodyDto): Promise<RegisterResponseData> => {
    // 1. Hash mật khẩu (từ file crypto.ts)
    const hashedPassword = await generateHash(payload.password)

    let txResult: {
      email_verify_token: string
      access_token: string
      refresh_token: string
    }

    // 2. Bắt đầu một Transaction
    // Chúng ta cần tạo user, email token, và refresh token.
    // Nếu bất kỳ bước nào thất bại, toàn bộ sẽ rollback.
    try {
      txResult = await prisma.$transaction(async (tx) => {
        // --- A. TẠO USER ---
        // (Bỏ 'date_of_birth' và 'username' vì không có trong schema 'users')
        const newUser = await tx.users.create({
          data: {
            email: payload.email,
            password_hash: hashedPassword,
            role: payload.role, // Giả định 'payload.role' tồn tại và khớp Enum 'user_role'
            verified: true
          }
        })

        // (newUser.id hiện đã có)

        // --- B. TẠO VÀ LƯU EMAIL VERIFY TOKEN (Dạng Hash) ---
        const email_verify_token = await this.signEmailVerifyToken({
          user_id: newUser.id,
          verify: UserVerifyStatus.Unverified
        })
        console.log(email_verify_token)

        // Lấy exp và hash token (như Ppattern đã làm)
        const decodedVerifyToken = await this.decodeToken(
          email_verify_token,
          envConfig.secrets.jwt.emailVerify as string
        )
        if (!decodedVerifyToken.exp) {
          throw new HttpError('Verify token creation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }
        const verifyTokenExpiresAt = new Date(decodedVerifyToken.exp * 1000)
        const hashedVerifyToken = await generateHash(email_verify_token)
        console.log(hashedVerifyToken)
        await tx.user_tokens.create({
          data: {
            user_id: newUser.id,
            token_hash: hashedVerifyToken,
            type: 'verify_email',
            expires_at: verifyTokenExpiresAt
          }
        })

        // --- C. TẠO VÀ LƯU REFRESH TOKEN (Dạng Hash) ---
        const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
          user_id: newUser.id,
          verify: UserVerifyStatus.Unverified
        })

        // Lấy exp và hash token
        const decodedRefreshToken = await this.decodeToken(refresh_token, envConfig.secrets.jwt.refresh as string)
        if (!decodedRefreshToken.exp) {
          throw new HttpError('Refresh token creation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }
        const refreshTokenExpiresAt = new Date(decodedRefreshToken.exp * 1000)
        const hashedRefreshToken = await generateHash(refresh_token)

        // (Schema 'refresh_tokens' cũng dùng 'token_hash' )
        await tx.refresh_tokens.create({
          data: {
            user_id: newUser.id,
            token_hash: hashedRefreshToken,
            expires_at: refreshTokenExpiresAt
            // (có thể thêm ip_address, user_agent nếu muốn)
          }
        })

        // Trả về các token thô từ transaction
        return { email_verify_token, access_token, refresh_token }
      })
    } catch (error: any) {
      // Xử lý lỗi nếu email đã tồn tại (lỗi UNIQUE constraint)
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new HttpError(MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.BAD_REQUEST)
      }
      // Lỗi chung của transaction
      throw new HttpError(error.message || 'Registration failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // 3. Gửi Email (Sau khi transaction thành công)
    // Đặt bên ngoài transaction vì đây là I/O, không phải DB
    try {
      const html = getVerifyEmailTemplate(txResult.email_verify_token)
      await this.emailService.sendEmail(
        {
          to: payload.email,
          subject: 'Xác nhận địa chỉ email của bạn',
          html
        },
        MESSAGES.VERIFY_EMAIL_SUCCESS
      )
    } catch (emailError: any) {
      // Quan trọng: Không "throw" lỗi email.
      // User đã được tạo thành công, họ có thể dùng chức năng "resendVerifyEmail".
      console.error(`Registration successful, but email failed to send to ${payload.email}:`, emailError.message)
    }

    // 4. Trả về token cho client
    const registerResponseData: RegisterResponseData = {
      access_token: txResult.access_token,
      refresh_token: txResult.refresh_token
    }
    return registerResponseData
  }

  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA + BẢO MẬT]
  login = async (payload: { email: string; password: string }): Promise<LoginResponseDto> => {
    // 1. Tìm user theo email
    const user = await prisma.users.findUnique({
      where: { email: payload.email }
    })

    if (!user) {
      throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // 2. [THAY ĐỔI] Kiểm tra trạng thái 'verified' (dùng cột boolean)
    if (!user.verified) {
      throw new HttpError(MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN)
    }

    // 3. [THAY ĐỔI] So sánh mật khẩu (dùng cột 'password_hash')
    // (Đã dùng hàm 'compareHash' bạn cung cấp)
    const isMatch = await compareHash(payload.password, user.password_hash)
    if (!isMatch) {
      throw new HttpError(MESSAGES.INVALID_PASSWORD, HTTP_STATUS.UNAUTHORIZED)
    }

    // 4. [THAY ĐỔI] Tạo access token và refresh token
    // Map 'user.verified' (boolean) sang 'UserVerifyStatus' (enum)
    const verifyStatus = user.verified ? UserVerifyStatus.Verified : UserVerifyStatus.Unverified

    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id: user.id, // Dùng user.id (UUID string)
      verify: verifyStatus
    })

    // 5. [LOGIC MỚI] Lưu refresh token (đã hash) vào db
    try {
      const { user_id, exp } = await this.decodeToken(refresh_token, envConfig.secrets.jwt.refresh as string)

      if (!exp) {
        throw new HttpError(MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.BAD_REQUEST)
      }

      // Hash token thô trước khi lưu
      const hashed_refresh_token = await generateHash(refresh_token)
      const expiresAt = new Date(exp * 1000)

      // Dùng prisma để tạo bản ghi
      await prisma.refresh_tokens.create({
        data: {
          user_id: user_id, // user_id lấy từ payload token
          token_hash: hashed_refresh_token,
          expires_at: expiresAt
        }
      })
    } catch (error) {
      // Xử lý lỗi nếu việc decode hoặc lưu token thất bại
      throw new HttpError(MESSAGES.LOGIN_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // 6. Tạo LoginData để trả về
    const loginData: LoginData = {
      access_token,
      refresh_token
    }

    return new LoginResponseDto(loginData)
  }

  logout = async (refresh_token: string): Promise<LogoutResponseDto> => {
    await prisma.refresh_tokens.deleteMany({
      where: { token_hash: await generateHash(refresh_token) }
    })
    return new LogoutResponseDto(MESSAGES.LOGOUT_SUCCESS)
  }

  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA + BẢO MẬT]
  refreshToken = async ({
    refresh_token,
    user_id,
    verify,
    exp
  }: {
    refresh_token: string // Token thô (cũ)
    user_id: string
    verify: UserVerifyStatus
    exp: number // 'exp' từ payload của token cũ
  }): Promise<RefreshTokenResponseDto> => {
    // --- 1. [LOGIC MỚI] Xác thực token cũ trong CSDL ---
    // (Cần thiết vì chúng ta lưu hash)

    // Lấy tất cả token còn hạn của user
    const userTokens = await prisma.refresh_tokens.findMany({
      where: {
        user_id: user_id,
        expires_at: { gt: new Date() } // Chỉ token chưa hết hạn
      },
      select: { id: true, token_hash: true } // Lấy id và hash
    })

    let validTokenRecord = null
    for (const record of userTokens) {
      // So sánh token thô với hash trong CSDL
      const isMatch = await compareHash(refresh_token, record.token_hash)
      if (isMatch) {
        validTokenRecord = record
        break
      }
    }

    // Nếu không tìm thấy (token đã bị xoay vòng, bị thu hồi, hoặc không hợp lệ)
    if (!validTokenRecord) {
      throw new HttpError(MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED)
    }

    // --- 2. Tạo token mới ---
    // (Giữ nguyên logic gốc: tạo token mới nhưng vẫn dùng 'exp' CŨ)
    const [new_refresh_token, new_access_token] = await Promise.all([
      this.signRefreshToken({ user_id, verify, exp }),
      this.signAccessToken({ user_id, verify })
    ])

    // --- 3. [LOGIC MỚI] Xoay vòng token trong Transaction ---
    // (Xóa cũ, tạo mới một cách an toàn)

    const new_hashed_token = await generateHash(new_refresh_token)
    const expiresAt = new Date(exp * 1000) // 'exp' (số) -> 'expires_at' (Date)

    try {
      await prisma.$transaction(async (tx) => {
        // a. Xóa token cũ đã được xác thực
        await tx.refresh_tokens.delete({
          where: { id: validTokenRecord.id } // Xóa bằng ID (primary key)
        })

        // b. Tạo token mới (đã hash)
        await tx.refresh_tokens.create({
          data: {
            user_id: user_id,
            token_hash: new_hashed_token,
            expires_at: expiresAt
          }
        })
      })
    } catch (error) {
      // Nếu transaction thất bại, (vd: lỗi CSDL), báo lỗi
      throw new HttpError('Token rotation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // --- 4. Trả về token thô mới ---
    return new RefreshTokenResponseDto({
      access_token: new_access_token,
      refresh_token: new_refresh_token
    })
  }

  // [ĐÃ CHUYỂN ĐỔI TỪ MONGO + BẢO MẬT]
  verifyEmail = async ({
    token,
    user_id,
    verify // (Tham số 'verify' từ payload token, có thể không cần dùng)
  }: {
    token: string // Token thô từ URL
    user_id: string // Từ payload của token đã decode
    verify: UserVerifyStatus
  }): Promise<VerifyEmailResponseDto> => {
    // 1. [THAY ĐỔI] Tìm user bằng id (UUID string)
    const user = await prisma.users.findUnique({
      where: { id: user_id }
    })

    if (!user) {
      throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // 2. [THAY ĐỔI] Kiểm tra nếu đã xác thực (dùng cột boolean 'verified')
    // Mongo (cũ) dùng: user.verify === UserVerifyStatus.Verified
    if (user.verified) {
      return new VerifyEmailResponseDto(MESSAGES.EMAIL_ALREADY_VERIFIED)
    }

    // 3. [LOGIC MỚI] Tìm các hash token hợp lệ trong CSDL
    // (Thay thế cho: user.email_verify_token !== token)
    const userTokens = await prisma.user_tokens.findMany({
      where: {
        user_id: user_id,
        type: 'verify_email',
        expires_at: { gt: new Date() } // Chỉ lấy token còn hạn
      }
    })

    if (userTokens.length === 0) {
      throw new HttpError('Invalid or expired token', HTTP_STATUS.BAD_REQUEST)
    }

    // 4. [BẢO MẬT] So sánh token thô với các bản hash trong DB
    let validTokenRecord = null
    for (const record of userTokens) {
      // (Giả định đã đổi tên hàm hash)
      const isMatch = await compareHash(token, record.token_hash)
      if (isMatch) {
        validTokenRecord = record
        break
      }
    }

    // 5. Nếu không khớp
    if (!validTokenRecord) {
      throw new HttpError('Invalid token', HTTP_STATUS.BAD_REQUEST)
    }

    // 6. [LOGIC MỚI] Cập nhật user và xóa token
    // (Thay thế cho: databaseService.users.updateOne)
    await prisma.$transaction(async (tx) => {
      // a. Cập nhật trạng thái 'verified'
      await tx.users.update({
        where: { id: user_id },
        data: {
          verified: true, // Sét cột boolean
          version: { increment: 1 } // Trigger 'updated_at'
        }
      })

      // b. Xóa tất cả token 'verify_email' của user này
      await tx.user_tokens.deleteMany({
        where: {
          user_id: user_id,
          type: 'verify_email'
        }
      })
    })

    return new VerifyEmailResponseDto(MESSAGES.VERIFY_EMAIL_SUCCESS)
  }

  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA + BẢO MẬT]
  resetPassword = async ({
    token,
    new_password
  }: {
    token: string // Token thô user gửi lên
    new_password: string
  }): Promise<ResetPasswordResponseDto> => {
    let user_id: string
    let verify: UserVerifyStatus

    try {
      // 1. Giải mã token (để lấy user_id và kiểm tra chữ ký/hết hạn)
      const decodedPayload = (await this.decodeToken(
        token,
        envConfig.secrets.jwt.forgotPassword as string
      )) as TokenPayload

      user_id = decodedPayload.user_id
      verify = decodedPayload.verify || UserVerifyStatus.Unverified
    } catch (error: any) {
      // Xử lý lỗi nếu `decodeToken` thất bại (vd: hết hạn, sai chữ ký)
      // Lỗi này đã được xử lý bên trong `verifyToken` (ném HttpError)
      if (error instanceof HttpError) {
        throw error
      }
      // Lỗi chung của JWT
      throw new HttpError(MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // 2. [LOGIC MỚI] Tìm token trong CSDL
    // (Thay thế cho: findOne({ forgot_password_token: token }))
    const userTokens = await prisma.user_tokens.findMany({
      where: {
        user_id: user_id,
        type: 'reset_password',
        expires_at: { gt: new Date() } // Chỉ lấy token còn hạn
      }
    })

    if (userTokens.length === 0) {
      throw new HttpError('Invalid or expired token', HTTP_STATUS.BAD_REQUEST)
    }

    // 3. [BẢO MẬT] Dùng `compareHash` để tìm bản hash khớp
    let validTokenRecord = null
    for (const record of userTokens) {
      // (Giả định đã đổi tên hàm hash)
      const isMatch = await compareHash(token, record.token_hash)
      if (isMatch) {
        validTokenRecord = record
        break
      }
    }

    // 4. Nếu không có token nào khớp
    if (!validTokenRecord) {
      throw new HttpError('Invalid token', HTTP_STATUS.BAD_REQUEST)
    }

    // 5. Nếu khớp -> Tiến hành reset password và xóa token
    const hashedPassword = await generateHash(new_password)

    // 6. [LOGIC MỚI] Tạo token mới VÀ cập nhật CSDL
    // (Phải tạo token mới trước khi vào transaction để lưu hash)
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id: user_id,
      verify: verify
    })

    // Hash refresh token mới
    const { exp } = await this.decodeToken(refresh_token, envConfig.secrets.jwt.refresh as string)
    if (!exp) {
      throw new HttpError('Failed to create new refresh token', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
    const hashedRefreshToken = await generateHash(refresh_token)
    const refreshTokenExpiresAt = new Date(exp * 1000)

    // 7. [LOGIC MỚI] Dùng Transaction
    await prisma.$transaction(async (tx) => {
      // a. Cập nhật mật khẩu user (dùng cột 'password_hash' từ .sql)
      await tx.users.update({
        where: { id: user_id },
        data: {
          password_hash: hashedPassword,
          version: { increment: 1 } // Kích hoạt trigger updated_at
        }
      })

      // b. Xóa tất cả token 'reset_password' của user này
      // (Bao gồm cả token vừa dùng)
      await tx.user_tokens.deleteMany({
        where: {
          user_id: user_id,
          type: 'reset_password'
        }
      })

      // c. [LOGIC MỚI] Lưu refresh token mới để "đăng nhập"
      await tx.refresh_tokens.create({
        data: {
          user_id: user_id,
          token_hash: hashedRefreshToken,
          expires_at: refreshTokenExpiresAt
        }
      })
    })

    // 8. Trả về token (user đã được đăng nhập)
    return new ResetPasswordResponseDto({ access_token, refresh_token })
  }

  // [ĐÃ CHUYỂN ĐỔI SANG PRISMA]
  changePassword = async ({
    old_password,
    new_password,
    user_id
  }: {
    old_password: string
    new_password: string
    user_id: string
  }): Promise<ChangePasswordResponseDto> => {
    // 1. [THAY ĐỔI] Tìm user bằng id (UUID string)
    const user = await prisma.users.findUnique({
      where: { id: user_id } // Không cần new ObjectId()
    })

    if (!user) {
      throw new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // 2. [THAY ĐỔI] So sánh mật khẩu (dùng cột 'password_hash')
    // (Đã dùng hàm 'compareHash' bạn cung cấp)
    const isMatch = await compareHash(old_password, user.password_hash)
    if (!isMatch) {
      throw new HttpError(MESSAGES.INVALID_OLD_PASSWORD, HTTP_STATUS.BAD_REQUEST)
    }

    // 3. Hash mật khẩu mới (Giữ nguyên)
    const hashedPassword = await generateHash(new_password)

    // 4. [THAY ĐỔI] Cập nhật CSDL
    await prisma.users.update({
      where: { id: user_id },
      data: {
        password_hash: hashedPassword, // Cập nhật cột 'password_hash'
        version: { increment: 1 } // Kích hoạt trigger 'updated_at'
      }
    })

    // 5. Trả về (Giữ nguyên)
    return new ChangePasswordResponseDto()
  }
}
