import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  MatchingRequestSchema,
  MatchingCandidatesResponseSchema,
  MatchingJobsResponseSchema,
  MatchedItemSchema
} from '../src/api/matching/matching.dto'

// Mock the matching service to avoid dependencies
jest.mock('../src/api/matching/matching.service', () => ({
  matchingService: {
    matchCandidatesForJob: jest.fn(),
    matchJobsForProfile: jest.fn()
  }
}))

describe('Matching DTO Validation', () => {
  describe('MatchingRequestSchema', () => {
    it('should accept valid size parameter', () => {
      const result = MatchingRequestSchema.parse({ size: '25' })
      expect(result.size).toBe(25)
    })

    it('should use default size when not provided', () => {
      const result = MatchingRequestSchema.parse({})
      expect(result.size).toBe(50)
    })

    it('should reject invalid size values', () => {
      expect(() => MatchingRequestSchema.parse({ size: '0' })).toThrow()
      expect(() => MatchingRequestSchema.parse({ size: '501' })).toThrow()
      expect(() => MatchingRequestSchema.parse({ size: 'abc' })).toThrow()
    })
  })

  describe('MatchedItemSchema', () => {
    it('should accept valid matched item', () => {
      const validItem = {
        id: 'test-id',
        score_percent: 85.5,
        explanation: {
          text: 25.0,
          skills: 30.5,
          location: 15.0
        },
        _source: { name: 'Test Item' }
      }

      const result = MatchedItemSchema.parse(validItem)
      expect(result.score_percent).toBe(85.5)
      expect(result.explanation.text).toBe(25.0)
    })

    it('should accept decimal score_percent', () => {
      const result = MatchedItemSchema.parse({
        id: 'test-id',
        score_percent: 75.7,
        explanation: {}
      })
      expect(result.score_percent).toBe(75.7)
    })

    it('should reject score_percent outside 0-100 range', () => {
      expect(() => MatchedItemSchema.parse({
        id: 'test-id',
        score_percent: 150,
        explanation: {}
      })).toThrow()

      expect(() => MatchedItemSchema.parse({
        id: 'test-id',
        score_percent: -10,
        explanation: {}
      })).toThrow()
    })

    it('should accept empty explanation object', () => {
      const result = MatchedItemSchema.parse({
        id: 'test-id',
        score_percent: 50,
        explanation: {}
      })
      expect(result.explanation).toEqual({})
    })

    it('should accept undefined _source', () => {
      const result = MatchedItemSchema.parse({
        id: 'test-id',
        score_percent: 50,
        explanation: {}
      })
      expect(result._source).toBeUndefined()
    })
  })

  describe('MatchingCandidatesResponseSchema', () => {
    it('should accept valid candidates response', () => {
      const validResponse = {
        jobId: 'job-123',
        total: 25,
        candidates: [
          {
            id: 'candidate-1',
            score_percent: 90,
            explanation: { overall_score: 90 },
            _source: { name: 'John Doe' }
          },
          {
            id: 'candidate-2',
            score_percent: 75.5,
            explanation: { overall_score: 75.5 }
          }
        ]
      }

      const result = MatchingCandidatesResponseSchema.parse(validResponse)
      expect(result.jobId).toBe('job-123')
      expect(result.total).toBe(25)
      expect(result.candidates).toHaveLength(2)
    })

    it('should reject negative total', () => {
      expect(() => MatchingCandidatesResponseSchema.parse({
        jobId: 'job-123',
        total: -1,
        candidates: []
      })).toThrow()
    })
  })

  describe('MatchingJobsResponseSchema', () => {
    it('should accept valid jobs response', () => {
      const validResponse = {
        profileId: 'profile-456',
        total: 10,
        jobs: [
          {
            id: 'job-1',
            score_percent: 85.2,
            explanation: {
              text: 20.5,
              skills: 25.8,
              location: 15.2,
              experience: 10.1,
              recency: 5.0,
              activity: 3.2,
              work_arrangement: 8.5,
              benefits: 6.1,
              category: 4.2
            },
            _source: {
              title: 'Software Engineer',
              company_name: 'Tech Corp'
            }
          }
        ]
      }

      const result = MatchingJobsResponseSchema.parse(validResponse)
      expect(result.profileId).toBe('profile-456')
      expect(result.total).toBe(10)
      expect(result.jobs).toHaveLength(1)
      expect(result.jobs[0].explanation.text).toBe(20.5)
    })
  })
})
