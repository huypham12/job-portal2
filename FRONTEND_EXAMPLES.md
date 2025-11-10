# Ví dụ code cho cấu trúc Frontend

## 1. API Client Setup

### `src/api/client.ts`
```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { TokenPayload } from '@/types/auth.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor - Thêm access token vào header
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        // Gọi API refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refresh_token: refreshToken,
        })

        const { access_token, refresh_token: newRefreshToken } = response.data.data

        // Lưu tokens mới
        localStorage.setItem('access_token', access_token)
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken)
        }

        // Retry request với token mới
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return client(originalRequest)
      } catch (refreshError) {
        // Refresh token failed - logout user
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default client
```

### `src/api/auth.api.ts`
```typescript
import { client } from './client'
import type {
  RegisterBodyDto,
  RegisterResponseDto,
  LoginBodyDto,
  LoginResponseDto,
  LogoutBodyDto,
  RefreshTokenBodyDto,
  RefreshTokenResponseDto,
  VerifyEmailBodyDto,
  ResetPasswordBodyDto,
  ChangePasswordBodyDto,
} from '@/types/api.types'

export const authApi = {
  register: (data: RegisterBodyDto) =>
    client.post<RegisterResponseDto>('/auth/register', data),

  login: (data: LoginBodyDto) =>
    client.post<LoginResponseDto>('/auth/login', data),

  logout: (data: LogoutBodyDto) =>
    client.post('/auth/logout', data),

  refreshToken: (data: RefreshTokenBodyDto) =>
    client.post<RefreshTokenResponseDto>('/auth/refresh-token', data),

  resendVerifyEmail: (email: string) =>
    client.post('/auth/resend-verify-email', { email }),

  verifyEmail: (data: VerifyEmailBodyDto) =>
    client.post('/auth/verify-email', data),

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),

  verifyForgotPasswordToken: (token: string) =>
    client.post('/auth/verify-forgot-password', { token }),

  resetPassword: (data: ResetPasswordBodyDto) =>
    client.post('/auth/reset-password', data),

  changePassword: (data: ChangePasswordBodyDto) =>
    client.patch('/auth/change-password', data),
}
```

### `src/api/user.api.ts`
```typescript
import { client } from './client'
import type { UpdateProfileBodyDto, UserProfileResponse } from '@/types/api.types'

export const userApi = {
  getMe: () => client.get<UserProfileResponse>('/user/me'),

  updateProfile: (data: UpdateProfileBodyDto) =>
    client.put('/user/me/profile', data),
}
```

## 2. Types - Đồng bộ với Backend DTOs

### `src/types/api.types.ts`
```typescript
// Từ backend: src/api/auth/dto/register.dto.ts
export interface RegisterBodyDto {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
  role: 'candidate' | 'recruiter' | 'admin'
}

export interface RegisterResponseData {
  access_token: string
  refresh_token: string
}

export interface RegisterResponseDto {
  statusCode: number
  message: string
  data: RegisterResponseData
}

// Từ backend: src/api/auth/dto/login.dto.ts
export interface LoginBodyDto {
  email: string
  password: string
}

export interface LoginResponseData {
  access_token: string
  refresh_token: string
  user: UserDto
}

export interface LoginResponseDto {
  statusCode: number
  message: string
  data: LoginResponseData
}

// Từ backend: src/api/user/user.dto.ts
export interface UpdateProfileBodyDto {
  name?: string
  phone?: string
  location_id?: string | null
  metadata?: Record<string, any>
}

export interface UserDto {
  id: string
  email: string
  role: 'candidate' | 'recruiter' | 'admin'
  verified: boolean
  profile?: {
    id: string
    name?: string
    phone?: string
    location_id?: string
    metadata?: Record<string, any>
  }
}

export interface UserProfileResponse {
  statusCode: number
  message: string
  data: UserDto
}

// Common types
export interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### `src/types/auth.types.ts`
```typescript
import type { UserDto } from './api.types'

export interface TokenPayload {
  user_id: string
  token_type: 'access' | 'refresh' | 'email_verify' | 'forgot_password'
  verify: 0 | 1 | 2 // Unverified | Verified | Banned
  role: 'candidate' | 'recruiter' | 'admin'
  exp?: number
}

