--
-- PostgreSQL database dump
--

\restrict QClcTsXLEdqFHPDrSNRq53j82Kd2zAbjiJsKGzOWk9KTx3WLNib9AKuUd8mfs5Q

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: recruitment; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA recruitment;


ALTER SCHEMA recruitment OWNER TO postgres;

--
-- Name: application_status; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.application_status AS ENUM (
    'pending',
    'reviewed',
    'rejected',
    'accepted'
);


ALTER TYPE recruitment.application_status OWNER TO postgres;

--
-- Name: attachment_owner_type; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.attachment_owner_type AS ENUM (
    'user',
    'company'
);


ALTER TYPE recruitment.attachment_owner_type OWNER TO postgres;

--
-- Name: job_status; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.job_status AS ENUM (
    'draft',
    'approved',
    'closed'
);


ALTER TYPE recruitment.job_status OWNER TO postgres;

--
-- Name: job_type; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.job_type AS ENUM (
    'full_time',
    'part_time',
    'contract'
);


ALTER TYPE recruitment.job_type OWNER TO postgres;

--
-- Name: location_type; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.location_type AS ENUM (
    'province',
    'district'
);


ALTER TYPE recruitment.location_type OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.payment_status AS ENUM (
    'pending',
    'completed',
    'failed'
);


ALTER TYPE recruitment.payment_status OWNER TO postgres;

--
-- Name: report_target_type; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.report_target_type AS ENUM (
    'job',
    'user',
    'company'
);


ALTER TYPE recruitment.report_target_type OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled',
    'pending_payment'
);


ALTER TYPE recruitment.subscription_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.user_role AS ENUM (
    'candidate',
    'recruiter',
    'admin'
);


ALTER TYPE recruitment.user_role OWNER TO postgres;

--
-- Name: user_token_type; Type: TYPE; Schema: recruitment; Owner: postgres
--

CREATE TYPE recruitment.user_token_type AS ENUM (
    'verify_email',
    'reset_password'
);


ALTER TYPE recruitment.user_token_type OWNER TO postgres;

