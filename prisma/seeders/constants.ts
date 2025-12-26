/**
 * Constants cho việc generate dữ liệu thực tế Việt Nam
 * Dữ liệu được nghiên cứu từ thị trường tuyển dụng VN 2024
 */

import * as fs from 'fs'
import * as path from 'path'

export const SEED_RANDOM = 42 // Deterministic seed

// Load cities data from JSON
const loadCitiesData = () => {
  try {
    const citiesPath = path.join(__dirname, 'data', 'cities.json')
    const cities: any[] = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'))

    // Transform to VIETNAM_PROVINCES format with weights
    const weights: Record<string, number> = {
      'Hà Nội': 25,
      'Hồ Chí Minh': 35,
      'Đà Nẵng': 8,
      'Cần Thơ': 4,
      'Hải Phòng': 6,
      'Bình Dương': 5,
      'Đồng Nai': 4,
      'Hà Giang': 1,
      'Cao Bằng': 1,
      'Bắc Kạn': 1,
      'Tuyên Quang': 1,
      'Lào Cai': 1,
      'Điện Biên': 1,
      'Lai Châu': 1,
      'Sơn La': 1,
      'Yên Bái': 1,
      'Hòa Bình': 1,
      'Thái Nguyên': 1,
      'Lạng Sơn': 1,
      'Quảng Ninh': 2,
      'Bắc Giang': 1,
      'Phú Thọ': 1,
      'Vĩnh Phúc': 1,
      'Bắc Ninh': 2,
      'Hải Dương': 2,
      'Hưng Yên': 1,
      'Thái Bình': 1,
      'Hà Nam': 1,
      'Nam Định': 1,
      'Ninh Bình': 1,
      'Thanh Hóa': 3,
      'Nghệ An': 3,
      'Hà Tĩnh': 1,
      'Quảng Bình': 1,
      'Quảng Trị': 1,
      'Thừa Thiên Huế': 2,
      'Quảng Nam': 2,
      'Quảng Ngãi': 1,
      'Bình Định': 2,
      'Phú Yên': 1,
      'Khánh Hòa': 3,
      'Ninh Thuận': 1,
      'Bình Thuận': 2,
      'Kon Tum': 1,
      'Gia Lai': 1,
      'Đắk Lắk': 2,
      'Đắk Nông': 1,
      'Lâm Đồng': 2,
      'Bình Phước': 1,
      'Tây Ninh': 1,
      'Bà Rịa - Vũng Tàu': 2,
      'Tiền Giang': 1,
      'Bến Tre': 1,
      'Trà Vinh': 1,
      'Vĩnh Long': 1,
      'Đồng Tháp': 1,
      'An Giang': 1,
      'Kiên Giang': 1,
      'Hậu Giang': 1,
      'Sóc Trăng': 1,
      'Bạc Liêu': 1,
      'Cà Mau': 1
    }

    return cities.map((city) => ({
      name: city.name,
      weight: weights[city.name] || 1,
      type: 'province' as const,
      code: city.code
    }))
  } catch (error) {
    console.error('Error loading cities data:', error)
    // Fallback to basic data
    return [
      { name: 'Hà Nội', weight: 25, type: 'province' as const },
      { name: 'Hồ Chí Minh', weight: 35, type: 'province' as const },
      { name: 'Đà Nẵng', weight: 8, type: 'province' as const }
    ]
  }
}

// ============================================================================
// SKILLS DISTRIBUTION - Dựa trên thị trường VN 2024
// ============================================================================

export const SKILL_CATEGORIES = {
  PROGRAMMING_LANGUAGES: 'programming_languages',
  FRAMEWORKS: 'frameworks',
  DATABASES: 'databases',
  CLOUD: 'cloud',
  DEVOPS: 'devops',
  MOBILE: 'mobile',
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  DATA: 'data',
  DESIGN: 'design',
  MANAGEMENT: 'management',
  OTHER: 'other'
} as const

