# Cấu trúc thư mục React Frontend cho Job Portal

## Tổng quan
Cấu trúc này được thiết kế để:
- **Dễ code**: Tổ chức theo feature, dễ tìm và sửa code
- **Dễ bảo trì**: Tách biệt rõ ràng giữa components, logic, và data
- **Scalable**: Dễ mở rộng khi thêm tính năng mới
- **Type-safe**: Sử dụng TypeScript đầy đủ
- **Consistent**: Đồng bộ với cấu trúc backend API

## Cấu trúc thư mục

```
frontend/
├── public/                          # Static files
│   ├── favicon.ico
│   └── ...
│
├── src/
│   ├── api/                         # API clients - tương ứng với backend routes
│   │   ├── auth.api.ts             # /api/auth endpoints
│   │   ├── user.api.ts             # /api/user endpoints
│   │   ├── admin.api.ts            # /api/admin endpoints
│   │   ├── jobs.api.ts             # /api/jobs endpoints
│   │   ├── companies.api.ts        # /api/companies endpoints
│   │   ├── applications.api.ts     # /api/applications endpoints
│   │   ├── resumes.api.ts          # /api/resumes endpoints
│   │   ├── search.api.ts           # /api/searchs endpoints
│   │   ├── uploads.api.ts          # /api/uploads endpoints
│   │   ├── client.ts               # Axios instance với interceptors
│   │   └── types.ts                # API response types
│   │
│   ├── assets/                      # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/                  # Shared/Reusable components
│   │   ├── ui/                     # Base UI components (Button, Input, Card, etc.)
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Select/
│   │   │   ├── Textarea/
│   │   │   ├── Checkbox/
│   │   │   ├── Radio/
│   │   │   └── index.ts            # Export all UI components
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   ├── Sidebar/
│   │   │   ├── Navbar/
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── common/                 # Common business components
│   │   │   ├── LoadingSpinner/
│   │   │   ├── ErrorBoundary/
│   │   │   ├── EmptyState/
│   │   │   ├── Pagination/
│   │   │   ├── SearchBar/
│   │   │   └── ProtectedRoute/
│   │   │
│   │   └── forms/                  # Form components
│   │       ├── FormField/
│   │       ├── FormError/
│   │       └── FormLabel/
│   │
│   ├── features/                    # Feature modules - tương ứng với backend API modules
│   │   ├── auth/                   # Authentication feature
│   │   │   ├── components/         # Feature-specific components
│   │   │   │   ├── LoginForm/
│   │   │   │   ├── RegisterForm/
│   │   │   │   ├── ForgotPasswordForm/
│   │   │   │   ├── ResetPasswordForm/
│   │   │   │   └── VerifyEmail/
│   │   │   │
│   │   │   ├── hooks/              # Feature-specific hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useRegister.ts
│   │   │   │   └── useLogout.ts
│   │   │   │
│   │   │   ├── pages/              # Feature pages
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   ├── ResetPasswordPage.tsx
│   │   │   │   └── VerifyEmailPage.tsx
│   │   │   │
│   │   │   ├── services/           # Feature-specific services (nếu cần)
│   │   │   │   └── auth.service.ts
│   │   │   │
│   │   │   ├── types/              # Feature-specific types
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   └── index.ts            # Export feature
│   │   │
│   │   ├── user/                   # User profile feature
│   │   │   ├── components/
│   │   │   │   ├── ProfileForm/
│   │   │   │   ├── ProfileView/
│   │   │   │   └── ProfileEdit/
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useUser.ts
│   │   │   │   ├── useUpdateProfile.ts
│   │   │   │   └── useUserProfile.ts
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── EditProfilePage.tsx
│   │   │   │
│   │   │   ├── types/
│   │   │   │   └── user.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── admin/                  # Admin feature
│   │   │   ├── components/
│   │   │   │   ├── UserList/
│   │   │   │   ├── UserTable/
│   │   │   │   ├── UserDetail/
│   │   │   │   └── UserActions/
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useAdminUsers.ts
│   │   │   │   ├── useUserManagement.ts
│   │   │   │   └── useAdminDashboard.ts
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── AdminDashboardPage.tsx
│   │   │   │   ├── UserManagementPage.tsx
│   │   │   │   └── UserDetailPage.tsx
│   │   │   │
│   │   │   ├── types/
│   │   │   │   └── admin.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── jobs/                   # Jobs feature
│   │   │   ├── components/
│   │   │   │   ├── JobCard/
│   │   │   │   ├── JobList/
│   │   │   │   ├── JobDetail/
│   │   │   │   ├── JobForm/
│   │   │   │   ├── JobFilters/
│   │   │   │   └── JobSearch/
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useJobDetail.ts
│   │   │   │   ├── useCreateJob.ts
│   │   │   │   ├── useUpdateJob.ts
│   │   │   │   └── useJobFilters.ts
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── JobListPage.tsx
│   │   │   │   ├── JobDetailPage.tsx
│   │   │   │   ├── CreateJobPage.tsx
│   │   │   │   └── EditJobPage.tsx
│   │   │   │
│   │   │   ├── types/
│   │   │   │   └── job.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── companies/              # Companies feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── applications/           # Job applications feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── resumes/                # Resumes feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── search/                 # Search feature
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       ├── types/
│   │       └── index.ts
│   │
│   ├── contexts/                    # React Context providers
│   │   ├── AuthContext.tsx         # Authentication context
│   │   ├── ThemeContext.tsx        # Theme context (nếu cần)
│   │   └── NotificationContext.tsx # Notification context
│   │
│   ├── hooks/                       # Shared/Global hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── useQueryParams.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── lib/                         # Third-party library configs
│   │   ├── axios.ts                # Axios configuration
│   │   ├── react-query.ts          # React Query configuration
│   │   └── utils.ts                # Utility functions
│   │
│   ├── routes/                      # Routing configuration
│   │   ├── routes.tsx              # Route definitions
│   │   ├── PrivateRoute.tsx        # Protected route wrapper
│   │   ├── PublicRoute.tsx         # Public route wrapper
│   │   └── RoleRoute.tsx           # Role-based route wrapper
│   │
│   ├── store/                       # State management (Redux/Zustand/Jotai)
│   │   ├── slices/                 # Redux slices (nếu dùng Redux)
│   │   │   ├── authSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── uiSlice.ts
│   │   │
│   │   ├── store.ts                # Store configuration
│   │   └── hooks.ts                # Typed hooks (nếu dùng Redux)
│   │
│   ├── styles/                      # Global styles
│   │   ├── globals.css
│   │   ├── variables.css           # CSS variables
│   │   └── themes.css              # Theme styles
│   │
│   ├── types/                       # Global TypeScript types
│   │   ├── api.types.ts            # API types (từ backend DTOs)
│   │   ├── auth.types.ts           # Auth types
│   │   ├── user.types.ts           # User types
│   │   ├── common.types.ts         # Common types
│   │   └── index.ts                # Export all types
│   │
│   ├── utils/                       # Utility functions
│   │   ├── constants.ts            # Constants (tương ứng với backend messages.ts)
│   │   ├── enums.ts                # Enums (tương ứng với backend enums)
│   │   ├── validators.ts           # Validation functions
│   │   ├── formatters.ts           # Format functions (date, currency, etc.)
│   │   ├── helpers.ts              # Helper functions
│   │   └── storage.ts              # LocalStorage/SessionStorage helpers
│   │
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # Entry point
│   └── vite-env.d.ts               # Vite type definitions
│
├── .env                            # Environment variables
├── .env.local                      # Local environment variables
├── .env.production                 # Production environment variables
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite configuration
└── README.md
```