--
-- Name: audit_trigger(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.audit_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    app_user_id UUID;
    v_record_id TEXT;
BEGIN
    -- Cố gắng lấy user_id từ cài đặt session, bỏ qua nếu không được set
    BEGIN
        app_user_id := current_setting('myapp.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        app_user_id := NULL;
    END;

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
$$;


ALTER FUNCTION recruitment.audit_trigger() OWNER TO postgres;

--
-- Name: calculate_user_job_score(uuid, uuid); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.calculate_user_job_score(p_user_id uuid, p_job_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_score DECIMAL(10,6) := 0;
    total_weight DECIMAL(10,6) := 0;
    pref_record RECORD;
    job_data RECORD;
BEGIN
    -- Get job details
    SELECT * INTO job_data FROM jobs WHERE id = p_job_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Calculate score based on user preferences
    FOR pref_record IN
        SELECT preference_type, preference_value, weight
        FROM user_preferences
        WHERE user_id = p_user_id
    LOOP
        CASE pref_record.preference_type
            WHEN 'salary_range' THEN
                -- Add salary matching logic here
                total_score := total_score + (pref_record.weight * 0.5); -- Placeholder

            WHEN 'location' THEN
                -- Add location matching logic here
                IF job_data.location_id IS NOT NULL THEN
                    total_score := total_score + (pref_record.weight * 0.8); -- Placeholder
                END IF;

            WHEN 'job_type' THEN
                -- Add job type matching logic here
                IF job_data.job_type IS NOT NULL THEN
                    total_score := total_score + (pref_record.weight * 1.0); -- Placeholder
                END IF;
        END CASE;

        total_weight := total_weight + pref_record.weight;
    END LOOP;

    -- Return normalized score
    IF total_weight > 0 THEN
        RETURN LEAST((total_score / total_weight)::DECIMAL(5,4), 1.0000);
    ELSE
        RETURN 0.0000;
    END IF;
END;
$$;


ALTER FUNCTION recruitment.calculate_user_job_score(p_user_id uuid, p_job_id uuid) OWNER TO postgres;

--
-- Name: expire_connection_interests(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.expire_connection_interests() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE connection_interests
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION recruitment.expire_connection_interests() OWNER TO postgres;

--
-- Name: get_similar_jobs(uuid, text, integer); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.get_similar_jobs(p_job_id uuid, p_similarity_type text DEFAULT 'hybrid'::text, p_limit integer DEFAULT 10) RETURNS TABLE(similar_job_id uuid, similarity_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN js.job1_id = p_job_id THEN js.job2_id
            ELSE js.job1_id
        END as similar_job_id,
        js.similarity_score
    FROM job_similarities js
    WHERE (js.job1_id = p_job_id OR js.job2_id = p_job_id)
    AND js.similarity_type = p_similarity_type
    ORDER BY js.similarity_score DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION recruitment.get_similar_jobs(p_job_id uuid, p_similarity_type text, p_limit integer) OWNER TO postgres;

--
-- Name: handle_job_view_insert(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.handle_job_view_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if there's already a view for this profile/job in the last hour
    IF NEW.profile_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_views
        WHERE profile_id = NEW.profile_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour')
    ) THEN
        -- Update the existing record instead of inserting
        UPDATE job_views
        SET viewed_at = NEW.viewed_at,
            duration_seconds = GREATEST(duration_seconds, NEW.duration_seconds),
            source = NEW.source
        WHERE profile_id = NEW.profile_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour');

        -- Return NULL to prevent the insert
        RETURN NULL;
    END IF;

    -- Allow the insert
    RETURN NEW;
END;
$$;


ALTER FUNCTION recruitment.handle_job_view_insert() OWNER TO postgres;

--
-- Name: set_connection_expires_at(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.set_connection_expires_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at = NEW.created_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION recruitment.set_connection_expires_at() OWNER TO postgres;

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION recruitment.trigger_set_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: recruitment; Owner: postgres
--

CREATE FUNCTION recruitment.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION recruitment.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE recruitment._prisma_migrations OWNER TO postgres;

--
-- Name: activity_logs; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.activity_logs (
    id bigint NOT NULL,
    user_id uuid,
    action text NOT NULL,
    details jsonb,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: recruitment; Owner: postgres
--

CREATE SEQUENCE recruitment.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE recruitment.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: recruitment; Owner: postgres
--

ALTER SEQUENCE recruitment.activity_logs_id_seq OWNED BY recruitment.activity_logs.id;


--
-- Name: application_documents; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.application_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    file_url text NOT NULL,
    original_filename character varying(255),
    mime_type character varying(100),
    file_size_bytes bigint,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE recruitment.application_documents OWNER TO postgres;

--
-- Name: application_stages; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.application_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    stage_name character varying(100) NOT NULL,
    stage_order integer NOT NULL,
    status character varying(50) NOT NULL,
    scheduled_at timestamp(6) without time zone,
    completed_at timestamp(6) without time zone,
    feedback text,
    rating integer,
    interviewer_notes text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_stage_rating CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 10))))
);


ALTER TABLE recruitment.application_stages OWNER TO postgres;

--
-- Name: applications; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    resume_id uuid,
    status recruitment.application_status DEFAULT 'pending'::recruitment.application_status,
    applied_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb,
    version integer DEFAULT 1,
    profile_id uuid NOT NULL
);


ALTER TABLE recruitment.applications OWNER TO postgres;

--
-- Name: attachments; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_url text NOT NULL,
    type text,
    owner_id uuid NOT NULL,
    owner_type recruitment.attachment_owner_type NOT NULL,
    original_filename text,
    mime_type text,
    size_bytes bigint,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.attachments OWNER TO postgres;

--
-- Name: audits; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.audits (
    id bigint NOT NULL,
    table_name text NOT NULL,
    record_id text,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    user_id uuid,
    "timestamp" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.audits OWNER TO postgres;

--
-- Name: audits_id_seq; Type: SEQUENCE; Schema: recruitment; Owner: postgres
--

CREATE SEQUENCE recruitment.audits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE recruitment.audits_id_seq OWNER TO postgres;

--
-- Name: audits_id_seq; Type: SEQUENCE OWNED BY; Schema: recruitment; Owner: postgres
--

ALTER SEQUENCE recruitment.audits_id_seq OWNED BY recruitment.audits.id;


--
-- Name: companies; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    recruiter_id uuid,
    logo_url text,
    size integer,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    business_license character varying(100),
    contact_address text,
    contact_email character varying(255),
    contact_phone character varying(20),
    facebook_url character varying(255),
    is_verified boolean DEFAULT false,
    linkedin_url character varying(255),
    status character varying(20) DEFAULT 'active'::character varying,
    tax_code character varying(50),
    twitter_url character varying(255),
    verification_date timestamp(6) without time zone
);


ALTER TABLE recruitment.companies OWNER TO postgres;

--
-- Name: company_benefits; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.company_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    benefit_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE recruitment.company_benefits OWNER TO postgres;

--
-- Name: company_cultures; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.company_cultures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    culture_aspect character varying(50) NOT NULL,
    rating integer,
    description text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_culture_rating CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))))
);


ALTER TABLE recruitment.company_cultures OWNER TO postgres;

--
-- Name: company_details; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.company_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    industry character varying(100),
    founded_year integer,
    employee_count_min integer,
    employee_count_max integer,
    website_url character varying(255),
    headquarters_location_id uuid,
    company_type character varying(50),
    revenue_range character varying(50),
    stock_symbol character varying(10),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE recruitment.company_details OWNER TO postgres;

--
-- Name: connection_interests; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.connection_interests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    recruiter_id uuid NOT NULL,
    job_id uuid,
    interest_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    contact_info jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) without time zone,
    responded_at timestamp(6) without time zone,
    CONSTRAINT check_interest_type CHECK ((interest_type = ANY (ARRAY['candidate_to_recruiter'::text, 'recruiter_to_candidate'::text]))),
    CONSTRAINT check_status CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])))
);


ALTER TABLE recruitment.connection_interests OWNER TO postgres;