export const SKILLS_DATABASE = [
  // Programming Languages - phổ biến nhất
  {
    name: 'JavaScript',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 95,
    seniority: { junior: 60, mid: 80, senior: 90 }
  },
  {
    name: 'TypeScript',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 85,
    seniority: { junior: 40, mid: 70, senior: 90 }
  },
  {
    name: 'Python',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 75,
    seniority: { junior: 30, mid: 60, senior: 85 }
  },
  {
    name: 'Java',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 70,
    seniority: { junior: 25, mid: 55, senior: 80 }
  },
  {
    name: 'C#',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 45,
    seniority: { junior: 20, mid: 40, senior: 65 }
  },
  {
    name: 'PHP',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 40,
    seniority: { junior: 25, mid: 45, senior: 60 }
  },
  {
    name: 'Go',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 35,
    seniority: { junior: 15, mid: 35, senior: 70 }
  },
  {
    name: 'Rust',
    category: SKILL_CATEGORIES.PROGRAMMING_LANGUAGES,
    weight: 15,
    seniority: { junior: 5, mid: 15, senior: 40 }
  },

  // Frameworks - phổ biến
  { name: 'React', category: SKILL_CATEGORIES.FRAMEWORKS, weight: 90, seniority: { junior: 50, mid: 75, senior: 90 } },
  {
    name: 'Node.js',
    category: SKILL_CATEGORIES.FRAMEWORKS,
    weight: 85,
    seniority: { junior: 40, mid: 70, senior: 90 }
  },
  { name: 'Vue.js', category: SKILL_CATEGORIES.FRAMEWORKS, weight: 50, seniority: { junior: 30, mid: 55, senior: 70 } },
  {
    name: 'Angular',
    category: SKILL_CATEGORIES.FRAMEWORKS,
    weight: 40,
    seniority: { junior: 20, mid: 45, senior: 65 }
  },
  {
    name: 'Spring Boot',
    category: SKILL_CATEGORIES.FRAMEWORKS,
    weight: 45,
    seniority: { junior: 15, mid: 40, senior: 75 }
  },
  { name: 'Django', category: SKILL_CATEGORIES.FRAMEWORKS, weight: 35, seniority: { junior: 20, mid: 45, senior: 65 } },
  { name: '.NET', category: SKILL_CATEGORIES.FRAMEWORKS, weight: 40, seniority: { junior: 20, mid: 45, senior: 65 } },

  // Databases - phổ biến
  {
    name: 'PostgreSQL',
    category: SKILL_CATEGORIES.DATABASES,
    weight: 75,
    seniority: { junior: 25, mid: 55, senior: 85 }
  },
  { name: 'MySQL', category: SKILL_CATEGORIES.DATABASES, weight: 70, seniority: { junior: 30, mid: 60, senior: 80 } },
  { name: 'MongoDB', category: SKILL_CATEGORIES.DATABASES, weight: 65, seniority: { junior: 25, mid: 50, senior: 75 } },
  { name: 'Redis', category: SKILL_CATEGORIES.DATABASES, weight: 60, seniority: { junior: 15, mid: 40, senior: 75 } },
  {
    name: 'Elasticsearch',
    category: SKILL_CATEGORIES.DATABASES,
    weight: 25,
    seniority: { junior: 5, mid: 20, senior: 50 }
  },

  // Cloud - đang hot
  { name: 'AWS', category: SKILL_CATEGORIES.CLOUD, weight: 70, seniority: { junior: 15, mid: 45, senior: 80 } },
  { name: 'Azure', category: SKILL_CATEGORIES.CLOUD, weight: 35, seniority: { junior: 10, mid: 30, senior: 60 } },
  { name: 'GCP', category: SKILL_CATEGORIES.CLOUD, weight: 25, seniority: { junior: 5, mid: 20, senior: 45 } },
  { name: 'Docker', category: SKILL_CATEGORIES.CLOUD, weight: 75, seniority: { junior: 25, mid: 55, senior: 85 } },
  { name: 'Kubernetes', category: SKILL_CATEGORIES.CLOUD, weight: 45, seniority: { junior: 10, mid: 30, senior: 70 } },

  // DevOps - hot skill
  { name: 'Git', category: SKILL_CATEGORIES.DEVOPS, weight: 90, seniority: { junior: 60, mid: 80, senior: 95 } },
  { name: 'Jenkins', category: SKILL_CATEGORIES.DEVOPS, weight: 35, seniority: { junior: 10, mid: 35, senior: 65 } },
  {
    name: 'GitLab CI/CD',
    category: SKILL_CATEGORIES.DEVOPS,
    weight: 40,
    seniority: { junior: 15, mid: 40, senior: 70 }
  },
  { name: 'Terraform', category: SKILL_CATEGORIES.DEVOPS, weight: 20, seniority: { junior: 5, mid: 15, senior: 45 } },

  // Mobile - phổ biến
  {
    name: 'React Native',
    category: SKILL_CATEGORIES.MOBILE,
    weight: 50,
    seniority: { junior: 20, mid: 45, senior: 70 }
  },
  { name: 'Flutter', category: SKILL_CATEGORIES.MOBILE, weight: 35, seniority: { junior: 15, mid: 35, senior: 60 } },
  {
    name: 'iOS Development',
    category: SKILL_CATEGORIES.MOBILE,
    weight: 25,
    seniority: { junior: 10, mid: 30, senior: 55 }
  },
  {
    name: 'Android Development',
    category: SKILL_CATEGORIES.MOBILE,
    weight: 30,
    seniority: { junior: 15, mid: 35, senior: 60 }
  },

  // Data Science - đang phát triển
  { name: 'SQL', category: SKILL_CATEGORIES.DATA, weight: 80, seniority: { junior: 40, mid: 65, senior: 85 } },
  {
    name: 'Machine Learning',
    category: SKILL_CATEGORIES.DATA,
    weight: 20,
    seniority: { junior: 5, mid: 15, senior: 40 }
  },
  {
    name: 'Data Analysis',
    category: SKILL_CATEGORIES.DATA,
    weight: 55,
    seniority: { junior: 25, mid: 50, senior: 75 }
  },
  { name: 'Power BI', category: SKILL_CATEGORIES.DATA, weight: 40, seniority: { junior: 15, mid: 40, senior: 65 } },
  { name: 'Tableau', category: SKILL_CATEGORIES.DATA, weight: 30, seniority: { junior: 10, mid: 35, senior: 60 } },

  // Design - UI/UX
  { name: 'Figma', category: SKILL_CATEGORIES.DESIGN, weight: 70, seniority: { junior: 40, mid: 65, senior: 85 } },
  { name: 'Adobe XD', category: SKILL_CATEGORIES.DESIGN, weight: 45, seniority: { junior: 25, mid: 50, senior: 70 } },
  { name: 'Sketch', category: SKILL_CATEGORIES.DESIGN, weight: 35, seniority: { junior: 20, mid: 45, senior: 65 } },
  {
    name: 'User Research',
    category: SKILL_CATEGORIES.DESIGN,
    weight: 50,
    seniority: { junior: 20, mid: 45, senior: 75 }
  },

  // Management - leadership
  {
    name: 'Agile/Scrum',
    category: SKILL_CATEGORIES.MANAGEMENT,
    weight: 75,
    seniority: { junior: 30, mid: 60, senior: 90 }
  },
  {
    name: 'Project Management',
    category: SKILL_CATEGORIES.MANAGEMENT,
    weight: 60,
    seniority: { junior: 20, mid: 50, senior: 80 }
  },
  {
    name: 'Leadership',
    category: SKILL_CATEGORIES.MANAGEMENT,
    weight: 45,
    seniority: { junior: 10, mid: 35, senior: 75 }
  },
  {
    name: 'Team Management',
    category: SKILL_CATEGORIES.MANAGEMENT,
    weight: 50,
    seniority: { junior: 15, mid: 40, senior: 80 }
  }
]

