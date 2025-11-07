import { UserRole } from '../constants/enums'

// Vai trò: Các hàm tiện ích để kiểm tra quyền trong code
export const hasPermission = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole)
}

export const canAccessResource = (userRole: UserRole, resourceOwnerId: string, currentUserId: string): boolean => {
  if (userRole === UserRole.Admin) return true
  return resourceOwnerId === currentUserId
}
