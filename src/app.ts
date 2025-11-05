// src/app.ts
import express, { Request, Response } from 'express'
import { envConfig } from './config/getEnvConfig'
import { authRouter } from './api'
import { errorHandler } from './shared/middleware/error-handler.middlewares'

const main = async () => {
  const app = express()
  const PORT = envConfig.app.port || 3000

  try {
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use(errorHandler)

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1) // thoát app, không chạy nữa
  }
}

main()
