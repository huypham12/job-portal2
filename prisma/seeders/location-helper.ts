/**
 * Location Helper Functions
 * Helper functions để làm việc với bảng locations
 */

import { PrismaClient, LocationType } from '@prisma/client'

export interface ProvinceData {
  id: string
  name: string
  type: LocationType
}

/**
 * Lấy danh sách tất cả provinces từ database
 */
export async function getAllProvinces(prisma: PrismaClient): Promise<ProvinceData[]> {
  try {
    const provinces = await prisma.locations.findMany({
      where: {
        type: LocationType.province
      },
      select: {
        id: true,
        name: true,
        type: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return provinces
  } catch (error) {
    console.error('Error fetching provinces from database:', error)
    return []
  }
}

/**
 * Lấy danh sách tên provinces từ database
 */
export async function getProvinceNames(prisma: PrismaClient): Promise<string[]> {
  const provinces = await getAllProvinces(prisma)
  return provinces.map((p) => p.name)
}

/**
 * Tìm province theo tên
 */
export async function findProvinceByName(prisma: PrismaClient, name: string): Promise<ProvinceData | null> {
  try {
    const province = await prisma.locations.findFirst({
      where: {
        type: LocationType.province,
        name: name
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    })

    return province
  } catch (error) {
    console.error('Error finding province by name:', error)
    return null
  }
}

/**
 * Normalize tên province để so sánh
 */
export function normalizeProvinceName(name: string): string {
  if (!name) return ''

  return name
    .toLowerCase()
    .replace(/^(tỉnh|thành phố)\s+/i, '') // Remove prefix
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

/**
 * Map tên province từ data source sang database name
 */
export function mapProvinceName(sourceName: string): string {
  const normalized = normalizeProvinceName(sourceName)

  // Handle common variations
  const mappings: Record<string, string> = {
    'tp.hcm': 'Hồ Chí Minh',
    'tp hcm': 'Hồ Chí Minh',
    'sai gon': 'Hồ Chí Minh',
    'sài gòn': 'Hồ Chí Minh',
    tphcm: 'Hồ Chí Minh',
    'ho chi minh': 'Hồ Chí Minh',
    'ha noi': 'Hà Nội',
    hanoi: 'Hồ Chí Minh',
    'da nang': 'Đà Nẵng',
    'can tho': 'Cần Thơ',
    'hai phong': 'Hải Phòng'
  }

  return mappings[normalized] || sourceName
}
