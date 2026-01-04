# Job Portal Frontend - Kế hoạch Chi tiết (React + Tailwind)

## 📋 Tổng quan dự án

Dự án frontend Job Portal sử dụng React + Tailwind CSS, tích hợp với backend API có sẵn. Hỗ trợ 3 role chính: Candidate, Recruiter, Admin.

## 🏗️ 1. Cấu trúc thư mục (Project Structure)

```
src/
├── components/           # Components tái sử dụng
│   ├── ui/              # UI primitives (shadcn/ui)
│   ├── layout/          # Layout components
│   ├── forms/           # Form components
│   └── common/          # Common components
├── pages/               # Page components
│   ├── auth/            # Authentication pages
│   ├── candidate/       # Candidate pages
│   ├── recruiter/       # Recruiter pages
│   ├── admin/           # Admin pages
│   └── public/          # Public pages
├── hooks/               # Custom React hooks
├── services/            # API services
├── store/               # State management
├── utils/               # Utility functions
├── constants/           # Constants & config
├── types/               # TypeScript types
└── styles/              # Global styles
```

## 🎯 2. Chi tiết cấu trúc thư mục

### 📁 components/

```
components/
├── ui/                          # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── modal.tsx
│   ├── dropdown.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── tabs.tsx
│   ├── pagination.tsx
│   └── skeleton.tsx
├── layout/                      # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── navbar.tsx
│   ├── footer.tsx
│   └── breadcrumbs.tsx
├── forms/                       # Form components
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── job-post-form.tsx
│   ├── profile-form.tsx
│   ├── search-form.tsx
│   └── application-form.tsx
└── common/                      # Business-specific components
    ├── job-card.tsx
    ├── company-card.tsx
    ├── application-card.tsx
    ├── profile-section.tsx
    ├── search-filters.tsx
    └── notification-item.tsx
```

### 📁 pages/

```
pages/
├── auth/
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   └── verify-email.tsx
├── candidate/
│   ├── dashboard.tsx
│   ├── profile/
│   │   ├── index.tsx
│   │   ├── experiences.tsx
│   │   ├── education.tsx
│   │   ├── skills.tsx
│   │   ├── certifications.tsx
│   │   └── awards.tsx
│   ├── jobs/
│   │   ├── index.tsx          # Job search
│   │   ├── details.tsx        # Job details
│   │   ├── saved.tsx          # Saved jobs
│   │   └── recommendations.tsx
│   ├── applications/
│   │   ├── index.tsx
│   │   ├── details.tsx
│   │   └── documents.tsx
│   ├── resumes/
│   │   ├── index.tsx
│   │   ├── create.tsx
│   │   ├── edit.tsx
│   │   └── preview.tsx
│   └── search-history.tsx
├── recruiter/
│   ├── dashboard.tsx
│   ├── company/
│   │   ├── index.tsx
│   │   ├── details.tsx
│   │   └── benefits.tsx
│   ├── jobs/
│   │   ├── index.tsx          # My jobs
│   │   ├── create.tsx
│   │   ├── edit.tsx
│   │   ├── details.tsx
│   │   └── analytics.tsx
│   ├── applications/
│   │   ├── index.tsx
│   │   ├── review.tsx
│   │   ├── shortlisted.tsx
│   │   └── analytics.tsx
│   ├── candidates/
│   │   ├── search.tsx
│   │   └── matching.tsx
│   └── connections/
│       ├── index.tsx
│       └── interests.tsx
├── admin/
│   ├── dashboard.tsx
│   ├── users/
│   │   ├── index.tsx
│   │   └── details.tsx
│   ├── jobs/
│   │   ├── index.tsx
│   │   ├── pending.tsx
│   │   └── moderation.tsx
│   └── analytics.tsx
└── public/
    ├── home.tsx
    ├── jobs.tsx
    ├── companies.tsx
    ├── job-details.tsx
    └── company-details.tsx
```

### 📁 hooks/

```
hooks/
├── useAuth.ts              # Authentication hooks
├── useJobs.ts              # Job-related hooks
├── useApplications.ts      # Application hooks
├── useSearch.ts            # Search functionality
├── useNotifications.ts     # Notification hooks
├── useFileUpload.ts        # File upload hooks
└── useLocalStorage.ts      # Local storage utilities
```

### 📁 services/

```
services/
├── api/
│   ├── axios.ts            # Axios configuration
│   ├── auth.ts             # Authentication API
│   ├── jobs.ts             # Jobs API
│   ├── companies.ts        # Companies API
│   ├── applications.ts     # Applications API
│   ├── search.ts           # Search API
│   ├── notifications.ts    # Notifications API
│   └── admin.ts            # Admin API
├── config/
│   └── api-config.ts       # API configuration
└── types/
    └── api-types.ts        # API response types
```

### 📁 store/

```
store/
├── auth/
│   ├── authSlice.ts
│   └── authSelectors.ts
├── jobs/
│   ├── jobsSlice.ts
│   └── jobsSelectors.ts
├── applications/
│   ├── applicationsSlice.ts
│   └── applicationsSelectors.ts
├── notifications/
│   ├── notificationsSlice.ts
│   └── notificationsSelectors.ts
└── index.ts                # Store configuration
```

### 📁 utils/

```
utils/
├── date.ts                 # Date formatting
├── validation.ts           # Form validation
├── search.ts               # Search utilities
├── file.ts                 # File handling
├── constants.ts            # App constants
└── helpers.ts              # Helper functions
```

## 🛣️ 3. Routing Structure

### Public Routes