// ============================================================================
// COMPANY PATTERNS - Thực tế VN
// ============================================================================

export const COMPANY_INDUSTRIES = [
  { name: 'Technology', weight: 25, companyTypes: ['startup', 'enterprise', 'corporation'] },
  { name: 'FinTech', weight: 15, companyTypes: ['startup', 'enterprise'] },
  { name: 'E-commerce', weight: 12, companyTypes: ['startup', 'enterprise', 'corporation'] },
  { name: 'Healthcare', weight: 8, companyTypes: ['enterprise', 'corporation'] },
  { name: 'Education', weight: 10, companyTypes: ['startup', 'enterprise', 'sme'] },
  { name: 'Manufacturing', weight: 6, companyTypes: ['enterprise', 'corporation'] },
  { name: 'Retail', weight: 7, companyTypes: ['enterprise', 'corporation'] },
  { name: 'Consulting', weight: 5, companyTypes: ['sme', 'enterprise'] },
  { name: 'Real Estate', weight: 4, companyTypes: ['enterprise', 'corporation'] },
  { name: 'Media', weight: 3, companyTypes: ['startup', 'sme'] },
  { name: 'Logistics', weight: 3, companyTypes: ['enterprise', 'corporation'] },
  { name: 'Gaming', weight: 2, companyTypes: ['startup', 'enterprise'] }
]

export const COMPANY_SIZE_RANGES = [
  { min: 10, max: 50, weight: 30, type: 'small' },
  { min: 51, max: 200, weight: 40, type: 'medium' },
  { min: 201, max: 1000, weight: 25, type: 'large' },
  { min: 1001, max: 5000, weight: 5, type: 'enterprise' }
]

// ============================================================================
// JOB PATTERNS - Thực tế VN
// ============================================================================

