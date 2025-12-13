// src/app.ts
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { envConfig } from './config/getEnvConfig'
import {
  authRouter,
  userRouter,
  resumeRouter,
  jobRouter,
  skillRouter,
  savedJobRouter,
  applicationRouter,
  connectionInterestRouter
} from './api'
import { errorHandler } from './shared/middleware/error-handler.middleware'
import adminRouter from './api/admin/admin.route'
import { companyRouter } from './api/companies/company.route'
import { uploadRouter } from './api/uploads/upload.route'
import notificationRouter from './api/notifications/notifications.routes'
import { socketService } from './socket/socket.service'
import { initializeCronjobs } from './jobs'
// import { elasticsearchService } from './config/elasticsearch.service'
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
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      envConfig.app.host?.replace(/\/$/, ''),
      ...(envConfig.cors?.origin || [])
    ].filter(Boolean)

    // CORS configuration with dynamic origin checking
    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
          if (!origin) {
            return callback(null, true)
          }

          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            return callback(null, true)
          }

          // In development, allow any localhost origin
          if (process.env.NODE_ENV !== 'production') {
            if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
              return callback(null, true)
            }
          }

          // Reject other origins
          callback(new Error('Not allowed by CORS'))
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        preflightContinue: false,
        optionsSuccessStatus: 204
      })
    )

    app.use(express.json())

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      })
    })

    // Root endpoint
    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Job Portal API',
        version: '1.0.0',
        docs: '/api-docs'
      })
    })

    app.use('/api/auth', authRouter)
    app.use('/api/user', userRouter)
    app.use('/api/admin', adminRouter)
    app.use('/api/companies', companyRouter)
    app.use('/api/jobs', jobRouter)
    app.use('/api/uploads', uploadRouter)
    app.use('/api/resumes', resumeRouter)
    app.use('/api/skills', skillRouter)
    app.use('/api/saved-jobs', savedJobRouter)
    app.use('/api/applications', applicationRouter)
    app.use('/api/connection-interests', connectionInterestRouter)
    app.use('/api/notifications', notificationRouter)
    app.use(errorHandler)

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions, swaggerUiOptions))

    // Khởi tạo Elasticsearch
    // console.log('Initializing Elasticsearch...')
    // // await elasticsearchService.checkConnection()
    // // await elasticsearchService.initializeIndices()
    // console.log('Elasticsearch initialized successfully')

    // Create HTTP server
    const server = createServer(app)

    // Initialize Socket.IO
    socketService.initialize(server)

    // Initialize cronjobs
    initializeCronjobs()

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
      console.log(`WebSocket server is ready for connections`)
    })
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1) // thoát app, không chạy nữa
  }
}

main()