## Chi tiết từng phần

### 1. `/src/api/` - API Clients
Tương ứng trực tiếp với backend routes:
- Mỗi file `.api.ts` tương ứng với một route module backend
- Sử dụng Axios instance được config sẵn
- Type-safe với TypeScript

**Ví dụ: `auth.api.ts`**
```typescript
import { client } from './client'
import type { 
  RegisterBodyDto, 
  RegisterResponseDto,
  LoginBodyDto,
  LoginResponseDto 
} from '../types/api.types'

export const authApi = {
  register: (data: RegisterBodyDto) => 
    client.post<RegisterResponseDto>('/auth/register', data),
  
  login: (data: LoginBodyDto) => 
    client.post<LoginResponseDto>('/auth/login', data),
  
  logout: (data: LogoutBodyDto) => 
    client.post('/auth/logout', data),
  
  refreshToken: (data: RefreshTokenBodyDto) => 
    client.post<RefreshTokenResponseDto>('/auth/refresh-token', data),
  
  // ... các endpoints khác
}
```

### 2. `/src/features/` - Feature Modules
Tổ chức theo feature, mỗi feature độc lập:
- **components/**: Components chỉ dùng trong feature này
- **hooks/**: Custom hooks cho feature
- **pages/**: Pages của feature
- **types/**: Types riêng của feature
- **index.ts**: Export để dùng ở nơi khác

**Lợi ích:**
- Dễ tìm code liên quan
- Dễ refactor/move feature
- Dễ test từng feature độc lập
- Dễ chia sẻ code giữa team members

### 3. `/src/components/` - Shared Components
Chia thành 3 loại:
- **ui/**: Base UI components (Button, Input, Card) - có thể tái sử dụng ở bất kỳ đâu
- **layout/**: Layout components (Header, Footer, Sidebar)
- **common/**: Business components (LoadingSpinner, ErrorBoundary)
- **forms/**: Form-related components

### 4. `/src/types/` - TypeScript Types
Đồng bộ với backend DTOs:
- `api.types.ts`: Types từ backend DTOs
- `auth.types.ts`: Auth-related types
- `user.types.ts`: User-related types
- `common.types.ts`: Common types (Response, Pagination, etc.)

### 5. `/src/utils/` - Utilities
Tương ứng với backend:
- `constants.ts`: Messages, constants (từ `messages.ts` backend)
- `enums.ts`: Enums (từ `enums/` backend)
- `validators.ts`: Client-side validation
- `formatters.ts`: Format data (date, currency, etc.)

### 6. `/src/routes/` - Routing
- `routes.tsx`: Định nghĩa tất cả routes
- `PrivateRoute.tsx`: Route cần authentication
- `RoleRoute.tsx`: Route cần role cụ thể (admin, recruiter, candidate)

### 7. `/src/contexts/` - React Context
- `AuthContext.tsx`: Quản lý authentication state
- `ThemeContext.tsx`: Quản lý theme (nếu cần)
- `NotificationContext.tsx`: Quản lý notifications

## Quy tắc đặt tên

### Files
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase với prefix `use` (e.g., `useAuth.ts`)
- **Utils/Helpers**: camelCase (e.g., `formatDate.ts`)
- **Types**: camelCase với suffix `.types.ts` (e.g., `user.types.ts`)
- **API**: camelCase với suffix `.api.ts` (e.g., `auth.api.ts`)

### Folders
- **Features**: lowercase (e.g., `auth/`, `user/`)
- **Components**: lowercase (e.g., `ui/`, `layout/`)
- **Utils/Types**: lowercase (e.g., `utils/`, `types/`)

## Best Practices

### 1. Feature-based Organization
Mỗi feature là một module độc lập, có thể:
- Import từ feature khác: `import { JobCard } from '@/features/jobs'`
- Export qua `index.ts` để dễ import

### 2. Type Safety
- Luôn define types cho API responses
- Sử dụng types từ backend DTOs
- Tránh `any`, dùng `unknown` nếu cần

### 3. API Calls
- Tất cả API calls qua `/src/api/`
- Sử dụng React Query hoặc SWR cho data fetching
- Handle errors ở một nơi (axios interceptor)

### 4. State Management
- Local state: `useState`
- Shared state: Context hoặc Zustand/Redux
- Server state: React Query

### 5. Code Organization
- Mỗi file chỉ làm một việc
- Components nhỏ, dễ test
- Tách logic ra hooks
- Tách constants ra file riêng

## Ví dụ cấu trúc một feature hoàn chỉnh

### Feature: Auth

```
features/auth/
├── components/
│   ├── LoginForm/
│   │   ├── LoginForm.tsx
│   │   └── index.ts
│   └── RegisterForm/
│       ├── RegisterForm.tsx
│       └── index.ts
│
├── hooks/
│   ├── useAuth.ts          # Main auth hook
│   ├── useLogin.ts         # Login logic
│   └── useRegister.ts      # Register logic
│
├── pages/
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
│
├── types/
│   └── auth.types.ts
│
└── index.ts                # Export: components, hooks, pages
```

**Ví dụ `useAuth.ts`:**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthContext } from '@/contexts/AuthContext'

export const useAuth = () => {
  const { user, setUser, logout } = useAuthContext()
  
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.data.user)
      // Store tokens
    }
  })
  
  return {
    user,
    login: loginMutation.mutate,
    logout,
    isAuthenticated: !!user
  }
}
```

## Mapping với Backend

| Backend | Frontend |
|---------|----------|
| `/api/auth` | `/src/api/auth.api.ts` |
| `/api/user` | `/src/api/user.api.ts` |
| `/api/admin` | `/src/api/admin.api.ts` |
| `auth.controller.ts` | `features/auth/hooks/useAuth.ts` |
| `auth.dto.ts` | `types/api.types.ts` (RegisterBodyDto, etc.) |
| `auth.validator.ts` | `utils/validators.ts` |
| `messages.ts` | `utils/constants.ts` |
| `enums/` | `utils/enums.ts` |
| `middleware/` | `routes/PrivateRoute.tsx`, `routes/RoleRoute.tsx` |

## Dependencies đề xuất

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0", // hoặc Redux Toolkit
    "zod": "^3.22.0", // Validation
    "react-hook-form": "^7.48.0", // Form handling
    "@hookform/resolvers": "^3.3.0", // Zod resolver
    "date-fns": "^2.30.0", // Date formatting
    "clsx": "^2.0.0", // Class names utility
    "tailwindcss": "^3.3.0" // hoặc styled-components
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

## Kết luận

Cấu trúc này:
✅ **Dễ code**: Tổ chức rõ ràng, dễ tìm file
✅ **Dễ bảo trì**: Tách biệt concerns, dễ refactor
✅ **Scalable**: Dễ thêm feature mới
✅ **Type-safe**: TypeScript đầy đủ
✅ **Consistent**: Đồng bộ với backend structure
✅ **Modern**: Sử dụng React best practices