export const JOB_TEMPLATES = [
  // Backend Development
  {
    title: 'Senior Backend Developer (Node.js)',
    category: 'backend',
    seniority: 'senior',
    experienceMin: 4,
    experienceMax: 7,
    salaryMin: 35,
    salaryMax: 60,
    requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'],
    preferredSkills: ['AWS', 'Kubernetes', 'Microservices'],
    weight: 15
  },
  {
    title: 'Backend Developer (Java/Spring)',
    category: 'backend',
    seniority: 'mid',
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 25,
    salaryMax: 45,
    requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'Git'],
    preferredSkills: ['Docker', 'AWS', 'Agile/Scrum'],
    weight: 12
  },
  {
    title: 'Frontend Developer (React)',
    category: 'frontend',
    seniority: 'mid',
    experienceMin: 2,
    experienceMax: 4,
    salaryMin: 20,
    salaryMax: 40,
    requiredSkills: ['React', 'JavaScript', 'TypeScript', 'CSS'],
    preferredSkills: ['Vue.js', 'Node.js', 'Figma'],
    weight: 18
  },
  {
    title: 'Full-stack Developer',
    category: 'fullstack',
    seniority: 'mid',
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 25,
    salaryMax: 50,
    requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'Git'],
    preferredSkills: ['TypeScript', 'Docker', 'AWS'],
    weight: 20
  },
  {
    title: 'DevOps Engineer',
    category: 'devops',
    seniority: 'senior',
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 30,
    salaryMax: 55,
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Git'],
    preferredSkills: ['Terraform', 'Jenkins', 'Python'],
    weight: 8
  },
  {
    title: 'Product Manager',
    category: 'product',
    seniority: 'mid',
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 25,
    salaryMax: 50,
    requiredSkills: ['Agile/Scrum', 'User Research', 'Data Analysis', 'SQL'],
    preferredSkills: ['Figma', 'Project Management'],
    weight: 10
  },
  {
    title: 'UI/UX Designer',
    category: 'design',
    seniority: 'mid',
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: 18,
    salaryMax: 35,
    requiredSkills: ['Figma', 'User Research', 'Prototyping'],
    preferredSkills: ['Adobe XD', 'Sketch', 'React'],
    weight: 12
  },
  {
    title: 'Data Analyst',
    category: 'data',
    seniority: 'junior',
    experienceMin: 1,
    experienceMax: 3,
    salaryMin: 15,
    salaryMax: 30,
    requiredSkills: ['SQL', 'Excel', 'Data Analysis'],
    preferredSkills: ['Python', 'Power BI', 'Tableau'],
    weight: 5
  }
]

// ============================================================================
// SENIORITY & EXPERIENCE PATTERNS
// ============================================================================

export const SENIORITY_LEVELS = {
  JUNIOR: { name: 'junior', experienceMin: 0, experienceMax: 2, weight: 35 },
  MID: { name: 'mid', experienceMin: 2, experienceMax: 5, weight: 45 },
  SENIOR: { name: 'senior', experienceMin: 5, experienceMax: 10, weight: 20 }
}

export const CANDIDATE_DISTRIBUTION = {
  junior: 0.35, // 35% junior
  mid: 0.45, // 45% mid
  senior: 0.2 // 20% senior
}

// ============================================================================
// USER BEHAVIOR PATTERNS - Quan trọng cho recommendation testing
// ============================================================================

export const USER_BEHAVIOR_PATTERNS = {
  // Job views: rất nhiều views
  jobViewsPerUser: { min: 50, max: 200, average: 120 },

  // Saved jobs: ít hơn views đáng kể
  savedJobsPerUser: { min: 5, max: 25, average: 12 },

  // Applications: rất ít so với views
  applicationsPerUser: { min: 0, max: 5, average: 1.5 },

  // Search history: nhiều searches
  searchesPerUser: { min: 20, max: 100, average: 45 },

  // Clicked jobs per search
  clicksPerSearch: { min: 0, max: 5, average: 1.2 }
}

// ============================================================================
// MATCHING & MISMATCH PATTERNS - Tạo noise cho testing
// ============================================================================

export const MATCHING_PROBABILITIES = {
  // Perfect match (có tất cả skills required)
  perfectMatch: 0.05, // 5%

  // Good match (70-90% required skills)
  goodMatch: 0.15, // 15%

  // Partial match (40-70% required skills)
  partialMatch: 0.3, // 30%

  // Poor match (10-40% required skills)
  poorMatch: 0.35, // 35%

  // No match (0-10% required skills)
  noMatch: 0.15 // 15%
}

// ============================================================================
// VIETNAM LOCATIONS - Thực tế từ cities.json
// ============================================================================

export const VIETNAM_PROVINCES = loadCitiesData()

// ============================================================================
// TAGS - Thực tế VN market
// ============================================================================

