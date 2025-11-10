-- recruitment_init_complete_fixed_v5.sql
-- Init script for Recruitment system (PostgreSQL)
-- Compatible with PostgreSQL 13+
-- Idempotent: Creates objects only if they do not exist.
--
-- PHIÊN BẢN NÀY ĐÃ SỬA CÁC VẤN ĐỀ LOGIC VÀ TƯƠNG THÍCH VỚI ORM (PRISMA):
-- 1. (Mục 1) Sửa lỗi logic `ON DELETE SET NULL` ở bảng job_posts_history.
-- 2. (Mục 2) Thay thế kiểu `POINT` không tương thích ở `locations` bằng `latitude` và `longitude`.
-- 3. (Mục 3) Gỡ bỏ hoàn toàn Table Partitioning để đơn giản hóa PK/FK, giúp ORM "hiểu" schema.

-- ===================
-- Configuration Check
-- ===================
-- IMPORTANT: Please verify your actual PostgreSQL server version using: SELECT version();
-- This script assumes PostgreSQL 13 or newer.

-- ========== Extensions ===========
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ Schema =============
CREATE SCHEMA IF NOT EXISTS recruitment;
SET search_path TO recruitment, public;
-- ========== Enum Types ===========
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN CREATE TYPE job_type AS ENUM ('full_time', 'part_time', 'contract');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN CREATE TYPE job_status AS ENUM ('draft', 'approved', 'closed');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN CREATE TYPE application_status AS ENUM ('pending', 'reviewed', 'rejected', 'accepted');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_target_type') THEN CREATE TYPE report_target_type AS ENUM ('job', 'user', 'company');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_owner_type') THEN CREATE TYPE attachment_owner_type AS ENUM ('user', 'company');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending_payment');
END IF; END $$; -- Added for subscriptions
-- Enum cho các loại token ngắn hạn
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_token_type') THEN
        CREATE TYPE user_token_type AS ENUM ('verify_email', 'reset_password');
    END IF;
END $$;
-- Enum cho tỉnh thành phố
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN CREATE TYPE location_type AS ENUM ('province', 'district');
END IF; END $$;


-- =========== Tables ==============
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1
);
-- Bảng lưu trữ Refresh Tokens (thay vì lưu ở client)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL, -- LUÔN LƯU BẢN HASH CỦA TOKEN
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP, -- (Null nếu còn active)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Bảng lưu các token dùng một lần
CREATE TABLE IF NOT EXISTS user_tokens (
    token_hash TEXT PRIMARY KEY, -- Token (đã hash) mà bạn gửi cho user
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type user_token_type NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [SỬA ĐỔI MỤC 2]
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                       -- Tên địa điểm (VD: "Hà Nội", "Ba Đình")
    type location_type NOT NULL,              -- Loại địa điểm (tỉnh/thành hoặc quận/huyện)
    parent_id UUID REFERENCES locations(id) ON DELETE CASCADE ON UPDATE CASCADE,  -- liên kết cha
    latitude DECIMAL(9, 6),                   -- Vĩ độ
    longitude DECIMAL(9, 6)                   -- Kinh độ
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    experience_years INT CHECK (experience_years IS NULL OR experience_years >= 0),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    recruiter_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Assuming one primary contact/owner recruiter
    logo_url TEXT,
    size INT CHECK (size IS NULL OR size > 0),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Note: If multiple recruiters per company needed, create a join table company_recruiters.
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT
);
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

-- [SỬA ĐỔI MỤC 3] Bỏ Partition
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- PK đơn giản
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    salary_range JSONB,
    job_type job_type,
    experience_level INT CHECK (experience_level IS NULL OR experience_level >= 0),
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status job_status DEFAULT 'draft',
    metadata JSONB,
    version INT DEFAULT 1,
    deleted BOOLEAN DEFAULT FALSE
    -- Bỏ PRIMARY KEY (id, posted_at)
);
-- Bỏ PARTITION (jobs_2025)

-- [SỬA ĐỔI MỤC 1 & 3]
CREATE TABLE IF NOT EXISTS job_posts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    -- Bỏ job_posted_at TIMESTAMP NOT NULL,
    version INT NOT NULL,
    content JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Sửa FK (Mục 1: ON DELETE RESTRICT) và (Mục 3: FK đơn giản)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
    
    -- Sửa UNIQUE (Mục 3)
    UNIQUE (job_id, version)
);

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content JSONB,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [SỬA ĐỔI MỤC 3] Bỏ Partition
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- PK đơn giản
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,
    -- Bỏ job_posted_at TIMESTAMP NOT NULL,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    status application_status DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    version INT DEFAULT 1,
    
    -- Sửa FK (Mục 3)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    -- Bỏ PRIMARY KEY (id, applied_at)
);
-- Bỏ PARTITION (applications_2025)

