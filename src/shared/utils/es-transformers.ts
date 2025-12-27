/**
 * Elasticsearch Document Transformers
 * Convert database entities to Elasticsearch documents
 */

/**
 * Transform job data to ES document
 */
export function jobToESDoc(job: any) {
  // Extract skills from job_skills relation
  const skills = job.job_skills?.map((js: any) => js.skills?.name).filter(Boolean) || []

  return {
    id: job.id,
    title: job.title || '',
    description: job.description || '',
    company_id: job.company_id,
    company_name: job.companies?.name || '',
    location_id: job.location_id,
    location_name: job.locations?.name || '',
    salary_range: job.salary_range ? JSON.stringify(job.salary_range) : null,
    salary_min: job.salary_range?.min || null,
    salary_max: job.salary_range?.max || null,
    job_type: job.job_type,
    experience_level: job.experience_level,
    status: job.status,
    posted_at: job.posted_at,
    expires_at: job.expires_at,
    skills: skills,
    tags: [] // TODO: Extract from job_tags if needed
  }
}

/**
 * Transform profile data to ES document
 */
export function profileToESDoc(profile: any) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    full_name: profile.full_name || '',
    display_name: profile.display_name || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    desired_job_title: profile.desired_job_title,
    desired_salary_min: profile.desired_salary_min,
    desired_salary_max: profile.desired_salary_min, // Use min as max if no max field
    years_of_experience: profile.years_of_experience || 0,
    skills: profile.skills?.map((ps: any) => ps.skills?.name).filter(Boolean) || [],
    location_id: profile.location_id,
    location_text: profile.location_text || '',
    is_looking_for_job: profile.is_looking_for_job || false,
    last_active_at: new Date()
  }
}

/**
 * Transform company data to ES document
 */
export function companyToESDoc(company: any) {
  return {
    id: company.id,
    name: company.name || '',
    description: company.description || '',
    size: company.size,
    location: company.location || '',
    website: company.website,
    industry: company.industry,
    headquarters_location: company.headquarters_location?.name || '',
    employee_count_min: company.company_details?.employee_count_min,
    employee_count_max: company.company_details?.employee_count_max,
    founded_year: company.company_details?.founded_year,
    company_type: company.company_details?.company_type,
    revenue_range: company.company_details?.revenue_range
  }
}

/**
 * Transform application data to ES document
 */
export function applicationToESDoc(application: any) {
  // Extract salary range if available
  const extractSalaryMin = (salaryRange?: any) => {
    if (!salaryRange || typeof salaryRange !== 'object') return null
    return salaryRange.min || null
  }

  const extractSalaryMax = (salaryRange?: any) => {
    if (!salaryRange || typeof salaryRange !== 'object') return null
    return salaryRange.max || null
  }

  return {
    id: application.id,
    job_id: application.job_id,
    profile_id: application.profile_id,
    user_id: application.profiles?.user_id,
    status: application.status,
    applied_at: application.applied_at,
    first_viewed_at: application.first_viewed_at,
    last_viewed_at: application.last_viewed_at,
    view_count: application.view_count || 0,

    // Job info
    job_title: application.jobs?.title || '',
    job_company_name: application.jobs?.companies?.name || '',
    job_location: application.jobs?.locations?.name || '',
    job_type: application.jobs?.job_type,
    job_salary_min: extractSalaryMin(application.jobs?.salary_range),
    job_salary_max: extractSalaryMax(application.jobs?.salary_range),

    // Candidate info
    candidate_name: application.profiles?.display_name || application.profiles?.full_name || '',
    candidate_email: application.profiles?.users?.email || '',
    candidate_headline: application.profiles?.headline || '',
    candidate_location: application.profiles?.location_text || '',
    candidate_years_experience: application.profiles?.years_of_experience || 0,
    candidate_desired_salary_min: application.profiles?.desired_salary_min,
    candidate_desired_salary_max: application.profiles?.desired_salary_min, // Use min as max if no max
    candidate_skills: application.profiles?.skills?.map((s: any) => s.skills?.name).filter(Boolean) || [],
    candidate_education: application.profiles?.educations?.map((e: any) => e.degree).filter(Boolean) || [],

    // Status tracking
    last_updated: new Date()
  }
}
