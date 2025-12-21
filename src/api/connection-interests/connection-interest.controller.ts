import { Request, Response, NextFunction } from 'express'
import * as ConnectionInterestService from './connection-interest.service'
import { CreateInterestDTO, GetInterestsDTO, InterestIdDTO } from './connection-interest.validator'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'

/**
 * Create a new connection interest
 * POST /api/connection-interests
 * Role: Recruiter
 */
export const createConnectionInterest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const interest = await ConnectionInterestService.createConnectionInterest(user_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Connection interest created successfully',
      data: interest
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get connection interests list
 * GET /api/connection-interests
 * Role: Candidate or Recruiter
 */
export const getConnectionInterests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.decoded_authorization as TokenPayload

    const result = await ConnectionInterestService.getConnectionInterests(
      user_id,
      role as 'candidate' | 'recruiter',
      req.query as any
    )

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get connection interest by ID
 * GET /api/connection-interests/:id
 * Role: Candidate or Recruiter
 */
export const getConnectionInterestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const interest = await ConnectionInterestService.getConnectionInterestById(
      user_id,
      role as 'candidate' | 'recruiter',
      id
    )

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: interest
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete connection interest
 * DELETE /api/connection-interests/:id
 * Role: Recruiter
 */
export const deleteConnectionInterest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { id } = req.params

    const result = await ConnectionInterestService.deleteConnectionInterest(user_id, id)

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get connection interest statistics
 * GET /api/connection-interests/stats
 * Role: Candidate or Recruiter
 */
export const getConnectionInterestStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.decoded_authorization as TokenPayload

    const stats = await ConnectionInterestService.getConnectionInterestStats(user_id, role as 'candidate' | 'recruiter')

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats
    })
  } catch (error) {
    next(error)
  }
}
