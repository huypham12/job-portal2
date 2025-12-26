/**
 * AI Generator - Học patterns từ data thực tế VN và generate data quality cao
 * Không sử dụng real AI API, thay vào đó học statistical patterns
 */

import { faker } from '@faker-js/faker'
import {
  SKILLS_DATABASE,
  SKILL_CATEGORIES,
  COMPANY_INDUSTRIES,
  COMPANY_SIZE_RANGES,
  JOB_TEMPLATES,
  SENIORITY_LEVELS,
  CANDIDATE_DISTRIBUTION,
  USER_BEHAVIOR_PATTERNS,
  MATCHING_PROBABILITIES,
  VIETNAM_PROVINCES,
  TAGS_DATABASE,
  SALARY_RANGES,
  EDUCATION_PATTERNS,
  SEED_RANDOM
} from './constants'

// Set deterministic seed
faker.seed(SEED_RANDOM)

// ============================================================================
// PATTERN LEARNING - Học từ data thực tế
// ============================================================================

class PatternLearner {
  private skillPatterns: Map<string, any> = new Map()
  private companyPatterns: Map<string, any> = new Map()
  private jobPatterns: Map<string, any> = new Map()

  constructor() {
    this.learnSkillPatterns()
    this.learnCompanyPatterns()
    this.learnJobPatterns()
  }

  private learnSkillPatterns() {
    // Học phân phối skills theo seniority
    const skillsBySeniority = {
      junior: [] as string[],
      mid: [] as string[],
      senior: [] as string[]
    }

    SKILLS_DATABASE.forEach((skill) => {
      if (skill.seniority.junior > 30) skillsBySeniority.junior.push(skill.name)
      if (skill.seniority.mid > 40) skillsBySeniority.mid.push(skill.name)
      if (skill.seniority.senior > 60) skillsBySeniority.senior.push(skill.name)
    })

    this.skillPatterns.set('junior', {
      skills: skillsBySeniority.junior,
      count: { min: 2, max: 4 }
    })

    this.skillPatterns.set('mid', {
      skills: skillsBySeniority.mid,
      count: { min: 3, max: 6 }
    })

    this.skillPatterns.set('senior', {
      skills: skillsBySeniority.senior,
      count: { min: 4, max: 8 }
    })
  }

  private learnCompanyPatterns() {
    // Học patterns company theo industry
    COMPANY_INDUSTRIES.forEach((industry) => {
      this.companyPatterns.set(industry.name, {
        types: industry.companyTypes,
        sizes: COMPANY_SIZE_RANGES
      })
    })
  }

  private learnJobPatterns() {
    // Học patterns job theo category
    const jobByCategory = new Map()

    JOB_TEMPLATES.forEach((template) => {
      if (!jobByCategory.has(template.category)) {
        jobByCategory.set(template.category, [])
      }
      jobByCategory.get(template.category).push(template)
    })

    jobByCategory.forEach((templates, category) => {
      this.jobPatterns.set(category, templates)
    })
  }

  getSkillPattern(seniority: string) {
    return this.skillPatterns.get(seniority)
  }

  getCompanyPattern(industry: string) {
    return this.companyPatterns.get(industry)
  }

  getJobPattern(category: string) {
    return this.jobPatterns.get(category)
  }
}

// ============================================================================
// AI GENERATOR CLASS
// ============================================================================

export class AIGenerator {
  private learner: PatternLearner
  private generatedData = {
    companies: [] as any[],
    jobs: [] as any[],
    profiles: [] as any[]
  }

  constructor() {
    this.learner = new PatternLearner()
  }

  // ============================================================================
  // COMPANY GENERATION
  // ============================================================================

