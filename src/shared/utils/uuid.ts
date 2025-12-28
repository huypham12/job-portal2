/**
 * UUID validation utilities
 */

/**
 * Validates if a string is a valid UUID v4 format
 * @param value - The value to validate
 * @returns true if valid UUID, false otherwise
 */
export const isValidUUID = (value: any): value is string => {
  if (typeof value !== 'string') return false

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Validates UUID and throws HttpError if invalid
 * @param value - The value to validate
 * @param fieldName - Name of the field for error message
 * @throws HttpError if UUID is invalid
 */
export const validateUUID = (value: any, fieldName: string = 'ID'): string => {
  if (!isValidUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID`)
  }
  return value
}
