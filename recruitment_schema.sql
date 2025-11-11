--
-- PostgreSQL database dump
--

\restrict iEtxsRSwZxYzfk0SibSeV2aahW126XjAMep7Mtlxmne8Lv4P5aGfVZ0VmtpvZoY

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
    -- Check if there's already a view for this user/job in the last hour
    IF EXISTS (
        SELECT 1 FROM job_views
        WHERE user_id = NEW.user_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour')
    ) THEN
        -- Update the existing record instead of inserting
        UPDATE job_views
        SET viewed_at = NEW.viewed_at,
            duration_seconds = GREATEST(duration_seconds, NEW.duration_seconds),
            source = NEW.source
        WHERE user_id = NEW.user_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour');

        -- Return NULL to prevent the insert
        RETURN NULL;
    END IF;

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
-- Name: applications; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    resume_id uuid,
    status recruitment.application_status DEFAULT 'pending'::recruitment.application_status,
    applied_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb,
    version integer DEFAULT 1
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
    metadata jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE recruitment.companies OWNER TO postgres;

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
-- Name: job_similarities; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.job_similarities (
    job1_id uuid NOT NULL,
    job2_id uuid NOT NULL,
    similarity_score numeric(5,4) NOT NULL,
    similarity_type text DEFAULT 'hybrid'::text NOT NULL,
    calculated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_job_order CHECK ((job1_id < job2_id)),
    CONSTRAINT check_similarity_score CHECK (((similarity_score >= (0)::numeric) AND (similarity_score <= (1)::numeric))),
    CONSTRAINT check_similarity_type CHECK ((similarity_type = ANY (ARRAY['content'::text, 'skill'::text, 'behavior'::text, 'location'::text, 'hybrid'::text])))
);


ALTER TABLE recruitment.job_similarities OWNER TO postgres;

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
    user_id uuid,
    job_id uuid NOT NULL,
    viewed_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    duration_seconds integer,
    source text DEFAULT 'direct'::text,
    referrer_job_id uuid,
    CONSTRAINT check_source CHECK ((source = ANY (ARRAY['search'::text, 'recommendation'::text, 'direct'::text, 'connection'::text])))
);


ALTER TABLE recruitment.job_views OWNER TO postgres;

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
    deleted boolean DEFAULT false
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
    count(DISTINCT jv.user_id) AS unique_viewers,
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
    user_id uuid NOT NULL,
    search_query jsonb NOT NULL,
    search_type text NOT NULL,
    searched_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    clicked_jobs jsonb DEFAULT '[]'::jsonb,
    filters_used jsonb DEFAULT '{}'::jsonb,
    result_count integer DEFAULT 0,
    session_id uuid
);


ALTER TABLE recruitment.search_history OWNER TO postgres;

--
-- Name: mv_report_search_analytics; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_search_analytics AS
 SELECT date_trunc('day'::text, searched_at) AS report_day,
    search_type,
    count(id) AS total_searches,
    count(DISTINCT user_id) AS unique_searchers,
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
-- Name: user_preferences; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preference_type text NOT NULL,
    preference_value jsonb NOT NULL,
    weight numeric(3,2) DEFAULT 1.0,
    source text DEFAULT 'explicit'::text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_preference_type CHECK ((preference_type = ANY (ARRAY['salary_range'::text, 'location'::text, 'job_type'::text, 'company_size'::text, 'skills'::text, 'industry'::text]))),
    CONSTRAINT check_source_type CHECK ((source = ANY (ARRAY['explicit'::text, 'implicit'::text, 'inferred'::text]))),
    CONSTRAINT check_weight CHECK (((weight >= (0)::numeric) AND (weight <= (1)::numeric)))
);


ALTER TABLE recruitment.user_preferences OWNER TO postgres;

--
-- Name: mv_report_user_preferences; Type: MATERIALIZED VIEW; Schema: recruitment; Owner: postgres
--

CREATE MATERIALIZED VIEW recruitment.mv_report_user_preferences AS
 SELECT preference_type,
    source,
    count(id) AS users_count,
    avg(weight) AS avg_weight,
    count(
        CASE
            WHEN (source = 'explicit'::text) THEN 1
            ELSE NULL::integer
        END) AS explicit_count,
    count(
        CASE
            WHEN (source = 'implicit'::text) THEN 1
            ELSE NULL::integer
        END) AS implicit_count,
    count(
        CASE
            WHEN (source = 'inferred'::text) THEN 1
            ELSE NULL::integer
        END) AS inferred_count
   FROM recruitment.user_preferences up
  GROUP BY preference_type, source
  WITH NO DATA;