export const TAGS_DATABASE = [
  // Job types
  { name: 'Remote', weight: 25 },
  { name: 'Onsite', weight: 40 },
  { name: 'Hybrid', weight: 35 },

  // Work arrangements
  { name: 'Full-time', weight: 80 },
  { name: 'Part-time', weight: 15 },
  { name: 'Contract', weight: 5 },

  // Benefits
  { name: 'Healthcare', weight: 60 },
  { name: 'Insurance', weight: 70 },
  { name: 'Flexible Hours', weight: 45 },
  { name: 'Training Budget', weight: 35 },
  { name: 'Stock Options', weight: 10 },
  { name: 'Free Lunch', weight: 40 },

  // Company types
  { name: 'Startup', weight: 30 },
  { name: 'Scale-up', weight: 20 },
  { name: 'Enterprise', weight: 25 },
  { name: 'Product Company', weight: 15 },
  { name: 'Consulting', weight: 10 },

  // Tech focus
  { name: 'AI/ML', weight: 15 },
  { name: 'FinTech', weight: 20 },
  { name: 'E-commerce', weight: 25 },
  { name: 'SaaS', weight: 30 },
  { name: 'Mobile', weight: 20 },
  { name: 'Web', weight: 35 },
  { name: 'Cloud', weight: 25 }
]

// ============================================================================
// SALARY RANGES - Thực tế VN 2024 (triệu VND/tháng)
// ============================================================================

export const SALARY_RANGES = {
  junior: {
    frontend: { min: 15, max: 25 },
    backend: { min: 18, max: 30 },
    fullstack: { min: 20, max: 35 },
    devops: { min: 20, max: 35 },
    mobile: { min: 15, max: 28 },
    design: { min: 12, max: 22 },
    data: { min: 15, max: 25 },
    product: { min: 18, max: 30 },
    qa: { min: 12, max: 20 }
  },
  mid: {
    frontend: { min: 25, max: 40 },
    backend: { min: 28, max: 45 },
    fullstack: { min: 30, max: 50 },
    devops: { min: 30, max: 50 },
    mobile: { min: 25, max: 42 },
    design: { min: 20, max: 35 },
    data: { min: 22, max: 38 },
    product: { min: 25, max: 45 },
    qa: { min: 18, max: 30 }
  },
  senior: {
    frontend: { min: 35, max: 60 },
    backend: { min: 40, max: 70 },
    fullstack: { min: 45, max: 75 },
    devops: { min: 45, max: 75 },
    mobile: { min: 35, max: 65 },
    design: { min: 30, max: 55 },
    data: { min: 35, max: 60 },
    product: { min: 35, max: 65 },
    qa: { min: 25, max: 45 }
  }
}

// ============================================================================
// EDUCATION PATTERNS - Thực tế VN
// ============================================================================

export const EDUCATION_PATTERNS = [
  {
    school: 'Đại học Quốc gia Hà Nội',
    degrees: ['Cử nhân', 'Kỹ sư', 'Thạc sĩ'],
    fields: ['Công nghệ Thông tin', 'Khoa học Máy tính', 'Kỹ thuật Phần mềm', 'Hệ thống Thông tin'],
    weight: 15
  },
  {
    school: 'Đại học Bách khoa Hà Nội',
    degrees: ['Cử nhân', 'Kỹ sư', 'Thạc sĩ'],
    fields: ['Công nghệ Thông tin', 'Kỹ thuật Phần mềm', 'Kỹ thuật Máy tính'],
    weight: 12
  },
  {
    school: 'Đại học FPT',
    degrees: ['Cử nhân', 'Kỹ sư'],
    fields: ['Công nghệ Thông tin', 'Kỹ thuật Phần mềm', 'Thiết kế Đồ họa'],
    weight: 10
  },
  {
    school: 'Đại học Công nghệ Thông tin TP.HCM',
    degrees: ['Cử nhân', 'Kỹ sư'],
    fields: ['Công nghệ Thông tin', 'Khoa học Máy tính', 'Công nghệ Phần mềm'],
    weight: 8
  },
  {
    school: 'Đại học Khoa học Tự nhiên',
    degrees: ['Cử nhân', 'Thạc sĩ'],
    fields: ['Toán tin', 'Công nghệ Thông tin', 'Khoa học Máy tính'],
    weight: 7
  },
  {
    school: 'Học viện Công nghệ Bưu chính Viễn thông',
    degrees: ['Cử nhân', 'Kỹ sư'],
    fields: ['Công nghệ Thông tin', 'Kỹ thuật Phần mềm', 'An toàn Thông tin'],
    weight: 6
  }
]
