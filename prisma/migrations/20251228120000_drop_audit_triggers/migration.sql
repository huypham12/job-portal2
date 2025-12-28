-- Drop audit triggers that reference the deleted audits table
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
DROP TRIGGER IF EXISTS audit_jobs_trigger ON jobs;
DROP TRIGGER IF EXISTS audit_applications_trigger ON applications;
DROP TRIGGER IF EXISTS audit_companies_trigger ON companies;

-- Drop the audit function as well
DROP FUNCTION IF EXISTS audit_trigger();
