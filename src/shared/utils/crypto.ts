import * as bcrypt from 'bcrypt'

export async function generateHash(data: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(data, saltRounds)
}

export async function compareHash(data: string, hashedData: string): Promise<boolean> {
  return await bcrypt.compare(data, hashedData)
}
