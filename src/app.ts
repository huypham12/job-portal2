// src/app.ts
import express from 'express'
import { envConfig } from './config/getEnvConfig'

const main = async () => {
  const app = express()
  const PORT = envConfig.app.port || 4000

  try {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1) // thoát app, không chạy nữa
  }
}

main()
