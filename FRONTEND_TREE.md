# Cấu trúc cây thư mục Frontend - Job Portal

```
frontend/
│
├── 📁 public/                          # Static files
│   ├── favicon.ico
│   └── assets/
│
├── 📁 src/
│   │
│   ├── 📁 api/                         # 🔌 API Clients (tương ứng backend routes)
│   │   ├── auth.api.ts                # → /api/auth
│   │   ├── user.api.ts                # → /api/user
│   │   ├── admin.api.ts               # → /api/admin
│   │   ├── jobs.api.ts                # → /api/jobs
│   │   ├── companies.api.ts           # → /api/companies
│   │   ├── applications.api.ts        # → /api/applications
│   │   ├── resumes.api.ts             # → /api/resumes
│   │   ├── search.api.ts              # → /api/searchs
│   │   ├── uploads.api.ts             # → /api/uploads
│   │   ├── client.ts                  # Axios instance + interceptors
│   │   └── types.ts                   # API response types
│   │
│   ├── 📁 assets/                      # 🖼️ Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── 📁 components/                  # 🧩 Shared Components
│   │   │
│   │   ├── 📁 ui/                      # Base UI Components (reusable)
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   │   ├── Input.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Select/
│   │   │   ├── Textarea/
│   │   │   ├── Checkbox/
│   │   │   ├── Radio/
│   │   │   └── index.ts               # Export all
│   │   │
│   │   ├── 📁 layout/                  # Layout Components
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Footer/
│   │   │   ├── Sidebar/
│   │   │   ├── Navbar/
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── 📁 common/                  # Common Business Components
│   │   │   ├── LoadingSpinner/
│   │   │   ├── ErrorBoundary/
│   │   │   ├── EmptyState/
│   │   │   ├── Pagination/
│   │   │   ├── SearchBar/
│   │   │   └── ProtectedRoute/
│   │   │
│   │   └── 📁 forms/                   # Form Components
│   │       ├── FormField/
│   │       ├── FormError/
│   │       └── FormLabel/
│   │
│   ├── 📁 features/                    # 🎯 Feature Modules (tương ứng backend modules)
│   │   │
│   │   ├── 📁 auth/                    # Authentication Feature
│   │   │   ├── 📁 components/
│   │   │   │   ├── LoginForm/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── RegisterForm/
│   │   │   │   ├── ForgotPasswordForm/
│   │   │   │   ├── ResetPasswordForm/
│   │   │   │   └── VerifyEmail/
│   │   │   │
│   │   │   ├── 📁 hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useRegister.ts
│   │   │   │   └── useLogout.ts
│   │   │   │
│   │   │   ├── 📁 pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   ├── ResetPasswordPage.tsx
│   │   │   │   └── VerifyEmailPage.tsx
│   │   │   │
│   │   │   ├── 📁 types/
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   └── index.ts               # Export feature
│   │   │
│   │   ├── 📁 user/                    # User Profile Feature
│   │   │   ├── 📁 components/
│   │   │   │   ├── ProfileForm/
│   │   │   │   ├── ProfileView/
│   │   │   │   └── ProfileEdit/
│   │   │   │
│   │   │   ├── 📁 hooks/
│   │   │   │   ├── useUser.ts
│   │   │   │   ├── useUpdateProfile.ts
│   │   │   │   └── useUserProfile.ts
│   │   │   │
│   │   │   ├── 📁 pages/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── EditProfilePage.tsx
│   │   │   │
│   │   │   ├── 📁 types/
│   │   │   │   └── user.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 admin/                   # Admin Feature
│   │   │   ├── 📁 components/
│   │   │   │   ├── UserList/
│   │   │   │   ├── UserTable/
│   │   │   │   ├── UserDetail/
│   │   │   │   └── UserActions/
│   │   │   │
│   │   │   ├── 📁 hooks/
│   │   │   │   ├── useAdminUsers.ts
│   │   │   │   ├── useUserManagement.ts
│   │   │   │   └── useAdminDashboard.ts
│   │   │   │
│   │   │   ├── 📁 pages/
│   │   │   │   ├── AdminDashboardPage.tsx
│   │   │   │   ├── UserManagementPage.tsx
│   │   │   │   └── UserDetailPage.tsx
│   │   │   │
│   │   │   ├── 📁 types/
│   │   │   │   └── admin.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 jobs/                    # Jobs Feature
│   │   │   ├── 📁 components/
│   │   │   │   ├── JobCard/
│   │   │   │   ├── JobList/
│   │   │   │   ├── JobDetail/
│   │   │   │   ├── JobForm/
│   │   │   │   ├── JobFilters/
│   │   │   │   └── JobSearch/
│   │   │   │
│   │   │   ├── 📁 hooks/
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useJobDetail.ts
│   │   │   │   ├── useCreateJob.ts
│   │   │   │   ├── useUpdateJob.ts
│   │   │   │   └── useJobFilters.ts
│   │   │   │
│   │   │   ├── 📁 pages/
│   │   │   │   ├── JobListPage.tsx
│   │   │   │   ├── JobDetailPage.tsx
│   │   │   │   ├── CreateJobPage.tsx
│   │   │   │   └── EditJobPage.tsx
│   │   │   │
│   │   │   ├── 📁 types/
│   │   │   │   └── job.types.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 companies/               # Companies Feature
│   │   │   ├── 📁 components/
│   │   │   ├── 📁 hooks/
│   │   │   ├── 📁 pages/
│   │   │   ├── 📁 types/
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 applications/            # Applications Feature
│   │   │   ├── 📁 components/
│   │   │   ├── 📁 hooks/
│   │   │   ├── 📁 pages/
│   │   │   ├── 📁 types/
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 resumes/                 # Resumes Feature
│   │   │   ├── 📁 components/
│   │   │   ├── 📁 hooks/
│   │   │   ├── 📁 pages/
│   │   │   ├── 📁 types/
│   │   │   └── index.ts
│   │   │
│   │   └── 📁 search/                  # Search Feature
│   │       ├── 📁 components/
│   │       ├── 📁 hooks/
│   │       ├── 📁 pages/
│   │       ├── 📁 types/
│   │       └── index.ts
│   │
│   ├── 📁 contexts/                     # 🔄 React Context Providers
│   │   ├── AuthContext.tsx            # Authentication state
│   │   ├── ThemeContext.tsx           # Theme (optional)
│   │   └── NotificationContext.tsx    # Notifications
│   │
│   ├── 📁 hooks/                        # 🪝 Shared/Global Hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── useQueryParams.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── 📁 lib/                          # 📚 Third-party Library Configs
│   │   ├── axios.ts                   # Axios config
│   │   ├── react-query.ts             # React Query config
│   │   └── utils.ts                   # Utility functions
│   │
│   ├── 📁 routes/                       # 🛣️ Routing Configuration
│   │   ├── routes.tsx                 # Route definitions
│   │   ├── PrivateRoute.tsx           # Protected routes
│   │   ├── PublicRoute.tsx            # Public routes
│   │   └── RoleRoute.tsx              # Role-based routes
│   │
│   ├── 📁 store/                        # 🗄️ State Management (optional)
│   │   ├── 📁 slices/                 # Redux slices (nếu dùng Redux)
│   │   │   ├── authSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── uiSlice.ts
│   │   │
│   │   ├── store.ts                   # Store config
│   │   └── hooks.ts                   # Typed hooks
│   │
│   ├── 📁 styles/                       # 🎨 Global Styles
│   │   ├── globals.css
│   │   ├── variables.css              # CSS variables
│   │   └── themes.css                 # Theme styles
│   │
│   ├── 📁 types/                        # 📘 Global TypeScript Types
│   │   ├── api.types.ts               # API types (từ backend DTOs)
│   │   ├── auth.types.ts              # Auth types
│   │   ├── user.types.ts              # User types
│   │   ├── common.types.ts            # Common types
│   │   └── index.ts                   # Export all types
│   │
│   ├── 📁 utils/                        # 🛠️ Utility Functions
│   │   ├── constants.ts               # Constants (từ backend messages.ts)
│   │   ├── enums.ts                   # Enums (từ backend enums/)
│   │   ├── validators.ts              # Validation functions
│   │   ├── formatters.ts              # Format functions
│   │   ├── helpers.ts                 # Helper functions
│   │   └── storage.ts                 # Storage helpers
│   │
│   ├── App.tsx                         # 🚀 Root Component
│   ├── main.tsx                       # 📍 Entry Point
│   └── vite-env.d.ts                  # Vite type definitions
│
├── 📄 .env                             # Environment variables
├── 📄 .env.local                       # Local env
├── 📄 .env.production                  # Production env
├── 📄 .gitignore
├── 📄 index.html
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 vite.config.ts                   # Vite configuration
└── 📄 README.md
```