```
/ (Home)
/login
/register
/forgot-password
/reset-password
/verify-email
/jobs
/jobs/:id (Job details)
/companies
/companies/:id (Company details)
/search/jobs
/search/companies
```

### Candidate Routes (Protected)

```
/candidate/dashboard
/candidate/profile
/candidate/profile/experiences
/candidate/profile/education
/candidate/profile/skills
/candidate/profile/certifications
/candidate/profile/awards
/candidate/jobs
/candidate/jobs/:id
/candidate/jobs/saved
/candidate/jobs/recommendations
/candidate/applications
/candidate/applications/:id
/candidate/resumes
/candidate/resumes/create
/candidate/resumes/:id/edit
/candidate/resumes/:id/preview
/candidate/search-history
```

### Recruiter Routes (Protected)

```
/recruiter/dashboard
/recruiter/company
/recruiter/company/details
/recruiter/company/benefits
/recruiter/jobs
/recruiter/jobs/create
/recruiter/jobs/:id/edit
/recruiter/jobs/:id/analytics
/recruiter/applications
/recruiter/applications/:id/review
/recruiter/applications/shortlisted
/recruiter/candidates/search
/recruiter/connections
```

### Admin Routes (Protected)

```
/admin/dashboard
/admin/users
/admin/users/:id
/admin/jobs
/admin/jobs/pending
/admin/analytics
```

## 🎨 4. UI Components & Pages

### Core UI Components

- **Header/Navbar**: Logo, navigation menu, user menu, notifications
- **Sidebar**: Role-based navigation
- **SearchBar**: Global search với autocomplete
- **JobCard**: Job listing card với actions
- **CompanyCard**: Company listing card
- **ApplicationCard**: Application status card
- **ProfileCard**: User profile summary
- **Modal**: Generic modal wrapper
- **Form Components**: Input, Select, Textarea, FileUpload
- **DataTable**: Sortable, filterable table
- **Charts**: Analytics charts (applications, views, etc.)

### Page Layouts

- **AuthLayout**: Centered form layout
- **DashboardLayout**: Sidebar + main content
- **PublicLayout**: Header + footer + content
- **ProfileLayout**: Profile sections navigation

## 🔐 5. Authentication Flow

### Login/Register Process

1. **Login Page**: Email/password form
2. **Register Page**: Full registration form
3. **Email Verification**: Verification code input
4. **Password Reset**: Forgot password flow

### Role-based Access Control

- **Public**: Job search, company browsing
- **Candidate**: Profile management, applications, saved jobs
- **Recruiter**: Job posting, application management, company profile
- **Admin**: User management, content moderation

### Protected Routes

- Route guards based on authentication status
- Role-based route protection
- Redirect logic for unauthorized access

## 📊 6. State Management

### Global State (Redux Toolkit)

- **Auth State**: User info, tokens, role
- **Jobs State**: Job listings, filters, search results
- **Applications State**: User applications, status
- **Notifications State**: Unread count, notification list
- **UI State**: Modals, loading states, theme

### Local State (useState/useReducer)

- Form states
- Component-specific states
- Temporary UI states

## 🔄 7. API Integration

### Axios Configuration

- Base URL configuration
- Request/response interceptors
- Authentication headers
- Error handling

### API Services Layer

- Centralized API calls
- Type-safe request/response
- Error handling
- Loading states

### Data Fetching Strategy

- React Query for server state
- Optimistic updates
- Cache management
- Background refetching

## 📱 8. Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile-first Approach

- Responsive navigation (hamburger menu)
- Mobile-optimized forms
- Touch-friendly interactions
- Optimized layouts for small screens

## 🎯 9. Key Features Implementation

### Job Search & Filtering

- Full-text search
- Advanced filters (location, salary, type, etc.)
- Sort options (relevance, date, salary)
- Search suggestions/autocomplete
- Saved searches

### Profile Management

- Multi-step profile completion
- Dynamic form sections
- File uploads (resume, avatar)
- Profile visibility settings
- Progress tracking

### Application Workflow

- One-click apply
- Application status tracking
- Document uploads
- Communication with recruiters
- Application analytics

### Dashboard Analytics

- Job views/applications charts
- Profile completeness meter
- Recent activities
- Quick actions

## 🧪 10. Testing Strategy

### Unit Tests

- Component testing (Jest + React Testing Library)
- Hook testing
- Utility function testing

### Integration Tests

- API integration tests
- Form submission tests
- Navigation tests

### E2E Tests (Future)

- Critical user flows
- Cross-browser testing

## 🚀 11. Performance Optimization

### Code Splitting

- Route-based code splitting
- Component lazy loading
- Vendor chunk separation

### Image Optimization

- Lazy loading
- WebP format
- Responsive images

### Bundle Optimization

- Tree shaking
- Dead code elimination
- Compression

## 📦 12. Build & Deployment

### Development

- Hot reload
- ESLint + Prettier
- TypeScript strict mode

### Production Build

- Optimized bundle
- Source maps
- Environment variables

### Deployment

- Docker containerization
- CI/CD pipeline
- CDN for assets

## 🔧 13. Development Tools & Libraries

### Core Dependencies

```
react, react-dom
next.js or vite
tailwindcss
@reduxjs/toolkit, react-redux
react-query
react-router-dom
axios
formik, yup (forms)
react-hook-form
lucide-react (icons)
```

### Development Dependencies

```
typescript
eslint, prettier
jest, @testing-library/react
msw (mock API)
storybook (component docs)
```

This comprehensive plan covers all aspects of building a production-ready Job Portal frontend that integrates seamlessly with the existing backend API.
