/**
 * CV Template Constants
 * Shared between backend (PDF generation) and frontend (preview)
 * Single source of truth for CV templates
 */

export interface ThemeColors {
  primary: string
  secondary: string
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
}

export const CV_THEMES: Record<string, CVTheme> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Sidebar layout với gradient background, phù hợp cho tech và startup',
    layout: 'sidebar',
    category: 'modern',
    colors: {
      primary: '#1e293b',
      secondary: '#334155',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Header trên cùng với layout truyền thống, phù hợp cho corporate',
    layout: 'header-top',
    category: 'professional',
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Layout 2 cột đều nhau với thiết kế sáng tạo, phù hợp cho designer',
    layout: 'two-column',
    category: 'creative',
    colors: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
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
