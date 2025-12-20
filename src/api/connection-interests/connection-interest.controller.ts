import { Request, Response, NextFunction } from 'express'
import {
  createConnectionInterest,
  getConnectionInterests,
  getConnectionInterestById,
  respondToInterest,
  deleteConnectionInterest,
  getConnectionInterestStats
} from './connection-interest.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { CreateInterestDTO, GetInterestsDTO, RespondInterestDTO } from './connection-interest.validator'

export class ConnectionInterestController {
  /**
   * POST /api/connection-interests
   * Create a new connection interest (Recruiter only)
   */
  createInterest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as CreateInterestDTO

      const interest = await createConnectionInterest(user_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: interest,
        message: 'Connection interest created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/connection-interests
   * Get list of connection interests with filters
   */
  getInterests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload
      const filters = req.query as unknown as GetInterestsDTO

      const result = await getConnectionInterests(user_id, role as 'candidate' | 'recruiter', filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/connection-interests/:id
   * Get connection interest by ID
   */
  getInterestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const interest = await getConnectionInterestById(user_id, role as 'candidate' | 'recruiter', id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: interest
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/connection-interests/:id/respond
   * Respond to connection interest (accept/reject) - Candidate only
   */
  respondToInterest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const { action, message } = req.body as RespondInterestDTO['body']

      const interest = await respondToInterest(user_id, id, action, message)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: interest,
        message: `Connection interest ${action}ed successfully`
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/connection-interests/:id
   * Delete connection interest (Recruiter only)
   */
  deleteInterest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const result = await deleteConnectionInterest(user_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/connection-interests/stats
   * Get connection interest statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload

      const stats = await getConnectionInterestStats(user_id, role as 'candidate' | 'recruiter')

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }
}

