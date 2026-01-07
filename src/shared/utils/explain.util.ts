import { ScoreComponents } from './scoring.util'

export type ScoreBreakdown = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
  availability: number // Added availability
  work_arrangement: number
  benefits: number
  category: number
  total: number // Added total score
}

export type ScoreExplanation = {
  breakdown: ScoreBreakdown
  insights: string[] // Human-readable insights about the match
}

/**
 * Convert raw normalized component values (0..1) and weights into a human-readable breakdown.
 * Returns breakdown values as percentages that sum approximately to totalPercent.
 *
 * Pseudocode:
 *  - inputs: components, weights
 *  - compute weighted sum per component
 *  - normalize to 0..100
 */
export function formatBreakdown(
  components: ScoreComponents,
  weights: {
    text?: number
    skills?: number
    location?: number
    experience?: number
    recency?: number
    activity?: number
    availability?: number
    work_arrangement?: number
    benefits?: number
    category?: number
  } = {}
): ScoreExplanation {
  const defaultWeights = {
    text: 0.15,
    skills: 0.35,
    location: 0.15,
    experience: 0.12,
    recency: 0.03,
    activity: 0.08,
    availability: 0.05,
    work_arrangement: 0.05,
    benefits: 0.02,
    category: 0.0
  }
  const w = { ...defaultWeights, ...weights }

  const text = components.text * w.text
  const skills = components.skills * w.skills
  const location = components.location * w.location
  const experience = components.experience * w.experience
  const recency = components.recency * w.recency
  const activity = components.activity * w.activity
  const availability = components.availability * (w.availability || 0)
  const work_arrangement = components.work_arrangement * w.work_arrangement
  const benefits = components.benefits * w.benefits
  const category = components.category * w.category

  const total =
    text + skills + location + experience + recency + activity + availability + work_arrangement + benefits + category

  // Normalize each to percent of total (if total > 0) and scale to 0..100
  if (total <= 0) {
    return {
      breakdown: {
        text: 0,
        skills: 0,
        location: 0,
        experience: 0,
        recency: 0,
        activity: 0,
        availability: 0,
        work_arrangement: 0,
        benefits: 0,
        category: 0,
        total: 0
      },
      insights: ['No matching factors found']
    }
  }

  const factor = 100 / total
  const breakdown = {
    text: Math.round(text * factor * 10) / 10,
    skills: Math.round(skills * factor * 10) / 10,
    location: Math.round(location * factor * 10) / 10,
    experience: Math.round(experience * factor * 10) / 10,
    recency: Math.round(recency * factor * 10) / 10,
    activity: Math.round(activity * factor * 10) / 10,
    availability: Math.round(availability * factor * 10) / 10,
    work_arrangement: Math.round(work_arrangement * factor * 10) / 10,
    benefits: Math.round(benefits * factor * 10) / 10,
    category: Math.round(category * factor * 10) / 10,
    total: Math.round(total * 100 * 10) / 10
  }

  // Generate insights based on the breakdown
  const insights = generateInsights(breakdown, components)

  return { breakdown, insights }
}

/**
 * Generate human-readable insights about the candidate-job match for Vietnam market
 */
function generateInsights(breakdown: ScoreBreakdown, components: ScoreComponents): string[] {
  const insights: string[] = []

  // Skills insights - improved for Vietnam context
  if (breakdown.skills >= 35) {
    insights.push('🎯 Kỹ năng phù hợp hoàn hảo - candidate sẵn sàng đóng góp ngay')
  } else if (breakdown.skills >= 20) {
    insights.push('📈 Có nền tảng kỹ năng tốt - có thể phát triển thêm')
  } else if (breakdown.skills >= 10) {
    insights.push('🛠️ Cần bổ sung kỹ năng - đánh giá training budget')
  } else {
    insights.push('⚠️ Khác biệt kỹ năng lớn - xem xét kỹ lưỡng')
  }

  // Experience insights - improved messaging
  if (breakdown.experience >= 15) {
    insights.push('💼 Kinh nghiệm phù hợp - có thể đảm nhận ngay')
  } else if (breakdown.experience >= 8) {
    insights.push('📈 Kinh nghiệm cơ bản - cần mentoring và training')
  } else {
    insights.push('🎓 Mới vào nghề - cần training và supervision')
  }

  // Location insights - optimized for Vietnam commuting patterns
  if (breakdown.location >= 20) {
    insights.push('📍 Vị trí thuận tiện - tiết kiệm chi phí di chuyển')
  } else if (breakdown.location >= 10) {
    insights.push('🚗 Có thể di chuyển - xem xét hỗ trợ chi phí')
  } else {
    insights.push('✈️ Vị trí xa - cân nhắc remote hoặc relocation support')
  }

  // Activity insights - improved for Vietnam job market
  if (breakdown.activity >= 10) {
    insights.push('🔥 Đang tích cực tìm việc - khả năng cao sẽ chấp nhận offer')
  } else {
    insights.push('😴 Ít hoạt động - cần follow-up và re-engagement')
  }

  // Availability insights
  if (breakdown.availability >= 10) {
    insights.push('✅ Đang tìm việc - sẵn sàng cho interview')
  } else {
    insights.push('❓ Tình trạng khả dụng chưa rõ - cần xác minh')
  }

  // Work arrangement insights - Vietnam context
  if (breakdown.work_arrangement >= 10) {
    insights.push('🏢 Sở thích làm việc phù hợp (remote/office hours)')
  }

  // Benefits insights
  if (breakdown.benefits >= 5) {
    insights.push('🎁 Mong muốn phúc lợi phù hợp với công ty')
  }

  // Overall assessment with actionable Vietnamese messaging
  const totalScore = breakdown.total
  if (totalScore >= 80) {
    insights.unshift('⭐ NGỌC TRAI HIẾM: Ứng viên xuất sắc - ưu tiên interview ngay!')
  } else if (totalScore >= 65) {
    insights.unshift('✅ Ứng viên tiềm năng: Đáng xem xét và interview')
  } else if (totalScore >= 45) {
    insights.unshift('🤔 Ứng viên trung bình: Cân nhắc nếu thiếu lựa chọn tốt hơn')
  } else {
    insights.unshift('❌ Không phù hợp: Tập trung vào ứng viên khác')
  }

  return insights.slice(0, 6) // Top 6 insights for better coverage
}
