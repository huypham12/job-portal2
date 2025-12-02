/**
 * Resume Content Structure
 * All CV data including layout settings, template configuration, and sections
 */

// === Template & Styling ===
export interface TemplateConfig {
  id: string // "modern", "classic", "minimal", "creative"
  colorScheme: string // "#3B82F6"
  fontFamily: string // "Inter", "Roboto", "Times New Roman"
}

// === Layout Configuration ===
export interface LayoutConfig {
  type: 'single-column' | 'two-column' | 'sidebar'
  columnRatio?: [number, number] // [30, 70] for two-column

  // Column assignments (for two-column/sidebar)
  leftColumnSections?: string[]
  rightColumnSections?: string[]

  // Typography
  fontSize: {
    name: number // 24-32pt
    heading: number // 16-20pt
    subheading: number // 12-16pt
    body: number // 10-12pt
  }

  // Spacing
  spacing: {
    sectionGap: number // 16-32px
    itemGap: number // 8-16px
    lineHeight: number // 1.4-1.8
  }

  // Margins
  margins: {
    top: number // 10-30mm
    right: number
    bottom: number
    left: number
  }

  // Avatar
  avatarSize?: number // 80-150px
  avatarPosition?: 'left' | 'center' | 'right'
}

// === Personal Info Section ===
export interface PersonalInfoSection {
  fullName: string
  email: string
  phone?: string
  location?: string
  headline?: string
  avatar?: string
  linkedin?: string
  github?: string
  website?: string

  showAvatar: boolean
  showSocialLinks: boolean
}

// === Summary Section ===
export interface SummarySection {
  enabled: boolean
  content: string
}

// === Work Experience Section ===
export interface ExperienceItem {
  id: string
  companyName: string
  position: string
  startDate: string // "YYYY-MM"
  endDate?: string // null = "Present"
  isCurrent: boolean
  description?: string
  displayOrder: number
  isVisible: boolean
}

export interface ExperiencesSection {
  enabled: boolean
  title?: string // Custom section title (default: "Work Experience")
  items: ExperienceItem[]
}

// === Education Section ===
export interface EducationItem {
  id: string
  schoolName: string
  degree?: string
  fieldOfStudy?: string
  startDate: string
  endDate?: string
  displayOrder: number
  isVisible: boolean
}

export interface EducationsSection {
  enabled: boolean
  title?: string
  items: EducationItem[]
}

// === Skills Section ===
export interface SkillItem {
  id: string
  name: string
  category?: string
  level?: string
  proficiency?: number
  displayOrder: number
  isVisible: boolean
}

export interface SkillsSection {
  enabled: boolean
  title?: string
  groupBy: 'category' | 'level' | 'none'
  items: SkillItem[]
}

// === Certifications Section ===
export interface CertificationItem {
  id: string
  name: string
  issuingOrg: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
  displayOrder: number
  isVisible: boolean
}

export interface CertificationsSection {
  enabled: boolean
  title?: string
  items: CertificationItem[]
}

// === Awards Section ===
export interface AwardItem {
  id: string
  title: string
  issuer: string
  date: string
  description?: string
  displayOrder: number
  isVisible: boolean
}

export interface AwardsSection {
  enabled: boolean
  title?: string
  items: AwardItem[]
}

// === Main Resume Content Interface ===
export interface ResumeContent {
  // Template & Styling
  template: TemplateConfig

  // Layout Configuration
  layout: LayoutConfig

  // Personal Info (Always visible)
  personalInfo: PersonalInfoSection

  // Optional Sections
  summary?: SummarySection
  experiences?: ExperiencesSection
  educations?: EducationsSection
  skills?: SkillsSection
  certifications?: CertificationsSection
  awards?: AwardsSection

  // Section Order (Drag & Drop result)
  sectionOrder: string[]
}