ALTER MATERIALIZED VIEW recruitment.mv_report_user_preferences OWNER TO postgres;

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
-- Name: profiles; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text,
    phone text,
    location_id uuid,
    metadata jsonb,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
    user_id uuid NOT NULL,
    content jsonb,
    file_url text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    saved_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: user_skills; Type: TABLE; Schema: recruitment; Owner: postgres
--

CREATE TABLE recruitment.user_skills (
    user_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency integer
);


ALTER TABLE recruitment.user_skills OWNER TO postgres;

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
-- Name: connection_interests connection_interests_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_pkey PRIMARY KEY (id);


--
-- Name: job_posts_history job_posts_history_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_posts_history
    ADD CONSTRAINT job_posts_history_pkey PRIMARY KEY (id);


--
-- Name: job_similarities job_similarities_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_similarities
    ADD CONSTRAINT job_similarities_pkey PRIMARY KEY (job1_id, job2_id, similarity_type);


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
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (user_id, skill_id);


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
-- Name: connection_interests_candidate_id_recruiter_id_job_id_inter_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX connection_interests_candidate_id_recruiter_id_job_id_inter_key ON recruitment.connection_interests USING btree (candidate_id, recruiter_id, job_id, interest_type);


--
-- Name: gin_profiles_metadata; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX gin_profiles_metadata ON recruitment.profiles USING gin (metadata jsonb_path_ops);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_activity_logs_user ON recruitment.activity_logs USING btree (user_id);


--
-- Name: idx_applications_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_job ON recruitment.applications USING btree (job_id);


--
-- Name: idx_applications_user_job; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_applications_user_job ON recruitment.applications USING btree (user_id, job_id);


--
-- Name: idx_attachments_owner; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_attachments_owner ON recruitment.attachments USING btree (owner_type, owner_id);


--
-- Name: idx_audits_table_record; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_audits_table_record ON recruitment.audits USING btree (table_name, record_id);


--
-- Name: idx_connection_interests_candidate_status; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_candidate_status ON recruitment.connection_interests USING btree (candidate_id, status, created_at DESC);


--
-- Name: idx_connection_interests_contact_info_gin; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_connection_interests_contact_info_gin ON recruitment.connection_interests USING gin (contact_info);


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
-- Name: idx_job_similarities_lookup; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_similarities_lookup ON recruitment.job_similarities USING btree (job1_id, similarity_score DESC, similarity_type);


--
-- Name: idx_job_similarities_reverse; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_similarities_reverse ON recruitment.job_similarities USING btree (job2_id, similarity_score DESC, similarity_type);


--
-- Name: idx_job_views_job_analytics; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_views_job_analytics ON recruitment.job_views USING btree (job_id, viewed_at DESC, duration_seconds);


--
-- Name: idx_job_views_recommendation; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_views_recommendation ON recruitment.job_views USING btree (referrer_job_id, job_id);


--
-- Name: idx_job_views_user_behavior; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_job_views_user_behavior ON recruitment.job_views USING btree (user_id, viewed_at DESC, source);


--
-- Name: idx_jobs_company; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_company ON recruitment.jobs USING btree (company_id);


--
-- Name: idx_jobs_location; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_location ON recruitment.jobs USING btree (location_id);


--
-- Name: idx_jobs_posted_at; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_jobs_posted_at ON recruitment.jobs USING btree (posted_at);


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
-- Name: idx_mv_user_preferences_type_source; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_user_preferences_type_source ON recruitment.mv_report_user_preferences USING btree (preference_type, source);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON recruitment.notifications USING btree (user_id, read, sent_at DESC);


--
-- Name: idx_profiles_user; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_profiles_user ON recruitment.profiles USING btree (user_id);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON recruitment.refresh_tokens USING btree (user_id);


--
-- Name: idx_resumes_user; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_resumes_user ON recruitment.resumes USING btree (user_id);


