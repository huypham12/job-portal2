// getEnvConfig.ts

import { config } from 'dotenv'
import minimist from 'minimist'

// Parse command-line arguments to determine the environment
const args = minimist(process.argv.slice(2))
export const isProduction = args.env === 'production'

console.log(`[ENV] Loaded environment: ${args.env || 'default'} | isProduction: ${isProduction}`)

// Load environment variables from the corresponding .env file
config({
  path: args.env ? `.env.${args.env}` : '.env'
})

// Interface for the application's configuration structure
interface EnvConfig {
  app: {
    port: number
    host: string
  }
  cors: {
    origin: string[]
  }
  db: {
    host: string
    port: number
    username: string
    password: string
    database: string // Changed from 'name' to 'database' for clarity with PostgreSQL
    schema: string // Added schema, which is 'recruitment' in your SQL file
    tables: {
      users: string
      refreshTokens: string
      userTokens: string
      locations: string
      profiles: string
      companies: string
      skills: string
      tags: string
      jobs: string
      jobPostsHistory: string
      resumes: string
      applications: string
      savedJobs: string
      notifications: string
      audits: string
      reports: string
      payments: string
      rolesPermissions: string
      activityLogs: string
      jobSkills: string
      userSkills: string
      jobTags: string
      userFollows: string
      searchHistory: string
      servicePackages: string
      companySubscriptions: string
    }
  }
  google: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  clientRedirectUri: string
  secrets: {
    password: string
    jwt: {
      access: string
      refresh: string
      emailVerify: string
      forgotPassword: string
    }
  }
  tokenExpires: {
    access: string
    refresh: string
    emailVerify: string
    forgotPassword: string
  }
  aws: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    sesFromAddress: string
    s3BucketName: string
  }
  elasticsearch: {
    node: string
    username?: string
    password?: string
    indexPrefix: string
    enableSecurity: boolean
  }
}

/**
 * Utility function to get an environment variable.
 * Throws an error if a required variable is missing.
 * @param key The environment variable key.
 * @param required Whether the variable is required.
 * @param defaultValue A default value if the variable is not set.
 * @returns The value of the environment variable.
 */
const getEnvVar = (key: string, required = true, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue
  if (!value && required) {
    throw new Error(`[ENV Error] Missing required environment variable: ${key}`)
  }
  return value || ''
}

// Constants for database table environment variable keys
const dbTables = {
  USERS: 'DB_USERS_TABLE',
  REFRESH_TOKENS: 'DB_REFRESH_TOKENS_TABLE',
  USER_TOKENS: 'DB_USER_TOKENS_TABLE',
  LOCATIONS: 'DB_LOCATIONS_TABLE',
  PROFILES: 'DB_PROFILES_TABLE',
  COMPANIES: 'DB_COMPANIES_TABLE',
  SKILLS: 'DB_SKILLS_TABLE',
  TAGS: 'DB_TAGS_TABLE',
  JOBS: 'DB_JOBS_TABLE',
  JOB_POSTS_HISTORY: 'DB_JOB_POSTS_HISTORY_TABLE',
  RESUMES: 'DB_RESUMES_TABLE',
  APPLICATIONS: 'DB_APPLICATIONS_TABLE',
  SAVED_JOBS: 'DB_SAVED_JOBS_TABLE',
  NOTIFICATIONS: 'DB_NOTIFICATIONS_TABLE',
  AUDITS: 'DB_AUDITS_TABLE',
  REPORTS: 'DB_REPORTS_TABLE',
  PAYMENTS: 'DB_PAYMENTS_TABLE',
  ROLES_PERMISSIONS: 'DB_ROLES_PERMISSIONS_TABLE',
  ACTIVITY_LOGS: 'DB_ACTIVITY_LOGS_TABLE',
  JOB_SKILLS: 'DB_JOB_SKILLS_TABLE',
  USER_SKILLS: 'DB_USER_SKILLS_TABLE',
  JOB_TAGS: 'DB_JOB_TAGS_TABLE',
  USER_FOLLOWS: 'DB_USER_FOLLOWS_TABLE',
  SEARCH_HISTORY: 'DB_SEARCH_HISTORY_TABLE',
  SERVICE_PACKAGES: 'DB_SERVICE_PACKAGES_TABLE',
  COMPANY_SUBSCRIPTIONS: 'DB_COMPANY_SUBSCRIPTIONS_TABLE'
}

