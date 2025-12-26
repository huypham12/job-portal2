// src/app.ts
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { envConfig } from './config/getEnvConfig'
import {
  authRouter,
  userRouter,
  resumeRouter,
  jobRouter,
  skillRouter,
  savedJobRouter,
  applicationRouter,
  connectionInterestRouter,
  locationRouter
} from './api'
import { errorHandler } from './middleware/error-handler.middleware'
import adminRouter from './api/admin/admin.route'
import { companyRouter } from './api/companies/company.route'
import { uploadRouter } from './api/uploads/upload.route'
import notificationRouter from './api/notifications/notifications.routes'
import searchRouter from './api/searches/search.route'
import matchingRouter from './api/matching/matching.routes'
import { socketService } from './socket/socket.service'
import { initializeCronjobs } from './jobs'
// import { elasticsearchService } from './config/elasticsearch.service'
import YAML from 'yaml'
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'
import SwaggerParser from '@apidevtools/swagger-parser'

let server: any

const main = async () => {
  const app = express()
  const PORT = envConfig.app.port || 4000

  try {
    // Load Swagger documentation from bundled file
    let swaggerDocument: any
    try {
      swaggerDocument = YAML.parse(fs.readFileSync('./swagger/bundled-openapi.yaml', 'utf8'))
      console.log('✅ Successfully loaded bundled Swagger documentation')
    } catch (bundleError) {
      console.warn(
        'Warning: failed to load ./swagger/bundled-openapi.yaml — falling back to ./swagger.yaml',
        bundleError
      )
      // Fallback: parse existing top-level swagger.yaml
      swaggerDocument = YAML.parse(fs.readFileSync('./swagger.yaml', 'utf8'))
    }
    const swaggerOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Job Portal API Documentation',
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: -1,
        filter: true,
        showExtensions: true
      }
    }
    const swaggerUiOptions = {
      explorer: true,
      swaggerOptions: swaggerOptions.swaggerOptions
    }

    // Cấu hình CORS
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      ...(envConfig.cors.origin || [])
    ].filter(Boolean)

    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200 // For legacy browser support
    }

    app.use(cors(corsOptions))

    // Security middleware
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP for API
        crossOriginEmbedderPolicy: false
      })
    )

    // Compression middleware
    app.use(compression())

    // Logging middleware
    if (process.env.NODE_ENV === 'production') {
      app.use(morgan('combined'))
    } else {
      app.use(morgan('dev'))
    }

    // Trust proxy for production (behind load balancer/reverse proxy)
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1)
    }

    // Body parser with limits
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // Serve static files
    app.use(
      '/uploads',
      express.static('uploads', {
        maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
        etag: true,
        lastModified: true
      })
    )

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
    app.use('/api/locations', locationRouter)
    app.use('/api/search', searchRouter)
    app.use('/api/matching', matchingRouter)

    // Health check endpoint
    app.get('/api/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      })
    })

    app.use(errorHandler)

    // Chỉ enable Swagger trong development hoặc khi được config
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions, swaggerUiOptions))
    }

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

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`)
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`)
      console.log(`🔌 WebSocket server is ready for connections`)

      if (process.env.NODE_ENV === 'production') {
        console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ')}`)
      }
    })
  } catch (error) {
    console.error('Error connecting to the database:', error)
    process.exit(1) // thoát app, không chạy nữa
  }
}

main()

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  if (server) {
    server.close(() => {
      console.log('Process terminated')
      process.exit(0)
    })
  }
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  if (server) {
    server.close(() => {
      console.log('Process terminated')
      process.exit(0)
    })
  }
})

// Error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})