  generateCompany(industry?: string): any {
    // Chọn industry ngẫu nhiên theo weight nếu không chỉ định
    const selectedIndustry = industry || this.weightedRandom(COMPANY_INDUSTRIES)

    // Học pattern từ industry
    const pattern = this.learner.getCompanyPattern((selectedIndustry as any).name)

    // Generate company data
    const companyType = faker.helpers.arrayElement(pattern.types)
    const sizeRange = this.weightedRandom(COMPANY_SIZE_RANGES)
    const size = faker.number.int({ min: sizeRange.min, max: sizeRange.max })

    const company = {
      name: this.generateCompanyName((selectedIndustry as any).name, companyType as string),
      description: this.generateCompanyDescription((selectedIndustry as any).name, size, companyType as string),
      industry: (selectedIndustry as any).name,
      company_type: companyType,
      size: size,
      contact_email: faker.internet.email(),
      contact_phone: `+84 ${faker.phone.number()}`
        .replace(/[^0-9]/g, '')
        .slice(0, 9)
        .replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
      contact_address: this.generateVietnamAddress(),
      website_url: faker.internet.url(),
      linkedin_url: `https://linkedin.com/company/${faker.lorem.slug()}`,
      facebook_url: `https://facebook.com/${faker.lorem.slug()}`,
      tax_code: faker.string.numeric(10),
      founded_year: faker.number.int({ min: 2010, max: 2024 }),
      employee_count_min: Math.floor(size * 0.8),
      employee_count_max: Math.floor(size * 1.2),
      culture_description: this.generateCultureDescription(companyType as string),
      benefits: this.generateCompanyBenefits((selectedIndustry as any).name, companyType as string)
    }

    this.generatedData.companies.push(company)
    return company
  }

  // ============================================================================
  // JOB GENERATION
  // ============================================================================

  generateJob(company: any, jobCategory?: string): any {
    // Chọn category ngẫu nhiên nếu không chỉ định
    const category =
      jobCategory ||
      faker.helpers.arrayElement(
        Object.keys(
          this.learner.getJobPattern('backend')
            ? ['backend', 'frontend', 'fullstack', 'devops', 'product', 'design', 'data']
            : ['backend']
        )
      )

    // Học pattern từ category
    const patterns =
      this.learner.getJobPattern(category) || JOB_TEMPLATES.filter((t) => (t as any).category === category)
    const template = patterns ? faker.helpers.arrayElement(patterns) : JOB_TEMPLATES[0]

    // Generate job data dựa trên template
    const location = this.weightedRandom(VIETNAM_PROVINCES)

    const templateData = template as any
    const job = {
      company_slug: company.name.toLowerCase().replace(/\s+/g, '-'),
      title: templateData.title,
      department: this.getDepartmentFromCategory(templateData.category),
      location_province: location.name,
      job_type: faker.helpers.arrayElement(['full_time', 'part_time', 'contract']),
      level: templateData.seniority,
      experience_years_min: templateData.experienceMin,
      experience_years_max: templateData.experienceMax,
      salary: {
        min: templateData.salaryMin,
        max: templateData.salaryMax,
        currency: 'triệu VND',
        unit: 'month'
      },
      tags: this.generateJobTags(templateData.category, location.name),
      skills: [...templateData.requiredSkills, ...templateData.preferredSkills.slice(0, 2)],
      description: this.generateJobDescription(templateData),
      requirements: this.generateJobRequirements(templateData),
      benefits: this.generateJobBenefits(company.industry, company.company_type),
      work_arrangement: this.generateWorkArrangement()
    }

    this.generatedData.jobs.push(job)
    return job
  }

  // ============================================================================
  // PROFILE GENERATION
  // ============================================================================