## Mapping với Backend

| Backend Path | Frontend Path | Mô tả |
|--------------|---------------|------|
| `/api/auth` | `/src/api/auth.api.ts` | Auth API client |
| `/api/user` | `/src/api/user.api.ts` | User API client |
| `/api/admin` | `/src/api/admin.api.ts` | Admin API client |
| `auth.controller.ts` | `features/auth/hooks/useAuth.ts` | Auth logic |
| `auth.dto.ts` | `types/api.types.ts` | DTOs → Types |
| `auth.validator.ts` | `utils/validators.ts` | Validation |
| `messages.ts` | `utils/constants.ts` | Messages |
| `enums/` | `utils/enums.ts` | Enums |
| `middleware/` | `routes/PrivateRoute.tsx` | Route protection |

## Quy tắc đặt tên

### Files
- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Hooks**: `camelCase.ts` với prefix `use` (e.g., `useAuth.ts`)
- **Utils**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `camelCase.types.ts` (e.g., `user.types.ts`)
- **API**: `camelCase.api.ts` (e.g., `auth.api.ts`)

### Folders
- **Features**: `lowercase/` (e.g., `auth/`, `user/`)
- **Components**: `lowercase/` (e.g., `ui/`, `layout/`)
- **Utils/Types**: `lowercase/` (e.g., `utils/`, `types/`)

## Luồng dữ liệu

```
User Action
    ↓
Component (UI)
    ↓
Hook (Logic) → useAuth, useLogin, etc.
    ↓
API Client → auth.api.ts, user.api.ts
    ↓
Axios Client → client.ts (interceptors)
    ↓
Backend API → /api/auth, /api/user
    ↓
Response → Types → Context/State
    ↓
Component Update
```

## Ví dụ Import Paths

```typescript
// API
import { authApi } from '@/api/auth.api'
import { userApi } from '@/api/user.api'

// Features
import { LoginForm } from '@/features/auth'
import { ProfilePage } from '@/features/user/pages/ProfilePage'

// Components
import { Button } from '@/components/ui/Button'
import { Layout } from '@/components/layout/Layout'

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLocalStorage } from '@/hooks/useLocalStorage'

// Types
import type { UserDto } from '@/types/api.types'
import type { AuthState } from '@/types/auth.types'

// Utils
import { MESSAGES } from '@/utils/constants'
import { UserRole } from '@/utils/enums'
import { formatDate } from '@/utils/formatters'

// Context
import { useAuthContext } from '@/contexts/AuthContext'
```

