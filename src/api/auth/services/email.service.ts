import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import { envConfig } from '../../../config/getEnvConfig'

interface SendEmailParams {
  fromAddress: string
  toAddresses: string | string[]
  ccAddresses?: string | string[]
  body: string
  subject: string
  replyToAddresses?: string | string[]
}

interface VerifyEmailParams {
  to: string
  subject: string
  html: string
}

export class EmailService {
  private sesClient: SESClient

  constructor() {
    this.sesClient = new SESClient({
      region: envConfig.aws.region,
      credentials: {
        secretAccessKey: envConfig.aws.secretAccessKey,
        accessKeyId: envConfig.aws.accessKeyId
      }
    })
  }

  private createSendEmailCommand({
    fromAddress,
    toAddresses,
    ccAddresses = [],
    body,
    subject,
    replyToAddresses = []
  }: SendEmailParams): SendEmailCommand {
    return new SendEmailCommand({
      Destination: {
        /* required */
        CcAddresses: ccAddresses instanceof Array ? ccAddresses : [ccAddresses],
        ToAddresses: toAddresses instanceof Array ? toAddresses : [toAddresses]
      },
      Message: {
        /* required */
        Body: {
          /* required */
          Html: {
            Charset: 'UTF-8',
            Data: body
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      Source: fromAddress,
      ReplyToAddresses: replyToAddresses instanceof Array ? replyToAddresses : [replyToAddresses]
    })
  }

  async sendVerifyEmail(params: VerifyEmailParams, successMessage?: string): Promise<any> {
    const sendEmailCommand = this.createSendEmailCommand({
      fromAddress: envConfig.aws.sesFromAddress,
      toAddresses: params.to,
      body: params.html,
      subject: params.subject
    })

    try {
      const result = await this.sesClient.send(sendEmailCommand)
      if (successMessage) {
        console.log(successMessage)
      }
      return result
    } catch (error: any) {
      console.error('Failed to send email. Error details:')
      console.error(error) // log object đầy đủ
      console.error(JSON.stringify(error, null, 2)) // log dạng JSON readable
      throw error
    }
  }
}