  generateProfile(): any {
    // Chọn seniority theo phân phối thực tế
    const seniority = this.weightedRandomByDistribution(CANDIDATE_DISTRIBUTION)
    const seniorityData = SENIORITY_LEVELS[seniority.toUpperCase()]

    // Học skill pattern
    const skillPattern = this.learner.getSkillPattern(seniority)
    const skillCount = faker.number.int({
      min: skillPattern.count.min,
      max: skillPattern.count.max
    })

    // Chọn skills theo seniority
    const selectedSkills = faker.helpers.arrayElements(skillPattern.skills, skillCount)

    // Generate experience phù hợp
    const yearsExperience = faker.number.int({
      min: seniorityData.experienceMin,
      max: seniorityData.experienceMax
    })

    // Generate profile
    const profile = {
      email: faker.internet.email(),
      full_name: faker.person.fullName(),
      display_name: faker.internet.username(),
      headline: this.generateHeadline(
        selectedSkills.map((s) => (s as any).name),
        seniority,
        yearsExperience
      ),
      bio: this.generateBio(
        selectedSkills.map((s) => (s as any).name),
        yearsExperience
      ),
      gender: faker.helpers.arrayElement(['Male', 'Female']),
      date_of_birth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      phone_number: `091${faker.string.numeric(7)}`,
      years_of_experience: yearsExperience,
      desired_job_title: this.generateDesiredJobTitle(selectedSkills.map((s) => (s as any).name)),
      desired_job_type: [faker.helpers.arrayElement(['full_time', 'part_time'])],
      desired_salary_min: this.generateDesiredSalary(
        seniority,
        selectedSkills.map((s) => (s as any).name)
      ),
      desired_currency: 'VND',
      availability_status: faker.helpers.arrayElement(['OPEN', 'PASSIVE', 'NOT_LOOKING']),
      is_looking_for_job: faker.datatype.boolean(),
      is_public: true,
      location_text: this.weightedRandom(VIETNAM_PROVINCES).name,
      github_url: faker.datatype.boolean() ? `https://github.com/${faker.internet.username()}` : null,
      linkedin_url: `https://linkedin.com/in/${faker.internet.username()}`,
      avatar_url: `https://i.pravatar.cc/300?u=${faker.internet.username()}`,
      skills: selectedSkills.map((skill) => ({
        name: skill,
        proficiency: faker.number.int({ min: 1, max: 5 }),
        level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced', 'expert'])
      })),
      experiences: this.generateExperiences(yearsExperience),
      educations: this.generateEducations(),
      certifications: this.generateCertifications(yearsExperience),
      awards: this.generateAwards(yearsExperience)
    }

    this.generatedData.profiles.push(profile)
    return profile
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private weightedRandom(items: any[]): any {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    let random = faker.number.int({ min: 1, max: totalWeight })

    for (const item of items) {
      random -= item.weight
      if (random <= 0) return item
    }
    return items[0]
  }

  private weightedRandomByDistribution(distribution: Record<string, number>): string {
    const total = Object.values(distribution).reduce((sum, weight) => sum + weight, 0)
    let random = faker.number.float({ min: 0, max: total })

    for (const [key, weight] of Object.entries(distribution)) {
      random -= weight
      if (random <= 0) return key
    }
    return Object.keys(distribution)[0]
  }

  // ============================================================================
  // SPECIFIC GENERATION METHODS
  // ============================================================================

  private generateCompanyName(industry: string, type: string): string {
    const prefixes = {
      Technology: ['Tech', 'Digital', 'Smart', 'Cloud', 'Data'],
      FinTech: ['Pay', 'Fin', 'Money', 'Bank', 'Wallet'],
      'E-commerce': ['Shop', 'Buy', 'Market', 'Store', 'Trade']
    }

    const suffix = type === 'startup' ? ['Labs', 'Hub', 'Studio', 'Works'] : ['Corp', 'Group', 'Solutions', 'Systems']
    const prefix = prefixes[industry] ? faker.helpers.arrayElement(prefixes[industry]) : 'Global'

    return `${prefix} ${faker.company.name().split(' ')[1]} ${faker.helpers.arrayElement(suffix)}`
  }

  private generateCompanyDescription(industry: string, size: number, type: string): string {
    const templates = [
      `Công ty ${industry.toLowerCase()} hàng đầu Việt Nam với đội ngũ ${size} nhân viên chuyên cung cấp giải pháp công nghệ tiên tiến.`,
      `Startup ${industry.toLowerCase()} đang phát triển nhanh với văn hóa làm việc sáng tạo và môi trường thân thiện.`,
      `Doanh nghiệp ${industry.toLowerCase()} uy tín với ${size} năm kinh nghiệm, cam kết chất lượng và đổi mới.`
    ]
    return faker.helpers.arrayElement(templates)
  }

  private generateVietnamAddress(): string {
    const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Thủ Đức', 'Cầu Giấy', 'Đống Đa']
    const streets = ['Đường', 'Phố', 'Đại lộ', 'Ngõ']
    const cities = VIETNAM_PROVINCES.slice(0, 10).map((p) => p.name) // Take top 10 provinces for address generation
    return `${faker.helpers.arrayElement(streets)} ${faker.location.street()}, ${faker.helpers.arrayElement(districts)}, ${faker.helpers.arrayElement(cities)}`
  }

  private generateCultureDescription(type: string): string {
    const cultures = {
      startup: 'Môi trường năng động, khuyến khích sáng tạo và học hỏi liên tục.',
      enterprise: 'Văn hóa chuyên nghiệp, ổn định với cơ hội phát triển lâu dài.',
      sme: 'Môi trường làm việc thân thiện, hỗ trợ nhau cùng phát triển.'
    }
    return cultures[type] || cultures.startup
  }

  private generateCompanyBenefits(industry: string, type: string): any[] {
    const commonBenefits = [
      { benefit_type: 'health', title: 'Bảo hiểm sức khỏe', description: 'BHYT đầy đủ' },
      { benefit_type: 'vacation', title: 'Nghỉ phép năm', description: '12-15 ngày nghỉ phép' },
      { benefit_type: 'training', title: 'Đào tạo', description: 'Hỗ trợ học phí và khóa học' }
    ]

    if (type === 'startup') {
      commonBenefits.push(
        { benefit_type: 'remote', title: 'Làm việc từ xa', description: 'Hybrid working model' },
        { benefit_type: 'bonus', title: 'Thưởng hiệu suất', description: 'Thưởng theo KPI hàng quý' }
      )
    }

    return faker.helpers.arrayElements(commonBenefits, { min: 3, max: 5 })
  }

  private getDepartmentFromCategory(category: string): string {
    const departments = {
      backend: 'Engineering',
      frontend: 'Engineering',
      fullstack: 'Engineering',
      devops: 'Engineering',
      mobile: 'Engineering',
      product: 'Product',
      design: 'Design',
      data: 'Data',
      qa: 'Quality Assurance'
    }
    return departments[category] || 'Engineering'
  }

  private generateJobTags(category: string, location: string): string[] {
    const categoryTags = {
      backend: ['Backend', 'Server-side'],
      frontend: ['Frontend', 'Client-side'],
      fullstack: ['Full-stack', 'Web Development'],
      devops: ['DevOps', 'Infrastructure'],
      product: ['Product', 'Management'],
      design: ['UI/UX', 'Design'],
      data: ['Data', 'Analytics']
    }

    const tags = categoryTags[category] || ['Technology']

    // Check if location is a major city for remote work
    const majorCities = VIETNAM_PROVINCES.slice(0, 5).map((p) => p.name) // Top 5 provinces by weight
    tags.push(majorCities.includes(location) ? 'Remote Friendly' : 'Onsite')

    return faker.helpers.arrayElements(tags, { min: 2, max: 4 })
  }

  private generateJobDescription(template: any): string[] {
    return [
      `Tham gia đội ngũ ${template.category} phát triển sản phẩm công nghệ tiên tiến.`,
      `Sử dụng ${template.requiredSkills.slice(0, 3).join(', ')} để xây dựng giải pháp chất lượng cao.`,
      `Cơ hội làm việc với team ${template.seniority} experienced và học hỏi công nghệ mới.`
    ]
  }

  private generateJobRequirements(template: any): any[] {
    return template.requiredSkills.map((skill) => ({
      requirement_type: 'skill',
      title: `Kinh nghiệm ${skill}`,
      description: `Có kinh nghiệm làm việc với ${skill}`,
      is_required: faker.datatype.boolean(),
      level: faker.helpers.arrayElement(['intermediate', 'advanced']),
      years_experience: faker.number.int({ min: 1, max: template.experienceMax })
    }))
  }

  private generateJobBenefits(industry: string, companyType: string): any[] {
    const benefits = [
      {
        benefit_type: 'salary',
        title: 'Lương thưởng',
        description: 'Lương cạnh tranh + thưởng hiệu suất'
      },
      {
        benefit_type: 'insurance',
        title: 'Bảo hiểm',
        description: 'BHYT, BHXH đầy đủ'
      }
    ]

    if (companyType === 'startup') {
      benefits.push({
        benefit_type: 'remote',
        title: 'Làm việc linh hoạt',
        description: 'Hybrid working model'
      })
    }

    return benefits
  }

  private generateWorkArrangement(): any {
    return {
      is_remote_allowed: faker.datatype.boolean(),
      remote_percentage: faker.number.int({ min: 0, max: 100 }),
      flexible_hours: faker.datatype.boolean(),
      travel_requirement: faker.helpers.arrayElement(['none', 'minimal', 'moderate']),
      overtime_expected: faker.datatype.boolean(),
      shift_type: 'day'
    }
  }

  private generateHeadline(skills: string[], seniority: string, experience: number): string {
    const mainSkill = faker.helpers.arrayElement(skills)
    const titles = {
      junior: `${mainSkill} Developer`,
      mid: `Senior ${mainSkill} Developer`,
      senior: `Lead ${mainSkill} Engineer`
    }
    return titles[seniority] || titles.mid
  }

  private generateBio(skills: string[], experience: number): string {
    const templates = [
      `Kỹ sư phần mềm với ${experience} năm kinh nghiệm chuyên về ${skills.slice(0, 3).join(', ')}.`,
      `Developer passionate về ${skills[0]} với background ${experience} năm trong industry.`,
      `Tech enthusiast với expertise trong ${skills.slice(0, 2).join(' và ')}, ${experience} năm kinh nghiệm.`
    ]
    return faker.helpers.arrayElement(templates)
  }

  private generateDesiredJobTitle(skills: string[]): string {
    const mainSkill = faker.helpers.arrayElement(skills)
    return `${mainSkill} Developer`
  }

  private generateDesiredSalary(seniority: string, skills: string[]): number {
    const baseSalary = SALARY_RANGES[seniority]?.backend?.min || 20
    const multiplier = 1 + faker.number.float({ min: 0, max: 0.5 }) // ±50%
    return Math.round(baseSalary * multiplier * 1000000) // Convert to VND
  }

  private generateExperiences(yearsExperience: number): any[] {
    const experiences = []
    let currentYear = new Date().getFullYear()
    let remainingYears = yearsExperience

    while (remainingYears > 0) {
      const expYears = Math.min(faker.number.int({ min: 1, max: 3 }), remainingYears)
      const endDate =
        remainingYears === yearsExperience
          ? null
          : new Date(
              currentYear - (yearsExperience - remainingYears - expYears),
              faker.number.int({ min: 1, max: 12 }),
              1
            )
      const startDate = new Date(
        currentYear - (yearsExperience - remainingYears),
        faker.number.int({ min: 1, max: 12 }),
        1
      )

      experiences.push({
        company_name: faker.company.name(),
        position: faker.person.jobTitle(),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        is_current: endDate === null,
        description: faker.lorem.sentence()
      })

      remainingYears -= expYears
    }

    return experiences.reverse()
  }

  private generateEducations(): any[] {
    const education = faker.helpers.arrayElement(EDUCATION_PATTERNS)
    const degree = faker.helpers.arrayElement(education.degrees)
    const field = faker.helpers.arrayElement(education.fields)

    return [
      {
        school_name: education.school,
        degree: degree,
        field_of_study: field,
        start_date: '2010-09-01',
        end_date: '2014-06-30'
      }
    ]
  }

  private generateCertifications(yearsExperience: number): any[] {
    if (yearsExperience < 2) return []

    const certCount = faker.number.int({ min: 0, max: Math.min(yearsExperience, 3) })
    const certifications = []

    for (let i = 0; i < certCount; i++) {
      certifications.push({
        name: faker.helpers.arrayElement([
          'AWS Certified',
          'Google Cloud Professional',
          'Certified Scrum Master',
          'Oracle Certified'
        ]),
        issuing_org: faker.company.name(),
        issue_date: faker.date.past({ years: yearsExperience }).toISOString().split('T')[0],
        description: faker.lorem.sentence()
      })
    }

    return certifications
  }

  private generateAwards(yearsExperience: number): any[] {
    if (yearsExperience < 3) return []

    const awardCount = faker.number.int({ min: 0, max: Math.min(Math.floor(yearsExperience / 2), 2) })
    const awards = []

    for (let i = 0; i < awardCount; i++) {
      awards.push({
        title: faker.helpers.arrayElement(['Employee of the Month', 'Best Performer', 'Innovation Award']),
        issuer: faker.company.name(),
        date: faker.date.past({ years: yearsExperience }).toISOString().split('T')[0],
        description: faker.lorem.sentence()
      })
    }

    return awards
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const aiGenerator = new AIGenerator()
