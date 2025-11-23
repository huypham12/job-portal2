import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { envConfig } from '@/config/getEnvConfig'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { randomUUID } from 'crypto'

export interface S3UploadParams {
  file: Express.Multer.File
  folder: string
  filename?: string
}

export interface S3UploadResult {
  url: string
  key: string
  originalFilename: string
  mimeType: string
  size: number
}

export class S3Service {
  private s3Client: S3Client | null = null
  private bucketName: string

  constructor() {
    // AWS credentials có thể optional trong môi trường dev
    // Kiểm tra cả tồn tại và không phải empty string
    const hasAwsCredentials =
      envConfig.aws?.accessKeyId &&
      envConfig.aws.accessKeyId.length > 0 &&
      envConfig.aws?.secretAccessKey &&
      envConfig.aws.secretAccessKey.length > 0

    if (hasAwsCredentials) {
      this.s3Client = new S3Client({
        region: envConfig.aws.region || 'ap-southeast-1',
        credentials: {
          accessKeyId: envConfig.aws.accessKeyId,
          secretAccessKey: envConfig.aws.secretAccessKey
        }
      })
    } else {
      // Fallback: có thể dùng local storage hoặc mock
      console.warn('[S3Service] AWS credentials not configured, S3 uploads will fail')
    }

    // Lấy bucket name từ envConfig thay vì process.env trực tiếp
    this.bucketName = envConfig.aws?.s3BucketName || 'job-portal-uploads'

    // Log để debug
    if (hasAwsCredentials) {
      console.log('[S3Service] Initialized:', {
        bucketName: this.bucketName,
        region: envConfig.aws?.region || 'ap-southeast-1',
        hasCredentials: true
      })
    } else {
      console.log('[S3Service] Initialized (no credentials):', {
        bucketName: this.bucketName,
        region: envConfig.aws?.region || 'ap-southeast-1'
      })
    }
  }

  /**
   * Upload file to S3
   */
  async uploadFile(params: S3UploadParams): Promise<S3UploadResult> {
    if (!this.s3Client) {
      throw new HttpError(
        'S3 client is not initialized. Please configure AWS credentials.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    try {
      const { file, folder, filename } = params
      const fileExtension = file.originalname.split('.').pop() || ''
      const fileName = filename || `${randomUUID()}.${fileExtension}`
      const key = `${folder}/${fileName}`

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
        // ACL 'public-read' đã deprecated trong S3 mới
        // Để files có thể truy cập public, cần cấu hình Bucket Policy trên AWS Console:
        // 1. Vào S3 → Bucket → Permissions → Bucket Policy
        // 2. Thêm policy cho phép public read (xem comment bên dưới)
        // 3. Nếu cần private files, không cần Bucket Policy và dùng presigned URLs
      })

      await this.s3Client.send(command)

      // Tạo public URL
      const url = this.getPublicUrl(key)

      return {
        url,
        key,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }
    } catch (error: any) {
      // Parse error code từ XML response hoặc error object
      const errorCode = error.Code || error.code || error.$metadata?.httpStatusCode
      const errorMessage = error.Message || error.message || 'Unknown error'

      // Phân loại error để có message rõ ràng hơn
      let userFriendlyMessage = `Failed to upload file to S3: ${errorMessage}`

      if (errorCode === 'NoSuchBucket' || errorMessage?.includes('does not exist')) {
        userFriendlyMessage = `S3 bucket "${this.bucketName}" does not exist. Please create the bucket in region "${envConfig.aws?.region || 'ap-southeast-1'}" or check your S3_BUCKET_NAME in .env file.`
      } else if (
        errorCode === 'AccessDenied' ||
        errorMessage?.includes('Access Denied') ||
        errorMessage?.includes('access denied')
      ) {
        userFriendlyMessage = `Access denied to S3 bucket "${this.bucketName}".

Possible solutions:
1. Check IAM user permissions - ensure your IAM user has these policies:
   - s3:PutObject
   - s3:GetObject
   - s3:DeleteObject
   - s3:ListBucket

2. Check Bucket Policy - ensure bucket policy allows your IAM user/role

3. Check Block Public Access settings - if files need to be public, configure Bucket Policy instead

4. Verify AWS credentials in .env file are correct and have proper permissions.`
      } else if (
        errorCode === 'InvalidAccessKeyId' ||
        errorMessage?.includes('InvalidAccessKeyId') ||
        errorMessage?.includes('Invalid access key')
      ) {
        userFriendlyMessage = 'Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID in .env file.'
      } else if (
        errorCode === 'SignatureDoesNotMatch' ||
        errorMessage?.includes('SignatureDoesNotMatch') ||
        errorMessage?.includes('Signature mismatch') ||
        errorMessage?.includes('The request signature we calculated does not match')
      ) {
        userFriendlyMessage = 'Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY in .env file.'
      } else if (errorMessage?.includes('The specified key does not exist')) {
        userFriendlyMessage = `The specified key does not exist in bucket "${this.bucketName}".`
      } else if (errorMessage?.includes('BucketAlreadyOwnedByYou')) {
        userFriendlyMessage = `Bucket "${this.bucketName}" already exists and is owned by you. Please check your bucket name.`
      }

      // Log chi tiết để debug
      console.error('[S3Service] Upload error:', {
        bucketName: this.bucketName,
        region: envConfig.aws?.region || 'ap-southeast-1',
        errorCode,
        errorMessage,
        errorName: error.name,
        fullError: error
      })

      throw new HttpError(userFriendlyMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new HttpError(
        'S3 client is not initialized. Please configure AWS credentials.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      await this.s3Client.send(command)
    } catch (error: any) {
      // Phân loại error để có message rõ ràng hơn
      let errorMessage = `Failed to delete file from S3: ${error.message}`

      if (error.message?.includes('does not exist')) {
        errorMessage = `S3 bucket "${this.bucketName}" does not exist. Please create the bucket in region "${envConfig.aws?.region || 'ap-southeast-1'}" or check your S3_BUCKET_NAME in .env file.`
      } else if (error.message?.includes('Access Denied') || error.message?.includes('access denied')) {
        errorMessage = `Access denied to S3 bucket "${this.bucketName}". Please check your AWS credentials and bucket permissions.`
      } else if (error.message?.includes('InvalidAccessKeyId') || error.message?.includes('Invalid access key')) {
        errorMessage = 'Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID in .env file.'
      } else if (error.message?.includes('SignatureDoesNotMatch') || error.message?.includes('Signature mismatch')) {
        errorMessage = 'Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY in .env file.'
      }

      // Log chi tiết để debug
      console.error('[S3Service] Delete error:', {
        bucketName: this.bucketName,
        region: envConfig.aws?.region || 'ap-southeast-1',
        error: error.message,
        errorCode: error.Code || error.code,
        errorName: error.name
      })

      throw new HttpError(errorMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Get public URL for file
   */
  private getPublicUrl(key: string): string {
    const region = envConfig.aws.region || 'ap-southeast-1'
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`
  }

  /**
   * Extract S3 key from URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1)
    } catch {
      return null
    }
  }
}
