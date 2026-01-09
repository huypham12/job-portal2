/**
 * CV Template Constants
 * Shared between backend (PDF generation) and frontend (preview)
 * Single source of truth for CV templates
 */

export interface ThemeColors {
  primary: string
  secondary: string
  accent?: string
  text: string
  textLight: string
  background: string
}

export type TemplateLayout = 'sidebar' | 'header-top' | 'two-column'

export interface CVTheme {
  id: string
  name: string
  description: string
  layout: TemplateLayout
  colors: ThemeColors
  category: 'professional' | 'creative' | 'modern'
  isAtsFriendly?: boolean
}

export const CV_THEMES: Record<string, CVTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic Professional',
    description: 'ATS-friendly template với layout truyền thống, phù hợp cho corporate jobs',
    layout: 'header-top',
    category: 'professional',
    isAtsFriendly: true,
    colors: {
      primary: '#1e40af',    // Navy blue - professional
      secondary: '#3b82f6',  // Blue
      accent: '#60a5fa',     // Light blue
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  modern: {
    id: 'modern',
    name: 'Modern Impact',
    description: 'Personal branding template với design sáng tạo, phù hợp cho tech/startup',
    layout: 'sidebar',
    category: 'modern',
    isAtsFriendly: false,
    colors: {
      primary: '#7c3aed',    // Purple - creative
      secondary: '#a855f7',  // Light purple
      accent: '#c084fc',     // Lavender
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  }
}

export const getThemeById = (themeId: string): CVTheme => {
  return CV_THEMES[themeId] || CV_THEMES.modern
}

export const getAllThemes = (): CVTheme[] => {
  return Object.values(CV_THEMES)
}

export const getThemesByCategory = (category: CVTheme['category']): CVTheme[] => {
  return Object.values(CV_THEMES).filter((theme) => theme.category === category)
}
