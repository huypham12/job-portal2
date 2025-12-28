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

  // Extract job requirements
  const jobRequirementsTitles = job.job_requirements?.map((req: any) => req.title).filter(Boolean) || []
  const jobRequirementsYearsExp = job.job_requirements?.map((req: any) => req.years_experience).filter(Boolean) || []
  const maxRequiredExperience = jobRequirementsYearsExp.length > 0 ? Math.max(...jobRequirementsYearsExp) : null

  // Extract job categories
  const jobCategories = job.job_categories?.map((jc: any) => jc.categories?.name).filter(Boolean) || []
  const jobCategoryTypes = job.job_categories?.map((jc: any) => jc.categories?.type).filter(Boolean) || []

  // Extract job benefits
  const jobBenefitsTypes = job.job_benefits?.map((benefit: any) => benefit.benefit_type).filter(Boolean) || []
  const jobBenefitsValues = job.job_benefits?.map((benefit: any) => benefit.value_amount).filter(Boolean) || []

  // Location hierarchy - separate fields for better search
  const province = job.locations?.parent?.name || ''
  const district = job.locations?.name || ''

  return {
    id: job.id,
    title: job.title || '',
    description: job.description || '',
    company_id: job.company_id,
    company_name: job.companies?.name || '',
    company_size: job.companies?.size || null,
    location_id: job.location_id,
    location_name: job.locations?.name || '',
    // New location fields for hierarchical search
    location_province: province,
    location_district: district,
    location_combined: [province, district].filter(Boolean).join(' - '),
    salary_range: job.salary_range ? JSON.stringify(job.salary_range) : null,
    salary_min: job.salary_range?.min || null,
    salary_max: job.salary_range?.max || null,
    job_type: job.job_type,
    experience_level: job.experience_level,
    status: job.status,
    posted_at: job.posted_at,
    expires_at: job.expires_at,
    skills: skills,
    tags: [], // TODO: Extract from job_tags if needed

    // New fields for enhanced matching
    job_requirements_title: jobRequirementsTitles.join(' '), // Concatenate for full-text search
    job_requirements_years_experience: maxRequiredExperience,
    job_requirements_is_required: job.job_requirements?.some((req: any) => req.is_required) || false,

    // Work arrangements
    is_remote_allowed: job.job_work_arrangements?.is_remote_allowed || false,
    flexible_hours: job.job_work_arrangements?.flexible_hours || false,
    remote_percentage: job.job_work_arrangements?.remote_percentage || 0,
    travel_requirement: job.job_work_arrangements?.travel_requirement || null,

    // Categories and benefits
    job_category: jobCategories,
    job_category_type: jobCategoryTypes,
    job_benefits_type: jobBenefitsTypes,
    job_benefits_value_amount: jobBenefitsValues.length > 0 ? Math.max(...jobBenefitsValues) : null
  }
}

/**
 * Transform profile data to ES document
 */