export interface AuthState {
  user: UserDto | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
```

## 3. Context - Auth Context

### `src/contexts/AuthContext.tsx`
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserDto } from '@/types/api.types'
import { authApi } from '@/api/auth.api'
import { userApi } from '@/api/user.api'

interface AuthContextType {
  user: UserDto | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token')
      if (accessToken) {
        try {
          const response = await userApi.getMe()
          setUser(response.data.data)
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password })
    const { access_token, refresh_token, user: userData } = response.data.data

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(userData)
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await authApi.logout({ refresh_token: refreshToken })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const response = await userApi.getMe()
      setUser(response.data.data)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
```

## 4. Feature: Auth - Hooks

### `src/features/auth/hooks/useAuth.ts`
```typescript
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthContext } from '@/contexts/AuthContext'
import type { LoginBodyDto, RegisterBodyDto } from '@/types/api.types'

export const useAuth = () => {
  const { user, isAuthenticated, login: contextLogin, logout: contextLogout } = useAuthContext()

  const loginMutation = useMutation({
    mutationFn: (data: LoginBodyDto) => authApi.login(data),
    onSuccess: async (response) => {
      const { access_token, refresh_token, user: userData } = response.data.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      await contextLogin(userData.email, '') // Update context
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterBodyDto) => authApi.register(data),
    onSuccess: async (response) => {
      const { access_token, refresh_token } = response.data.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      // Fetch user data
      await contextLogin('', '')
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token')
      return authApi.logout({ refresh_token: refreshToken })
    },
    onSuccess: () => {
      contextLogout()
    },
  })

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  }
}
```

### `src/features/auth/hooks/useLogin.ts`
```typescript
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthContext } from '@/contexts/AuthContext'
import type { LoginBodyDto } from '@/types/api.types'

export const useLogin = () => {
  const { login: contextLogin } = useAuthContext()

  return useMutation({
    mutationFn: (data: LoginBodyDto) => authApi.login(data),
    onSuccess: async (response) => {
      const { access_token, refresh_token, user } = response.data.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      // Update context
      await contextLogin(user.email, '')
    },
  })
}
```

## 5. Feature: Auth - Components

### `src/features/auth/components/LoginForm/LoginForm.tsx`
```typescript
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '../../hooks/useLogin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { FormError } from '@/components/forms/FormError'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginForm: React.FC = () => {
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email">
        <Input
          type="email"
          {...register('email')}
          error={!!errors.email}
        />
        <FormError error={errors.email?.message} />
      </FormField>

      <FormField label="Mật khẩu">
        <Input
          type="password"
          {...register('password')}
          error={!!errors.password}
        />
        <FormError error={errors.password?.message} />
      </FormField>

      {loginMutation.error && (
        <FormError error="Email hoặc mật khẩu không đúng" />
      )}

      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full"
      >
        {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
    </form>
  )
}
```

## 6. Routes

### `src/routes/routes.tsx`
```typescript
import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ProfilePage } from '@/features/user/pages/ProfilePage'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { PrivateRoute } from './PrivateRoute'
import { RoleRoute } from './RoleRoute'
import { Layout } from '@/components/layout/Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // Public routes
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      // Protected routes
      {
        path: '/profile',
        element: (
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        ),
      },
      // Admin routes
      {
        path: '/admin',
        element: (
          <RoleRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </RoleRoute>
        ),
      },
    ],
  },
])
```

### `src/routes/PrivateRoute.tsx`
```typescript
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

### `src/routes/RoleRoute.tsx`
```typescript
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles: ('admin' | 'recruiter' | 'candidate')[]
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthContext()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
```

## 7. Utils - Constants & Enums

### `src/utils/constants.ts`
```typescript
// Tương ứng với backend: src/shared/constants/messages.ts
export const MESSAGES = {
  // Auth
  REGISTER_SUCCESS: 'Đăng ký thành công',
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  EMAIL_ALREADY_EXISTS: 'Email đã tồn tại',
  INVALID_PASSWORD: 'Mật khẩu không đúng',
  // ... các messages khác
} as const
```

### `src/utils/enums.ts`
```typescript
// Tương ứng với backend: src/shared/constants/enums/
export enum UserRole {
  Candidate = 'candidate',
  Recruiter = 'recruiter',
  Admin = 'admin',
}

export enum UserVerifyStatus {
  Unverified = 0,
  Verified = 1,
  Banned = 2,
}

export enum JobStatus {
  Draft = 'draft',
  Approved = 'approved',
  Closed = 'closed',
}

export enum ApplicationStatus {
  Pending = 'pending',
  Reviewed = 'reviewed',
  Rejected = 'rejected',
  Accepted = 'accepted',
}
```

## 8. App Setup

### `src/App.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { router } from '@/routes/routes'
import '@/styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
```

### `src/main.tsx`
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## 9. Package.json

```json
{
  "name": "job-portal-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
```

## 10. Vite Config

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

