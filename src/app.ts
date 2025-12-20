// src/app.ts
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { envConfig } from './config/getEnvConfig'
import { authRouter, userRouter, connectionInterestRouter, notificationRouter } from './api'
import { errorHandler } from './shared/middleware/error-handler.middleware'
import adminRouter from './api/admin/admin.route'
import { companyRouter } from './api/companies/company.route'
import { uploadRouter } from './api/uploads/upload.route'
import applicationRouter from './api/applications/application.route'
import { socketService } from './socket/socket.service'
import YAML from 'yaml'
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'

const main = async () => {
  const app = express()
  const PORT = envConfig.app.port || 4000

  try {
    // Load Swagger documentation
    const swaggerDocument = YAML.parse(fs.readFileSync('./swagger.yaml', 'utf8'))
    const swaggerOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'X API Documentation',
      explorer: true
    }
    const swaggerUiOptions = {
      explorer: true,
      swaggerOptions: {
        docExpansion: 'none',
        defaultModelsExpandDepth: -1
      }
    }

    // Cấu hình CORS
    app.use(
      cors({
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      })
    )

    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use('/api/user', userRouter)
    app.use('/api/admin', adminRouter)
    app.use('/api/companies', companyRouter)
    app.use('/api/uploads', uploadRouter)
    app.use('/api/applications', applicationRouter)
    app.use('/api/connection-interests', connectionInterestRouter)
    app.use('/api/notifications', notificationRouter)
    app.use(errorHandler)

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions, swaggerUiOptions))

    // Create HTTP server for Socket.IO
    const httpServer = createServer(app)

    // Initialize Socket.IO
    socketService.initialize(httpServer)

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
      console.log(`Socket.IO server initialized`)
    })
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1) // thoát app, không chạy nữa
  }
}

main()