--
-- Name: job_benefits; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    benefit_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    value_amount numeric(15,2),
    value_currency character varying(10) DEFAULT 'VND'::character varying,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE recruitment.job_benefits OWNER TO postgres;

--
-- Name: job_posts_history; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_posts_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    version integer NOT NULL,
    content jsonb,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.job_posts_history OWNER TO postgres;

--
-- Name: job_requirements; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    requirement_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_required boolean DEFAULT true NOT NULL,
    level character varying(50),
    years_experience integer,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE recruitment.job_requirements OWNER TO postgres;

--
-- Name: job_skills; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_skills (
    job_id uuid NOT NULL,
    skill_id uuid NOT NULL
);


ALTER TABLE recruitment.job_skills OWNER TO postgres;

--
-- Name: job_tags; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_tags (
    job_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE recruitment.job_tags OWNER TO postgres;

--
-- Name: job_views; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    viewed_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    duration_seconds integer,
    source text DEFAULT 'direct'::text,
    referrer_job_id uuid,
    profile_id uuid,
    CONSTRAINT check_source CHECK ((source = ANY (ARRAY['search'::text, 'recommendation'::text, 'direct'::text, 'connection'::text])))
);


ALTER TABLE recruitment.job_views OWNER TO postgres;

--
-- Name: job_work_arrangements; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_work_arrangements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    is_remote_allowed boolean DEFAULT false NOT NULL,
    remote_percentage integer DEFAULT 0 NOT NULL,
    flexible_hours boolean DEFAULT false NOT NULL,
    travel_requirement character varying(50),
    overtime_expected boolean DEFAULT false NOT NULL,
    shift_type character varying(50),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_remote_percentage CHECK (((remote_percentage >= 0) AND (remote_percentage <= 100)))
);


ALTER TABLE recruitment.job_work_arrangements OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    company_id uuid,
    location_id uuid,
    salary_range jsonb,
    job_type recruitment.job_type,
    experience_level integer,
    posted_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) without time zone,
    status recruitment.job_status DEFAULT 'draft'::recruitment.job_status,
    metadata jsonb,
    version integer DEFAULT 1,
    deleted boolean DEFAULT false,
    updated_at timestamp(6) without time zone
);


ALTER TABLE recruitment.jobs OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.locations (
    id uuid NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    name text NOT NULL,
    parent_id uuid,
    type recruitment.location_type NOT NULL
);


ALTER TABLE recruitment.locations OWNER TO postgres;

--
-- Name: mv_report_connection_analytics; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_connection_analytics AS
 SELECT date_trunc('day'::text, created_at) AS report_day,
    interest_type,
    status,
    count(id) AS connections_count,
    count(
        CASE
            WHEN (status = 'accepted'::text) THEN 1
            ELSE NULL::integer
        END) AS accepted_count,
    count(
        CASE
            WHEN (status = 'declined'::text) THEN 1
            ELSE NULL::integer
        END) AS declined_count,
    count(
        CASE
            WHEN (status = 'expired'::text) THEN 1
            ELSE NULL::integer
        END) AS expired_count,
    avg(
        CASE
            WHEN (responded_at IS NOT NULL) THEN (EXTRACT(epoch FROM (responded_at - created_at)) / (3600)::numeric)
            ELSE NULL::numeric
        END) AS avg_response_hours
   FROM recruitment.connection_interests ci
  GROUP BY (date_trunc('day'::text, created_at)), interest_type, status
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_connection_analytics OWNER TO postgres;

--
-- Name: mv_report_job_performance; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_job_performance AS
 SELECT j.id AS job_id,
    j.company_id,
    j.title,
    j.status,
    count(a.id) AS total_applications,
    count(
        CASE
            WHEN (a.status = 'accepted'::recruitment.application_status) THEN 1
            ELSE NULL::integer
        END) AS accepted_applications
   FROM (recruitment.jobs j
     LEFT JOIN recruitment.applications a ON ((a.job_id = j.id)))
  GROUP BY j.id, j.company_id, j.title, j.status
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_job_performance OWNER TO postgres;