export function profileToESDoc(profile: any) {
  // Transform skills to nested structure with proficiency and categories
  const skillsNested = profile.skills?.map((ps: any) => ({
    name: ps.skills?.name || '',
    proficiency: ps.proficiency || 1,
    level: ps.level || null,
    category: ps.skills?.category?.name || null,
    category_type: ps.skills?.category?.type || null
  })).filter((skill: any) => skill.name) || []

  // Flat skills array for simple queries
  const skillsFlat = skillsNested.map((skill: any) => skill.name)

  // Education data
  const educationDegrees = profile.educations?.map((edu: any) => edu.degree).filter(Boolean) || []
  const educationFields = profile.educations?.map((edu: any) => edu.field_of_study).filter(Boolean) || []

  // Current employment status
  const currentEmployment = profile.experiences?.some((exp: any) => exp.is_current) || false

  // Certifications skills
  const certificationsSkills = profile.certifications?.flatMap((cert: any) =>
    (cert.skills_acquired || '').split(',').map((s: string) => s.trim())
  ).filter(Boolean) || []

  return {
    id: profile.id,
    user_id: profile.user_id,
    full_name: profile.full_name || '',
    display_name: profile.display_name || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    desired_job_title: profile.desired_job_title,
    desired_salary_min: profile.desired_salary_min,
    desired_salary_max: profile.desired_salary_max || profile.desired_salary_min, // Use min as max if no max field
    years_of_experience: profile.years_of_experience || 0,
    skills: skillsNested, // Nested structure for advanced queries
    skills_flat: skillsFlat, // Flat array for simple queries
    location_id: profile.location_id,
    location_text: profile.location_text || '',
    is_looking_for_job: profile.is_looking_for_job || false,
    last_active_at: new Date(),

    // New fields for enhanced matching
    education_degree: educationDegrees,
    education_field_of_study: educationFields.join(' '), // Concatenate for search
    certifications_skills_acquired: certificationsSkills.join(' '), // Concatenate for search
    current_employment: currentEmployment
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

  // Transform candidate skills to nested structure
  const candidateSkillsNested = application.profiles?.skills?.map((ps: any) => ({
    name: ps.skills?.name || '',
    proficiency: ps.proficiency || 1,
    category: ps.skills?.category?.name || null
  })).filter((skill: any) => skill.name) || []

  const candidateSkillsFlat = candidateSkillsNested.map((skill: any) => skill.name)

  // Calculate timeline analytics
  const now = new Date()
  const appliedAt = new Date(application.applied_at)
  const firstViewedAt = application.first_viewed_at ? new Date(application.first_viewed_at) : null
  const lastViewedAt = application.last_viewed_at ? new Date(application.last_viewed_at) : null

  const daysSinceApplied = Math.floor((now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceFirstViewed = firstViewedAt ? Math.floor((now.getTime() - firstViewedAt.getTime()) / (1000 * 60 * 60 * 24)) : null
  const daysSinceLastViewed = lastViewedAt ? Math.floor((now.getTime() - lastViewedAt.getTime()) / (1000 * 60 * 60 * 24)) : null

  // Application stages data
  const currentStage = application.application_stages?.find((stage: any) => stage.status === 'in_progress' || stage.status === 'scheduled')
  const completedStagesCount = application.application_stages?.filter((stage: any) => stage.completed_at).length || 0
  const totalStagesCount = application.application_stages?.length || 0

  // Calculate average rating from stages
  const ratings = application.application_stages?.map((stage: any) => stage.rating).filter(Boolean) || []
  const averageRating = ratings.length > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : null

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

    // Enhanced Job info with requirements
    job_title: application.jobs?.title || '',
    job_company_name: application.jobs?.companies?.name || '',
    job_location: application.jobs?.locations?.name || '',
    job_type: application.jobs?.job_type,
    job_salary_min: extractSalaryMin(application.jobs?.salary_range),
    job_salary_max: extractSalaryMax(application.jobs?.salary_range),
    job_experience_level: application.jobs?.experience_level,
    job_is_remote_allowed: application.jobs?.job_work_arrangements?.is_remote_allowed || false,
    job_requirements_years_experience: application.jobs?.job_requirements?.reduce((max: number, req: any) =>
      Math.max(max, req.years_experience || 0), 0) || null,

    // Enhanced Candidate info with nested skills
    candidate_name: application.profiles?.display_name || application.profiles?.full_name || '',
    candidate_email: application.profiles?.users?.email || '',
    candidate_headline: application.profiles?.headline || '',
    candidate_location: application.profiles?.location_text || '',
    candidate_years_experience: application.profiles?.years_of_experience || 0,
    candidate_desired_salary_min: application.profiles?.desired_salary_min,
    candidate_desired_salary_max: application.profiles?.desired_salary_max || application.profiles?.desired_salary_min,
    candidate_skills: candidateSkillsNested, // Nested structure
    candidate_skills_flat: candidateSkillsFlat, // Flat for simple queries
    candidate_education: application.profiles?.educations?.map((e: any) => e.degree).filter(Boolean) || [],
    candidate_current_employment: application.profiles?.experiences?.some((exp: any) => exp.is_current) || false,

    // Detailed Application stages
    current_stage_name: currentStage?.stage_name || null,
    current_stage_status: currentStage?.status || null,
    stages_count: totalStagesCount,
    completed_stages_count: completedStagesCount,
    average_rating: averageRating,
    has_rating: ratings.length > 0,

    // Timeline analytics
    days_since_applied: daysSinceApplied,
    days_since_first_viewed: daysSinceFirstViewed,
    days_since_last_viewed: daysSinceLastViewed,
    total_view_time: application.view_count * 30, // Estimated 30 seconds per view

    // Status flags
    has_notes: (application.application_stages?.some((stage: any) => stage.interviewer_notes || stage.candidate_feedback)) || false,
    is_shortlisted: application.status === 'interviewing' || application.status === 'offered',
    is_withdrawn: application.is_withdrawn || false,

    // Tracking
    last_updated: new Date()
  }
}