-- [SỬA ĐỔI MỤC 3]
CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,
    -- Bỏ job_posted_at TIMESTAMP NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Sửa FK và UNIQUE (Mục 3)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'push', 'in_app')),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS audits (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_id UUID NOT NULL,
    target_type report_target_type NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored'))
);
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User making the payment (e.g., recruiter)
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- Optionally link payment to a company account
    related_to_entity_type TEXT CHECK (related_to_entity_type IN ('subscription', 'job_boost', NULL)), -- What is this payment for?
    related_to_entity_id UUID, -- ID of the subscription or boosted job etc.
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'pending',
    gateway_transaction_id TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS roles_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission TEXT NOT NULL,
    UNIQUE (role, permission)
);
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_url TEXT NOT NULL,
    type TEXT,
    owner_id UUID NOT NULL,
    owner_type attachment_owner_type NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ======== Join Tables ==========

-- [SỬA ĐỔI MỤC 3]
CREATE TABLE IF NOT EXISTS job_skills (
    job_id UUID NOT NULL,
    -- Bỏ job_posted_at TIMESTAMP NOT NULL,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    
    -- Sửa FK và PK (Mục 3)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency INT CHECK (proficiency BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, skill_id)
);

-- [SỬA ĐỔI MỤC 3]
CREATE TABLE IF NOT EXISTS job_tags (
    job_id UUID NOT NULL,
    -- Bỏ job_posted_at TIMESTAMP NOT NULL,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    
    -- Sửa FK và PK (Mục 3)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, tag_id)
);

-- ======== NEW TABLES BASED ON USE CASES ========

-- Table for User Follows (Candidate follows Recruiter/Company User)
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The user who is following (likely Candidate)
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The user being followed (likely Recruiter)
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id) -- Ensures a user cannot follow the same person twice
);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id); -- To quickly find followers of a user

-- Table for Search History (User saves search queries)
CREATE TABLE IF NOT EXISTS search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL, -- Stores keywords and filters used, e.g., {"keywords": "...", "location_id": "...", "skills": [...]}
    search_type TEXT NOT NULL CHECK (search_type IN ('job', 'candidate')), -- Differentiates between job search and 
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index to quickly retrieve a user's recent searches
CREATE INDEX IF NOT EXISTS idx_search_history_user_time ON search_history (user_id, searched_at DESC);

-- Table for defining Service Packages (Managed by Admin, viewed/purchased by Recruiter)
CREATE TABLE IF NOT EXISTS service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g., "Basic Job Post", "Premium Recruiter", "Enterprise"
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    duration_days INT CHECK (duration_days IS NULL OR duration_days > 0), -- Duration in days (NULL for 
    features JSONB, -- Describes package benefits, e.g., {"job_posts_limit": 5, "highlight_job": true, "candidate_search_limit": 100}
    is_active BOOLEAN DEFAULT TRUE, -- Allows admin to disable packages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages (is_active);

-- Table for Company/User Subscriptions to Service Packages
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE RESTRICT, -- Prevent deleting a package if actively subscribed
    payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE SET NULL, -- Link to the activating payment
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP, -- Can be NULL for non-expiring? Or calculated based on duration_days
   
    status subscription_status NOT NULL DEFAULT 'pending_payment', -- Use the new ENUM
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions (company_id, status, end_date);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_package ON company_subscriptions (package_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_payment ON company_subscriptions (payment_id);
-- Consider a trigger or application logic to calculate end_date based on package duration_days


-- MV cho báo cáo doanh thu (Admin)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_revenue_daily AS
SELECT
    DATE_TRUNC('day', p.created_at) AS report_day,
    p.currency,
    sp.name AS package_name,
    COUNT(p.id) AS payments_count,
    SUM(p.amount) AS total_revenue
FROM payments p
JOIN company_subscriptions cs ON p.id = cs.payment_id
JOIN service_packages sp ON cs.package_id = sp.id
WHERE p.status = 'completed'
GROUP BY report_day, p.currency, sp.name;
-- Index cho MV để lọc nhanh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_report_revenue_day_pkg ON mv_report_revenue_daily (report_day, package_name, currency);

---

-- [SỬA ĐỔI MỤC 3]
-- MV cho báo cáo tin đăng (Admin & Recruiter)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_job_performance AS
SELECT
    j.id AS job_id,
    -- Bỏ j.posted_at AS job_posted_at,
    j.company_id,
    j.title,
    j.status,
    COUNT(a.id) AS total_applications,
    COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) AS accepted_applications
    -- Giả sử bạn có cột 'views' trong bảng 'jobs'
    -- j.views AS total_views 
FROM jobs j
LEFT JOIN applications a ON a.job_id = j.id -- Sửa JOIN (Mục 3)
GROUP BY j.id, j.company_id, j.title, j.status; -- Sửa GROUP BY (Mục 3)

-- Index cho MV (SỬA ĐỔI MỤC 3)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_report_job_perf_job_id ON mv_report_job_performance (job_id);
CREATE INDEX IF NOT EXISTS idx_mv_report_job_perf_company ON mv_report_job_performance (company_id);

---

-- MV cho báo cáo người dùng (Admin)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_user_growth AS
SELECT
    DATE_TRUNC('day', created_at) AS registration_day,
    role,
    COUNT(id) AS new_users_count
FROM users
WHERE deleted = FALSE
GROUP BY registration_day, role;
-- Index cho MV
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_report_user_growth_day_role ON mv_report_user_growth (registration_day, role);

-- =========== Indexes ===========
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE deleted = FALSE;
-- Index để tìm token của user (ví dụ: vô hiệu hóa token cũ khi user yêu cầu token mới)
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id_type ON user_tokens (user_id, type);
-- Index để chạy job dọn dẹp token hết hạn
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at);