// === Layout Presets ===
export const LAYOUT_PRESETS: Record<string, LayoutConfig> = {
  'single-column-compact': {
    type: 'single-column',
    fontSize: {
      name: 28,
      heading: 16,
      subheading: 14,
      body: 10
    },
    spacing: {
      sectionGap: 16,
      itemGap: 8,
      lineHeight: 1.4
    },
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    avatarSize: 80
  },

  'single-column-spacious': {
    type: 'single-column',
    fontSize: {
      name: 32,
      heading: 20,
      subheading: 16,
      body: 12
    },
    spacing: {
      sectionGap: 32,
      itemGap: 16,
      lineHeight: 1.8
    },
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
    avatarSize: 120
  },

  'two-column-equal': {
    type: 'two-column',
    columnRatio: [50, 50],
    leftColumnSections: ['skills', 'certifications'],
    rightColumnSections: ['experiences', 'educations'],
    fontSize: {
      name: 30,
      heading: 18,
      subheading: 14,
      body: 11
    },
    spacing: {
      sectionGap: 20,
      itemGap: 10,
      lineHeight: 1.5
    },
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  },

  'sidebar-left': {
    type: 'sidebar',
    columnRatio: [30, 70],
    leftColumnSections: ['personalInfo', 'skills', 'certifications'],
    rightColumnSections: ['summary', 'experiences', 'educations'],
    fontSize: {
      name: 24,
      heading: 16,
      subheading: 13,
      body: 10
    },
    spacing: {
      sectionGap: 24,
      itemGap: 12,
      lineHeight: 1.6
    },
    margins: { top: 0, right: 20, bottom: 20, left: 0 },
    avatarSize: 100
  }
}

// === Template Configurations ===
export enum ResumeTemplate {
  MODERN = 'modern',
  CLASSIC = 'classic',
  MINIMAL = 'minimal',
  CREATIVE = 'creative'
}

export interface TemplateDefinition {
  id: ResumeTemplate
  name: string
  description: string
  thumbnail: string
  defaultSettings: {
    colorScheme: string
    fontFamily: string
    layout: LayoutConfig
  }
}

export const RESUME_TEMPLATES: Record<ResumeTemplate, TemplateDefinition> = {
  [ResumeTemplate.MODERN]: {
    id: ResumeTemplate.MODERN,
    name: 'Modern',
    description: 'Clean and professional design',
    thumbnail: '/templates/modern.png',
    defaultSettings: {
      colorScheme: '#3B82F6',
      fontFamily: 'Inter',
      layout: LAYOUT_PRESETS['single-column-spacious']
    }
  },
  [ResumeTemplate.CLASSIC]: {
    id: ResumeTemplate.CLASSIC,
    name: 'Classic',
    description: 'Traditional and formal',
    thumbnail: '/templates/classic.png',
    defaultSettings: {
      colorScheme: '#1F2937',
      fontFamily: 'Times New Roman',
      layout: LAYOUT_PRESETS['single-column-compact']
    }
  },
  [ResumeTemplate.MINIMAL]: {
    id: ResumeTemplate.MINIMAL,
    name: 'Minimal',
    description: 'Simple and elegant',
    thumbnail: '/templates/minimal.png',
    defaultSettings: {
      colorScheme: '#000000',
      fontFamily: 'Helvetica',
      layout: LAYOUT_PRESETS['single-column-spacious']
    }
  },
  [ResumeTemplate.CREATIVE]: {
    id: ResumeTemplate.CREATIVE,
    name: 'Creative',
    description: 'Unique and eye-catching',
    thumbnail: '/templates/creative.png',
    defaultSettings: {
      colorScheme: '#8B5CF6',
      fontFamily: 'Inter',
      layout: LAYOUT_PRESETS['two-column-equal']
    }
  }
}

// === File Constraints ===
export const RESUME_FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_MIME_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf']
}

// === Helper Functions ===
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getTemplate(templateId: string): TemplateDefinition {
  const template = RESUME_TEMPLATES[templateId as ResumeTemplate]
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }
  return template
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(RESUME_TEMPLATES)
}
