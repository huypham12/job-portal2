/**
 * Unit tests for Skill Scorer
 */

import { describe, it, expect } from '@jest/globals'
import {
  computeSkillScore,
  analyzeSkillGap,
  getSkillMatchQuality
} from '../../src/search/scoring/skill.scorer'

describe('Skill Scorer', () => {
  describe('computeSkillScore', () => {
    it('should return zero score for no skills', () => {
      const result = computeSkillScore([], [])

      expect(result.exactMatches).toBe(0)
      expect(result.partialMatches).toBe(0)
      expect(result.totalScore).toBe(0)
      expect(result.matchDetails).toEqual([])
    })

    it('should handle exact skill matches', () => {
      const jobSkills = ['JavaScript', 'React', 'Node.js']
      const candidateSkills = [
        { name: 'JavaScript', proficiency: 4 },
        { name: 'React', proficiency: 3 },
        { name: 'Python', proficiency: 3 }
      ]

      const result = computeSkillScore(jobSkills, candidateSkills)

      expect(result.exactMatches).toBe(2) // JavaScript and React
      expect(result.partialMatches).toBe(0)
      expect(result.totalScore).toBeGreaterThan(0)
      expect(result.matchDetails).toHaveLength(3)
    })

    it('should handle partial skill matches', () => {
      const jobSkills = ['JavaScript']
      const candidateSkills = [
        { name: 'JS', proficiency: 3 } // Partial match
      ]

      const result = computeSkillScore(jobSkills, candidateSkills)

      expect(result.exactMatches).toBe(0)
      expect(result.partialMatches).toBe(1)
      expect(result.totalScore).toBeGreaterThan(0)
    })

    it('should calculate proficiency scores correctly', () => {
      const jobSkills = ['JavaScript']
      const candidateSkills = [
        { name: 'JavaScript', proficiency: 5 } // Expert level
      ]

      const result = computeSkillScore(jobSkills, candidateSkills)

      expect(result.proficiencyScore).toBe(1) // 5/5 = 1.0
      expect(result.exactMatches).toBe(1)
    })

    it('should handle mixed skill formats', () => {
      const jobSkills = ['JavaScript', 'React'] // Flat strings
      const candidateSkills = [
        'JavaScript', // String
        { name: 'React', proficiency: 4 } // Object
      ]

      const result = computeSkillScore(jobSkills, candidateSkills)

      expect(result.exactMatches).toBe(2)
      expect(result.proficiencyScore).toBe(0.7) // (3 + 4) / (2 * 5) = 0.7
    })
  })

  describe('analyzeSkillGap', () => {
    it('should identify missing and weak skills', () => {
      const jobSkills = ['JavaScript', 'React', 'Node.js']
      const candidateSkills = [
        { name: 'JavaScript', proficiency: 2 }, // Weak
        { name: 'Python', proficiency: 4 }      // Irrelevant
      ]

      const gap = analyzeSkillGap(jobSkills, candidateSkills)

      expect(gap.missingSkills).toContain('React')
      expect(gap.missingSkills).toContain('Node.js')
      expect(gap.weakSkills).toHaveLength(1)
      expect(gap.weakSkills[0].skill).toBe('JavaScript')
      expect(gap.strongSkills).toHaveLength(0)
    })

    it('should identify strong skills', () => {
      const jobSkills = ['JavaScript', 'React']
      const candidateSkills = [
        { name: 'JavaScript', proficiency: 5 },
        { name: 'React', proficiency: 4 }
      ]

      const gap = analyzeSkillGap(jobSkills, candidateSkills)

      expect(gap.strongSkills).toHaveLength(2)
      expect(gap.missingSkills).toHaveLength(0)
      expect(gap.weakSkills).toHaveLength(0)
    })
  })

  describe('getSkillMatchQuality', () => {
    it('should classify excellent matches', () => {
      const quality = getSkillMatchQuality(2, 0, 2, 0.9) // 2 exact, 0 partial, 2 total, 90% proficiency

      expect(quality.quality).toBe('excellent')
      expect(quality.description).toContain('Strong skill match')
    })

    it('should classify poor matches', () => {
      const quality = getSkillMatchQuality(0, 1, 3, 0.2) // 0 exact, 1 partial, 3 total, 20% proficiency

      expect(quality.quality).toBe('poor')
      expect(quality.description).toContain('Limited skill match')
      expect(quality.recommendation).toContain('Not recommended')
    })

    it('should handle edge cases', () => {
      const quality = getSkillMatchQuality(0, 0, 0, 0) // No skills required

      expect(quality.quality).toBe('excellent') // Default for no requirements
    })
  })

  describe('Experience-based proficiency inference', () => {
    it('should infer proficiency from experience', () => {
      // Test the internal inference logic through the main function
      const jobSkills = ['JavaScript']
      const candidateSkills = ['JavaScript'] // String format, will use experience inference

      const result = computeSkillScore(jobSkills, candidateSkills, 5) // 5 years experience

      expect(result.proficiencyScore).toBe(0.8) // Intermediate level (3/5 = 0.6, but boosted)
    })

    it('should handle different experience levels', () => {
      const jobSkills = ['JavaScript']

      // Junior (2 years)
      const junior = computeSkillScore(jobSkills, ['JavaScript'], 2)
      expect(junior.proficiencyScore).toBe(0.4) // Beginner level

      // Senior (8 years)
      const senior = computeSkillScore(jobSkills, ['JavaScript'], 8)
      expect(senior.proficiencyScore).toBe(1.0) // Expert level
    })
  })
})
