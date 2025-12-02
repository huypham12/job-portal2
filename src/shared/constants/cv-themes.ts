/**
 * CV Theme Constants
 * Shared between backend (PDF generation) and frontend (preview)
 * Single source of truth for theme colors
 */

export interface ThemeColors {
  primary: string
  secondary: string
  text: string
  textLight: string
  background: string
}

export interface CVTheme {
  id: string
  name: string
  description: string
  colors: ThemeColors
  category: 'professional' | 'creative' | 'modern' | 'elegant'
}

export const CV_THEMES: Record<string, CVTheme> = {
  default: {
    id: 'default',
    name: 'Default Blue',
    description: 'Classic blue theme suitable for most industries',
    category: 'professional',
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional Dark',
    description: 'Sophisticated dark theme for executive positions',
    category: 'professional',
    colors: {
      primary: '#1e293b',
      secondary: '#334155',
      text: '#0f172a',
      textLight: '#475569',
      background: '#ffffff'
    }
  },
  creative: {
    id: 'creative',
    name: 'Creative Purple',
    description: 'Bold purple theme for creative industries',
    category: 'creative',
    colors: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  modern: {
    id: 'modern',
    name: 'Modern Teal',
    description: 'Fresh teal theme for tech and startups',
    category: 'modern',
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant Green',
    description: 'Refined green theme for business professionals',
    category: 'elegant',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue',
    description: 'Deep blue theme for corporate environments',
    category: 'professional',
    colors: {
      primary: '#1e40af',
      secondary: '#1e3a8a',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Vibrant purple theme for designers and artists',
    category: 'creative',
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  green: {
    id: 'green',
    name: 'Nature Green',
    description: 'Natural green theme for sustainability roles',
    category: 'elegant',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  orange: {
    id: 'orange',
    name: 'Energetic Orange',
    description: 'Dynamic orange theme for sales and marketing',
    category: 'creative',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  },
  red: {
    id: 'red',
    name: 'Bold Red',
    description: 'Strong red theme for leadership positions',
    category: 'modern',
    colors: {
      primary: '#ef4444',
      secondary: '#dc2626',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff'
    }
  }
}

export const getThemeById = (themeId: string): CVTheme => {
  return CV_THEMES[themeId] || CV_THEMES.default
}

export const getAllThemes = (): CVTheme[] => {
  return Object.values(CV_THEMES)
}

export const getThemesByCategory = (category: CVTheme['category']): CVTheme[] => {
  return Object.values(CV_THEMES).filter((theme) => theme.category === category)
}