--
-- Name: idx_search_history_analytics; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_analytics ON recruitment.search_history USING btree (search_type, searched_at DESC, result_count);


--
-- Name: idx_search_history_clicked_jobs_gin; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_clicked_jobs_gin ON recruitment.search_history USING gin (clicked_jobs);


--
-- Name: idx_search_history_filters_gin; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_filters_gin ON recruitment.search_history USING gin (filters_used);


--
-- Name: idx_search_history_session; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_session ON recruitment.search_history USING btree (user_id, session_id, searched_at);


--
-- Name: idx_search_history_user_time; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_search_history_user_time ON recruitment.search_history USING btree (user_id, searched_at DESC);


--
-- Name: idx_user_preferences_lookup; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_preferences_lookup ON recruitment.user_preferences USING btree (user_id, preference_type, weight DESC);


--
-- Name: idx_user_preferences_type; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_preferences_type ON recruitment.user_preferences USING btree (preference_type, weight DESC);


--
-- Name: idx_user_preferences_value_gin; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX idx_user_preferences_value_gin ON recruitment.user_preferences USING gin (preference_value);


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
-- Name: locations_type_idx; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX locations_type_idx ON recruitment.locations USING btree (type);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON recruitment.refresh_tokens USING btree (token_hash);


--
-- Name: roles_permissions_role_permission_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX roles_permissions_role_permission_key ON recruitment.roles_permissions USING btree (role, permission);


--
-- Name: saved_jobs_user_id_job_id_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX saved_jobs_user_id_job_id_key ON recruitment.saved_jobs USING btree (user_id, job_id);


--
-- Name: skills_name_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX skills_name_key ON recruitment.skills USING btree (name);


--
-- Name: tags_name_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX tags_name_key ON recruitment.tags USING btree (name);


--
-- Name: trigram_users_email; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE INDEX trigram_users_email ON recruitment.users USING gist (email recruitment.gist_trgm_ops);


--
-- Name: user_preferences_user_id_preference_type_key; Type: INDEX; Schema: recruitment; Owner: postgres
--

CREATE UNIQUE INDEX user_preferences_user_id_preference_type_key ON recruitment.user_preferences USING btree (user_id, preference_type);


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
-- Name: user_preferences set_user_preferences_timestamp; Type: TRIGGER; Schema: recruitment; Owner: postgres
--

CREATE TRIGGER set_user_preferences_timestamp BEFORE UPDATE ON recruitment.user_preferences FOR EACH ROW EXECUTE FUNCTION recruitment.trigger_set_timestamp();


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
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_resume_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES recruitment.resumes(id) ON DELETE SET NULL;


--
-- Name: applications applications_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: companies companies_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.companies
    ADD CONSTRAINT companies_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES recruitment.users(id) ON DELETE SET NULL;


--
-- Name: connection_interests connection_interests_candidate_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.connection_interests
    ADD CONSTRAINT connection_interests_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES recruitment.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: job_posts_history job_posts_history_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_posts_history
    ADD CONSTRAINT job_posts_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE RESTRICT;


--
-- Name: job_similarities job_similarities_job1_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_similarities
    ADD CONSTRAINT job_similarities_job1_id_fkey FOREIGN KEY (job1_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: job_similarities job_similarities_job2_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_similarities
    ADD CONSTRAINT job_similarities_job2_id_fkey FOREIGN KEY (job2_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: job_views job_views_referrer_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_referrer_job_id_fkey FOREIGN KEY (referrer_job_id) REFERENCES recruitment.jobs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: job_views job_views_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.job_views
    ADD CONSTRAINT job_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: profiles profiles_location_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profiles
    ADD CONSTRAINT profiles_location_id_fkey FOREIGN KEY (location_id) REFERENCES recruitment.locations(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: resumes resumes_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.resumes
    ADD CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.saved_jobs
    ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES recruitment.jobs(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.saved_jobs
    ADD CONSTRAINT saved_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES recruitment.skills(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- Name: user_tokens user_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: recruitment; Owner: postgres
--

ALTER TABLE ONLY recruitment.user_tokens
    ADD CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES recruitment.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict iEtxsRSwZxYzfk0SibSeV2aahW126XjAMep7Mtlxmne8Lv4P5aGfVZ0VmtpvZoY