-- [SỬA ĐỔI MỤC 3]
CREATE INDEX IF NOT EXISTS idx_applications_user_job ON applications (user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id);
CREATE INDEX IF NOT EXISTS gin_profiles_metadata ON profiles USING GIN (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS trigram_users_email ON users USING GIST (email gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_audits_table_record ON audits (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read, sent_at DESC);
-- For fetching unread notifications
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments (owner_type, owner_id);
-- For polymorphic lookup


-- index cho locations
CREATE INDEX locations_type_idx ON locations(type);

-- ======== Audit Trigger ========

-- [SỬA ĐỔI MỤC 3] Đơn giản hóa logic lấy record_id
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
DECLARE
    app_user_id UUID;
    v_record_id TEXT;
BEGIN
    app_user_id := current_setting('myapp.user_id', true)::UUID;

    -- Logic đơn giản hoá vì không còn PK tổng hợp
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_record_id := NEW.id::text;
    ELSIF (TG_OP = 'DELETE') THEN
        v_record_id := OLD.id::text;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audits (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, NULL, row_to_json(NEW)::JSONB, app_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD IS DISTINCT FROM NEW THEN
             INSERT INTO audits (table_name, record_id, action, old_data, new_data, user_id)
             VALUES (TG_TABLE_NAME, v_record_id, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, app_user_id);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audits (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, row_to_json(OLD)::JSONB, NULL, app_user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_jobs_trigger ON jobs;
CREATE TRIGGER audit_jobs_trigger AFTER INSERT OR UPDATE OR DELETE ON jobs FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Add triggers for other tables as needed (e.g., companies, profiles, applications)
-- VÍ DỤ:
DROP TRIGGER IF EXISTS audit_applications_trigger ON applications;
CREATE TRIGGER audit_applications_trigger AFTER INSERT OR UPDATE OR DELETE ON applications FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_companies_trigger ON companies;
CREATE TRIGGER audit_companies_trigger AFTER INSERT OR UPDATE OR DELETE ON companies FOR EACH ROW EXECUTE FUNCTION audit_trigger();


-- ======== Functions (Optional Placeholders) ========
-- Trigger function to update `updated_at` columns automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Or CURRENT_TIMESTAMP
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to tables needing it
DROP TRIGGER IF EXISTS set_users_timestamp ON users;
CREATE TRIGGER set_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_profiles_timestamp ON profiles;
CREATE TRIGGER set_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_companies_timestamp ON companies;
CREATE TRIGGER set_companies_timestamp BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_resumes_timestamp ON resumes;
CREATE TRIGGER set_resumes_timestamp BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_payments_timestamp ON payments;
CREATE TRIGGER set_payments_timestamp BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_service_packages_timestamp ON service_packages;
CREATE TRIGGER set_service_packages_timestamp BEFORE UPDATE ON service_packages FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_company_subscriptions_timestamp ON company_subscriptions;
CREATE TRIGGER set_company_subscriptions_timestamp BEFORE UPDATE ON company_subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ==== Transaction & Concurrency Notes (Informational) ====
-- (Same notes)

-- ======== Security / Roles (Example Setup) =========
-- (Same example)

-- ============ End of Script ============