// Export the main configuration object
export const envConfig: EnvConfig = {
  app: {
    port: parseInt(getEnvVar('PORT', true, '4000')),
    host: getEnvVar('HOST', true, 'http://localhost:4000')
  },
  cors: {
    origin: getEnvVar('CORS_ORIGIN', false, 'http://localhost:3000,http://localhost:5173').split(',')
  },
  db: {
    host: getEnvVar('DB_HOST', true, 'localhost'),
    port: parseInt(getEnvVar('DB_PORT', true, '5432')),
    username: getEnvVar('DB_USERNAME', true),
    password: getEnvVar('DB_PASSWORD', true),
    database: getEnvVar('DB_DATABASE', true),
    schema: getEnvVar('DB_SCHEMA', false, 'recruitment'),
    tables: {
      users: getEnvVar(dbTables.USERS, false, 'users'),
      refreshTokens: getEnvVar(dbTables.REFRESH_TOKENS, false, 'refresh_tokens'),
      userTokens: getEnvVar(dbTables.USER_TOKENS, false, 'user_tokens'),
      locations: getEnvVar(dbTables.LOCATIONS, false, 'locations'),
      profiles: getEnvVar(dbTables.PROFILES, false, 'profiles'),
      companies: getEnvVar(dbTables.COMPANIES, false, 'companies'),
      skills: getEnvVar(dbTables.SKILLS, false, 'skills'),
      tags: getEnvVar(dbTables.TAGS, false, 'tags'),
      jobs: getEnvVar(dbTables.JOBS, false, 'jobs'),
      jobPostsHistory: getEnvVar(dbTables.JOB_POSTS_HISTORY, false, 'job_posts_history'),
      resumes: getEnvVar(dbTables.RESUMES, false, 'resumes'),
      applications: getEnvVar(dbTables.APPLICATIONS, false, 'applications'),
      savedJobs: getEnvVar(dbTables.SAVED_JOBS, false, 'saved_jobs'),
      notifications: getEnvVar(dbTables.NOTIFICATIONS, false, 'notifications'),
      audits: getEnvVar(dbTables.AUDITS, false, 'audits'),
      reports: getEnvVar(dbTables.REPORTS, false, 'reports'),
      payments: getEnvVar(dbTables.PAYMENTS, false, 'payments'),
      rolesPermissions: getEnvVar(dbTables.ROLES_PERMISSIONS, false, 'roles_permissions'),
      activityLogs: getEnvVar(dbTables.ACTIVITY_LOGS, false, 'activity_logs'),
      jobSkills: getEnvVar(dbTables.JOB_SKILLS, false, 'job_skills'),
      userSkills: getEnvVar(dbTables.USER_SKILLS, false, 'user_skills'),
      jobTags: getEnvVar(dbTables.JOB_TAGS, false, 'job_tags'),
      userFollows: getEnvVar(dbTables.USER_FOLLOWS, false, 'user_follows'),
      searchHistory: getEnvVar(dbTables.SEARCH_HISTORY, false, 'search_history'),
      servicePackages: getEnvVar(dbTables.SERVICE_PACKAGES, false, 'service_packages'),
      companySubscriptions: getEnvVar(dbTables.COMPANY_SUBSCRIPTIONS, false, 'company_subscriptions')
    }
  },
  google: {
    clientId: getEnvVar('GOOGLE_CLIENT_ID', false),
    clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', false),
    redirectUri: getEnvVar('GOOGLE_REDIRECT_URI', false)
  },
  clientRedirectUri: getEnvVar('CLIENT_REDIRECT_URI', false, 'http://localhost:3000/login/oauth'),
  secrets: {
    password: getEnvVar('PASSWORD_SECRET'),
    jwt: {
      access: getEnvVar('JWT_SECRET_ACCESS_TOKEN'),
      refresh: getEnvVar('JWT_SECRET_REFRESH_TOKEN'),
      emailVerify: getEnvVar('JWT_SECRET_EMAIL_VERIFY_TOKEN'),
      forgotPassword: getEnvVar('JWT_SECRET_FORGOT_PASSWORD_TOKEN')
    }
  },
  tokenExpires: {
    access: getEnvVar('ACCESS_TOKEN_EXPIRES_IN', true, '15m'),
    refresh: getEnvVar('REFRESH_TOKEN_EXPIRES_IN', true, '7d'),
    emailVerify: getEnvVar('EMAIL_VERIFY_TOKEN_EXPIRES_IN', true, '1d'),
    forgotPassword: getEnvVar('FORGOT_PASSWORD_TOKEN_EXPIRES_IN', true, '1h')
  },
  aws: {
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID', false),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY', false),
    region: getEnvVar('AWS_REGION', false, 'ap-southeast-1'),
    sesFromAddress: getEnvVar('SES_FROM_ADDRESS', false),
    s3BucketName: (process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'job-portal-uploads').replace(
      /^['"']|['"']$/g,
      ''
    )
  },
  elasticsearch: {
    node: getEnvVar('ELASTICSEARCH_NODE', false, 'http://localhost:9200'),
    username: getEnvVar('ELASTICSEARCH_USERNAME', false),
    password: getEnvVar('ELASTICSEARCH_PASSWORD', false),
    indexPrefix: getEnvVar('ELASTICSEARCH_INDEX_PREFIX', false, 'job_portal'),
    enableSecurity: getEnvVar('ELASTIC_ENABLE_SECURITY', false, 'false').toLowerCase() === 'true'
  }
}

// Self-invoking function to validate critical configurations on application start
;(() => {
  try {
    // Ensure critical environment variables for PostgreSQL and the app are present
    const criticalVars = [
      'PORT',
      'HOST',
      'DB_HOST',
      'DB_PORT',
      'DB_DATABASE',
      'DB_USERNAME',
      'DB_PASSWORD',
      'JWT_SECRET_ACCESS_TOKEN',
      'JWT_SECRET_REFRESH_TOKEN'
    ]
    criticalVars.forEach((key) => getEnvVar(key))
    console.log('[ENV] All critical environment variables loaded successfully.')
  } catch (error) {
    console.error('[ENV] Configuration validation failed:', error)
    process.exit(1) // Exit the process if critical configuration is missing
  }
})()