--
-- Name: mv_report_job_views; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_job_views AS
 SELECT date_trunc('day'::text, jv.viewed_at) AS report_day,
    jv.job_id,
    j.company_id,
    jv.source,
    count(jv.id) AS total_views,
    count(DISTINCT jv.profile_id) AS unique_viewers,
    avg(jv.duration_seconds) AS avg_duration_seconds,
    count(
        CASE
            WHEN (jv.referrer_job_id IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS referral_views
   FROM (recruitment.job_views jv
     LEFT JOIN recruitment.jobs j ON ((jv.job_id = j.id)))
  WHERE (jv.viewed_at IS NOT NULL)
  GROUP BY (date_trunc('day'::text, jv.viewed_at)), jv.job_id, j.company_id, jv.source
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_job_views OWNER TO postgres;

--
-- Name: search_history; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.search_history (
    id bigint NOT NULL,
    search_query jsonb NOT NULL,
    search_type text NOT NULL,
    searched_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    clicked_jobs jsonb DEFAULT '[]'::jsonb,
    filters_used jsonb DEFAULT '{}'::jsonb,
    result_count integer DEFAULT 0,
    session_id uuid,
    profile_id uuid NOT NULL
);


ALTER TABLE recruitment.search_history OWNER TO postgres;

--
-- Name: mv_report_search_analytics; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_search_analytics AS
 SELECT date_trunc('day'::text, searched_at) AS report_day,
    search_type,
    count(id) AS total_searches,
    count(DISTINCT profile_id) AS unique_searchers,
    count(DISTINCT session_id) AS unique_sessions,
    avg(result_count) AS avg_result_count,
    avg(jsonb_array_length(clicked_jobs)) AS avg_clicks_per_search,
    count(
        CASE
            WHEN (result_count = 0) THEN 1
            ELSE NULL::integer
        END) AS zero_result_searches
   FROM recruitment.search_history sh
  WHERE (searched_at IS NOT NULL)
  GROUP BY (date_trunc('day'::text, searched_at)), search_type
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_search_analytics OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role recruitment.user_role NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted boolean DEFAULT false,
    version integer DEFAULT 1
);


ALTER TABLE recruitment.users OWNER TO postgres;

--
-- Name: mv_report_user_growth; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_user_growth AS
 SELECT date_trunc('day'::text, created_at) AS registration_day,
    role,
    count(id) AS new_users_count
   FROM recruitment.users
  WHERE (deleted = false)
  GROUP BY (date_trunc('day'::text, created_at)), role
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_user_growth OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    sent_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    read boolean DEFAULT false
);


ALTER TABLE recruitment.notifications OWNER TO postgres;

--
-- Name: profile_awards; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profile_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    issuer character varying(255) NOT NULL,
    date date NOT NULL,
    description text,
    url character varying(255),
    category character varying(100),
    level character varying(50),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE recruitment.profile_awards OWNER TO postgres;

--
-- Name: profile_certifications; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profile_certifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    issuing_org character varying(255) NOT NULL,
    credential_id character varying(255),
    credential_url character varying(255),
    issue_date date NOT NULL,
    expiry_date date,
    never_expires boolean DEFAULT false NOT NULL,
    description text,
    skills_acquired text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


ALTER TABLE recruitment.profile_certifications OWNER TO postgres;

--
-- Name: profile_educations; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profile_educations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    school_name character varying(255) NOT NULL,
    degree character varying(255),
    field_of_study character varying(255),
    start_date date NOT NULL,
    end_date date
);


ALTER TABLE recruitment.profile_educations OWNER TO postgres;

--
-- Name: profile_experiences; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profile_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    company_name character varying(255) NOT NULL,
    "position" character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    is_current boolean DEFAULT false NOT NULL,
    description text
);


ALTER TABLE recruitment.profile_experiences OWNER TO postgres;

--
-- Name: profile_skills; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profile_skills (
    profile_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency integer,
    level text
);


ALTER TABLE recruitment.profile_skills OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    bio text,
    date_of_birth date,
    desired_currency character varying(10) DEFAULT 'VND'::character varying,
    desired_job_title character varying(255),
    desired_job_type recruitment.job_type[] DEFAULT ARRAY[]::recruitment.job_type[],
    desired_salary_min integer,
    display_name character varying(255),
    full_name character varying(255) NOT NULL,
    gender character varying(20),
    github_url character varying(255),
    headline character varying(255),
    is_looking_for_job boolean DEFAULT true NOT NULL,
    linkedin_url character varying(255),
    location_text character varying(100),
    personal_website character varying(255),
    phone_number character varying(20),
    years_of_experience integer DEFAULT 0
);


ALTER TABLE recruitment.profiles OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.refresh_tokens (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    user_agent text,
    ip_address inet,
    expires_at timestamp(6) without time zone NOT NULL,
    revoked_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: recruitment; Owner: postgres
--

CREATE SEQUENCE recruitment.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE recruitment.refresh_tokens_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: recruitment; Owner: postgres
--

ALTER SEQUENCE recruitment.refresh_tokens_id_seq OWNED BY recruitment.refresh_tokens.id;


--
-- Name: resumes; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content jsonb,
    file_url text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_id uuid NOT NULL
);


ALTER TABLE recruitment.resumes OWNER TO postgres;

--
-- Name: roles_permissions; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.roles_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role recruitment.user_role NOT NULL,
    permission text NOT NULL
);


ALTER TABLE recruitment.roles_permissions OWNER TO postgres;

--
-- Name: saved_jobs; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.saved_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    saved_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_id uuid NOT NULL
);


ALTER TABLE recruitment.saved_jobs OWNER TO postgres;

--
-- Name: search_history_id_seq; Type: SEQUENCE; Schema: recruitment; Owner: postgres
--

CREATE SEQUENCE recruitment.search_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE recruitment.search_history_id_seq OWNER TO postgres;

--
-- Name: search_history_id_seq; Type: SEQUENCE OWNED BY; Schema: recruitment; Owner: postgres
--

ALTER SEQUENCE recruitment.search_history_id_seq OWNED BY recruitment.search_history.id;


