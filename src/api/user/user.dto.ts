/**
 * DTO cho cập nhật Profile
 * - name: chuỗi đã trim, 1..100 ký tự
 * - phone: theo regex đã kiểm tra ở validator
 * - location_id: UUID | null
 * - metadata: JSON object (key string, value bất kỳ)
 * Tất cả đều là optional; yêu cầu tối thiểu 1 trường (được enforce ở validator).
 */
export interface UpdateProfileBodyDto {
  name?: string
  phone?: string
  location_id?: string | null
  metadata?: Record<string, any>
}