--
-- Name: skills; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text
);


ALTER TABLE recruitment.skills OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


ALTER TABLE recruitment.tags OWNER TO postgres;

--
-- Name: user_tokens; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.user_tokens (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    type recruitment.user_token_type NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.user_tokens OWNER TO postgres;

--
-- Name: activity_logs id; Type: DEFAULT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.activity_logs ALTER COLUMN id SET DEFAULT nextval('recruitment.activity_logs_id_seq'::regclass);


--
-- Name: audits id; Type: DEFAULT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.audits ALTER COLUMN id SET DEFAULT nextval('recruitment.audits_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('recruitment.refresh_tokens_id_seq'::regclass);


--
-- Name: search_history id; Type: DEFAULT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.search_history ALTER COLUMN id SET DEFAULT nextval('recruitment.search_history_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: application_documents application_documents_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);


--
-- Name: application_stages application_stages_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.application_stages
    ADD CONSTRAINT application_stages_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audits audits_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.audits
    ADD CONSTRAINT audits_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_benefits company_benefits_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_benefits
    ADD CONSTRAINT company_benefits_pkey PRIMARY KEY (id);


--
-- Name: company_cultures company_cultures_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_cultures
    ADD CONSTRAINT company_cultures_pkey PRIMARY KEY (id);


--
-- Name: company_details company_details_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_details
    ADD CONSTRAINT company_details_pkey PRIMARY KEY (id);


--
-- Name: connection_interests connection_interests_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_pkey PRIMARY KEY (id);


--
-- Name: job_benefits job_benefits_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_benefits
    ADD CONSTRAINT job_benefits_pkey PRIMARY KEY (id);


--
-- Name: job_posts_history job_posts_history_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_posts_history
    ADD CONSTRAINT job_posts_history_pkey PRIMARY KEY (id);


--
-- Name: job_requirements job_requirements_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_requirements
    ADD CONSTRAINT job_requirements_pkey PRIMARY KEY (id);


--
-- Name: job_skills job_skills_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_skills
    ADD CONSTRAINT job_skills_pkey PRIMARY KEY (job_id, skill_id);


--
-- Name: job_tags job_tags_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_tags
    ADD CONSTRAINT job_tags_pkey PRIMARY KEY (job_id, tag_id);


--
-- Name: job_views job_views_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_pkey PRIMARY KEY (id);


--
-- Name: job_work_arrangements job_work_arrangements_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_work_arrangements
    ADD CONSTRAINT job_work_arrangements_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profile_awards profile_awards_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_awards
    ADD CONSTRAINT profile_awards_pkey PRIMARY KEY (id);


--
-- Name: profile_certifications profile_certifications_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_certifications
    ADD CONSTRAINT profile_certifications_pkey PRIMARY KEY (id);


--
-- Name: profile_educations profile_educations_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_educations
    ADD CONSTRAINT profile_educations_pkey PRIMARY KEY (id);


--
-- Name: profile_experiences profile_experiences_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_experiences
    ADD CONSTRAINT profile_experiences_pkey PRIMARY KEY (id);


--
-- Name: profile_skills profile_skills_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_skills
    ADD CONSTRAINT profile_skills_pkey PRIMARY KEY (profile_id, skill_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: roles_permissions roles_permissions_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.roles_permissions
    ADD CONSTRAINT roles_permissions_pkey PRIMARY KEY (id);


--
-- Name: saved_jobs saved_jobs_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.saved_jobs
    ADD CONSTRAINT saved_jobs_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (token_hash);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: companies_recruiter_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX companies_recruiter_id_key ON recruitment.companies USING btree (recruiter_id);


--
-- Name: company_details_company_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX company_details_company_id_key ON recruitment.company_details USING btree (company_id);


--
-- Name: connection_interests_candidate_id_recruiter_id_job_id_inter_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX connection_interests_candidate_id_recruiter_id_job_id_inter_key ON recruitment.connection_interests USING btree (candidate_id, recruiter_id, job_id, interest_type);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_activity_logs_user ON recruitment.activity_logs USING btree (user_id);


--
-- Name: idx_application_documents_app; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_application_documents_app ON recruitment.application_documents USING btree (application_id);


--
-- Name: idx_application_documents_type; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_application_documents_type ON recruitment.application_documents USING btree (document_type);


--
-- Name: idx_application_stages_order; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_application_stages_order ON recruitment.application_stages USING btree (application_id, stage_order);


--
-- Name: idx_application_stages_scheduling; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_application_stages_scheduling ON recruitment.application_stages USING btree (status, scheduled_at);


--
-- Name: idx_applications_dashboard; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_dashboard ON recruitment.applications USING btree (job_id, status, applied_at DESC);


--
-- Name: idx_applications_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_job ON recruitment.applications USING btree (job_id);


--
-- Name: idx_applications_pipeline; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_pipeline ON recruitment.applications USING btree (job_id, status, applied_at);


--
-- Name: idx_applications_profile_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_profile_job ON recruitment.applications USING btree (profile_id, job_id);


--
-- Name: idx_attachments_owner; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_attachments_owner ON recruitment.attachments USING btree (owner_type, owner_id);


--
-- Name: idx_audits_table_record; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_audits_table_record ON recruitment.audits USING btree (table_name, record_id);


--
-- Name: idx_awards_category; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_awards_category ON recruitment.profile_awards USING btree (category);


--
-- Name: idx_certifications_expiry; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_certifications_expiry ON recruitment.profile_certifications USING btree (expiry_date);


--
-- Name: idx_companies_elasticsearch_sync; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_companies_elasticsearch_sync ON recruitment.companies USING btree (updated_at, id);


--
-- Name: idx_company_benefits_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_company_benefits_company ON recruitment.company_benefits USING btree (company_id);


--
-- Name: idx_company_benefits_fulltext; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_company_benefits_fulltext ON recruitment.company_benefits USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_company_cultures_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_company_cultures_company ON recruitment.company_cultures USING btree (company_id);


--
-- Name: idx_company_details_size_industry; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_company_details_size_industry ON recruitment.company_details USING btree (industry, employee_count_min, employee_count_max) WHERE (industry IS NOT NULL);


--
-- Name: idx_connection_active_matching; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_active_matching ON recruitment.connection_interests USING btree (candidate_id, status, created_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'accepted'::text]));


--
-- Name: idx_connection_interests_candidate_status; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_candidate_status ON recruitment.connection_interests USING btree (candidate_id, status, created_at DESC);


--
-- Name: idx_connection_interests_expires; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_expires ON recruitment.connection_interests USING btree (expires_at);


--
-- Name: idx_connection_interests_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_job ON recruitment.connection_interests USING btree (job_id, status);


--
-- Name: idx_connection_interests_pending; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_pending ON recruitment.connection_interests USING btree (expires_at, candidate_id, recruiter_id) WHERE (status = 'pending'::text);


--
-- Name: idx_connection_interests_recruiter_status; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_recruiter_status ON recruitment.connection_interests USING btree (recruiter_id, status, created_at DESC);


--
-- Name: idx_job_benefits_fulltext; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_benefits_fulltext ON recruitment.job_benefits USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_job_benefits_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_benefits_job ON recruitment.job_benefits USING btree (job_id);


--
-- Name: idx_job_requirements_fulltext; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_requirements_fulltext ON recruitment.job_requirements USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_job_requirements_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_requirements_job ON recruitment.job_requirements USING btree (job_id);


--
-- Name: idx_job_views_job_basic; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_views_job_basic ON recruitment.job_views USING btree (job_id, viewed_at DESC);


--
-- Name: idx_job_views_profile_basic; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_views_profile_basic ON recruitment.job_views USING btree (profile_id, viewed_at DESC);


--
-- Name: idx_jobs_active_search; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_active_search ON recruitment.jobs USING btree (status, location_id, job_type, posted_at DESC) WHERE ((status = 'approved'::recruitment.job_status) AND (deleted = false));


--
-- Name: idx_jobs_cleanup; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_cleanup ON recruitment.jobs USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (status = 'approved'::recruitment.job_status));


--
-- Name: idx_jobs_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_company ON recruitment.jobs USING btree (company_id);


--
-- Name: idx_jobs_elasticsearch_sync; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_elasticsearch_sync ON recruitment.jobs USING btree (updated_at, id);


--
-- Name: idx_jobs_expiration; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_expiration ON recruitment.jobs USING btree (expires_at);


--
-- Name: idx_jobs_location; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_location ON recruitment.jobs USING btree (location_id);


--
-- Name: idx_jobs_location_salary; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_location_salary ON recruitment.jobs USING btree (location_id, status) INCLUDE (salary_range, job_type, posted_at) WHERE ((status = 'approved'::recruitment.job_status) AND (deleted = false));


--
-- Name: idx_jobs_posted_at; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_posted_at ON recruitment.jobs USING btree (posted_at);


--
-- Name: idx_jobs_salary_range_gist; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_salary_range_gist ON recruitment.jobs USING gist (int4range(COALESCE(((salary_range ->> 'min'::text))::integer, 0), COALESCE(((salary_range ->> 'max'::text))::integer, 999999999))) WHERE ((status = 'approved'::recruitment.job_status) AND (deleted = false));


--
-- Name: idx_jobs_status; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_status ON recruitment.jobs USING btree (status);


--
-- Name: idx_mv_connection_analytics_day_type_status; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_connection_analytics_day_type_status ON recruitment.mv_report_connection_analytics USING btree (report_day, interest_type, status);


--
-- Name: idx_mv_job_views_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_mv_job_views_company ON recruitment.mv_report_job_views USING btree (company_id, report_day);


--
-- Name: idx_mv_job_views_day_job_source; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_job_views_day_job_source ON recruitment.mv_report_job_views USING btree (report_day, job_id, source);


--
-- Name: idx_mv_report_job_perf_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_mv_report_job_perf_company ON recruitment.mv_report_job_performance USING btree (company_id);


--
-- Name: idx_mv_report_job_perf_job_id; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_report_job_perf_job_id ON recruitment.mv_report_job_performance USING btree (job_id);


--
-- Name: idx_mv_report_user_growth_day_role; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_report_user_growth_day_role ON recruitment.mv_report_user_growth USING btree (registration_day, role);


--
-- Name: idx_mv_search_analytics_day_type; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_search_analytics_day_type ON recruitment.mv_report_search_analytics USING btree (report_day, search_type);


--
-- Name: idx_notifications_unread_recent; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_notifications_unread_recent ON recruitment.notifications USING btree (user_id, sent_at DESC) WHERE (read = false);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON recruitment.notifications USING btree (user_id, read, sent_at DESC);


--
-- Name: idx_profiles_elasticsearch_sync; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_profiles_elasticsearch_sync ON recruitment.profiles USING btree (updated_at, id);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON recruitment.refresh_tokens USING btree (user_id);


--
-- Name: idx_resumes_profile; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_resumes_profile ON recruitment.resumes USING btree (profile_id);


--
-- Name: idx_search_history_profile_time; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_profile_time ON recruitment.search_history USING btree (profile_id, searched_at DESC);


--
-- Name: idx_search_history_session; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_session ON recruitment.search_history USING btree (profile_id, session_id, searched_at);


--
-- Name: idx_user_activity_timeline; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_activity_timeline ON recruitment.activity_logs USING btree (user_id, "timestamp");


--
-- Name: idx_user_tokens_expires_at; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_tokens_expires_at ON recruitment.user_tokens USING btree (expires_at);


--
-- Name: idx_user_tokens_user_id_type; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_tokens_user_id_type ON recruitment.user_tokens USING btree (user_id, type);


--
-- Name: job_posts_history_job_id_version_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX job_posts_history_job_id_version_key ON recruitment.job_posts_history USING btree (job_id, version);


--
-- Name: job_work_arrangements_job_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX job_work_arrangements_job_id_key ON recruitment.job_work_arrangements USING btree (job_id);


--
-- Name: locations_type_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX locations_type_idx ON recruitment.locations USING btree (type);


--
-- Name: profile_awards_profile_id_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profile_awards_profile_id_idx ON recruitment.profile_awards USING btree (profile_id);


--
-- Name: profile_certifications_profile_id_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profile_certifications_profile_id_idx ON recruitment.profile_certifications USING btree (profile_id);


--
-- Name: profile_educations_profile_id_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profile_educations_profile_id_idx ON recruitment.profile_educations USING btree (profile_id);


--
-- Name: profile_experiences_profile_id_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profile_experiences_profile_id_idx ON recruitment.profile_experiences USING btree (profile_id);


--
-- Name: profiles_is_looking_for_job_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profiles_is_looking_for_job_idx ON recruitment.profiles USING btree (is_looking_for_job);


--
-- Name: profiles_user_id_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX profiles_user_id_idx ON recruitment.profiles USING btree (user_id);


--
-- Name: profiles_user_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX profiles_user_id_key ON recruitment.profiles USING btree (user_id);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON recruitment.refresh_tokens USING btree (token_hash);


--
-- Name: roles_permissions_role_permission_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX roles_permissions_role_permission_key ON recruitment.roles_permissions USING btree (role, permission);


--
-- Name: saved_jobs_profile_id_job_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX saved_jobs_profile_id_job_id_key ON recruitment.saved_jobs USING btree (profile_id, job_id);


--
-- Name: skills_name_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX skills_name_key ON recruitment.skills USING btree (name);


--
-- Name: tags_name_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX tags_name_key ON recruitment.tags USING btree (name);


--
-- Name: users_email_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON recruitment.users USING btree (email);


--
-- Name: applications audit_applications_trigger; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER audit_applications_trigger AFTER INSERT OR DELETE OR UPDATE ON recruitment.applications FOR EACH ROW EXECUTE FUNCTION recruitment.audit_trigger();


--
-- Name: companies audit_companies_trigger; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER audit_companies_trigger AFTER INSERT OR DELETE OR UPDATE ON recruitment.companies FOR EACH ROW EXECUTE FUNCTION recruitment.audit_trigger();


--
-- Name: jobs audit_jobs_trigger; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER audit_jobs_trigger AFTER INSERT OR DELETE OR UPDATE ON recruitment.jobs FOR EACH ROW EXECUTE FUNCTION recruitment.audit_trigger();


--
-- Name: users audit_users_trigger; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER audit_users_trigger AFTER INSERT OR DELETE OR UPDATE ON recruitment.users FOR EACH ROW EXECUTE FUNCTION recruitment.audit_trigger();


--
-- Name: companies set_companies_timestamp; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER set_companies_timestamp BEFORE UPDATE ON recruitment.companies FOR EACH ROW EXECUTE FUNCTION recruitment.trigger_set_timestamp();


--
-- Name: profiles set_profiles_timestamp; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER set_profiles_timestamp BEFORE UPDATE ON recruitment.profiles FOR EACH ROW EXECUTE FUNCTION recruitment.trigger_set_timestamp();


--
-- Name: resumes set_resumes_timestamp; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER set_resumes_timestamp BEFORE UPDATE ON recruitment.resumes FOR EACH ROW EXECUTE FUNCTION recruitment.trigger_set_timestamp();


--
-- Name: users set_users_timestamp; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER set_users_timestamp BEFORE UPDATE ON recruitment.users FOR EACH ROW EXECUTE FUNCTION recruitment.trigger_set_timestamp();


--
-- Name: job_views trigger_job_view_dedup; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER trigger_job_view_dedup BEFORE INSERT ON recruitment.job_views FOR EACH ROW EXECUTE FUNCTION recruitment.handle_job_view_insert();


--
-- Name: connection_interests trigger_set_connection_expires_at; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER trigger_set_connection_expires_at BEFORE INSERT ON recruitment.connection_interests FOR EACH ROW EXECUTE FUNCTION recruitment.set_connection_expires_at();


--
-- Name: company_details update_company_details_updated_at; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER update_company_details_updated_at BEFORE UPDATE ON recruitment.company_details FOR EACH ROW EXECUTE FUNCTION recruitment.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON recruitment.jobs FOR EACH ROW EXECUTE FUNCTION recruitment.update_updated_at_column();


--
-- Name: application_documents application_documents_application_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.application_documents
    ADD CONSTRAINT application_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES recruitment.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: application_stages application_stages_application_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.application_stages
    ADD CONSTRAINT application_stages_application_id_fkey FOREIGN KEY (application_id) REFERENCES recruitment.applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON DELETE CASCADE;


--
-- Name: applications applications_resume_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES recruitment.resumes(id) ON DELETE SET NULL;


--
-- Name: companies companies_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.companies
    ADD CONSTRAINT companies_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES recruitment.users(id) ON DELETE SET NULL;


--
-- Name: company_benefits company_benefits_company_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_benefits
    ADD CONSTRAINT company_benefits_company_id_fkey FOREIGN KEY (company_id) REFERENCES recruitment.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_cultures company_cultures_company_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_cultures
    ADD CONSTRAINT company_cultures_company_id_fkey FOREIGN KEY (company_id) REFERENCES recruitment.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_details company_details_company_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_details
    ADD CONSTRAINT company_details_company_id_fkey FOREIGN KEY (company_id) REFERENCES recruitment.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_details company_details_headquarters_location_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.company_details
    ADD CONSTRAINT company_details_headquarters_location_id_fkey FOREIGN KEY (headquarters_location_id) REFERENCES recruitment.locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: connection_interests connection_interests_candidate_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: connection_interests connection_interests_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: connection_interests connection_interests_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES recruitment.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_benefits job_benefits_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_benefits
    ADD CONSTRAINT job_benefits_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_posts_history job_posts_history_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_posts_history
    ADD CONSTRAINT job_posts_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE RESTRICT;


--
-- Name: job_requirements job_requirements_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_requirements
    ADD CONSTRAINT job_requirements_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_skills job_skills_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_skills
    ADD CONSTRAINT job_skills_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: job_skills job_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_skills
    ADD CONSTRAINT job_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES recruitment.skills(id) ON DELETE CASCADE;


--
-- Name: job_tags job_tags_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_tags
    ADD CONSTRAINT job_tags_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: job_tags job_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_tags
    ADD CONSTRAINT job_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES recruitment.tags(id) ON DELETE CASCADE;


--
-- Name: job_views job_views_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_views job_views_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_views job_views_referrer_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_referrer_job_id_fkey FOREIGN KEY (referrer_job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: job_work_arrangements job_work_arrangements_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_work_arrangements
    ADD CONSTRAINT job_work_arrangements_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES recruitment.companies(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_location_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.jobs
    ADD CONSTRAINT jobs_location_id_fkey FOREIGN KEY (location_id) REFERENCES recruitment.locations(id) ON DELETE SET NULL;


--
-- Name: locations locations_parent_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.locations
    ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES recruitment.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: profile_awards profile_awards_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_awards
    ADD CONSTRAINT profile_awards_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profile_certifications profile_certifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_certifications
    ADD CONSTRAINT profile_certifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profile_educations profile_educations_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_educations
    ADD CONSTRAINT profile_educations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profile_experiences profile_experiences_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_experiences
    ADD CONSTRAINT profile_experiences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profile_skills profile_skills_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_skills
    ADD CONSTRAINT profile_skills_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: profile_skills profile_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profile_skills
    ADD CONSTRAINT profile_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES recruitment.skills(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_location_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profiles
    ADD CONSTRAINT profiles_location_id_fkey FOREIGN KEY (location_id) REFERENCES recruitment.locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: resumes resumes_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.resumes
    ADD CONSTRAINT resumes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.saved_jobs
    ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.saved_jobs
    ADD CONSTRAINT saved_jobs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_profile_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.search_history
    ADD CONSTRAINT search_history_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES recruitment.profiles(id) ON DELETE CASCADE;


--
-- Name: user_tokens user_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_tokens
    ADD CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QClcTsXLEdqFHPDrSNRq53j82Kd2zAbjiJsKGzOWk9KTx3WLNib9AKuUd8mfs5Q

