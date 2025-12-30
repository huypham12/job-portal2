/**
 * Elasticsearch Document Transformers
 * Convert database entities to Elasticsearch documents
 */

/**
 * Transform job data to ES document with enhanced mapping support
 * CRITICAL: Validates recruiter ownership through company before indexing
 */
export function jobToESDoc(job: any) {
  // CRITICAL: Validate ownership - reject if missing recruiter ownership
  if (!job.companies?.recruiter_id) {
    throw new Error(`Job ${job.id} missing recruiter ownership through company - rejecting ES sync`)
  }

  // Validate required fields
  if (!job.id || !job.title) {
    throw new Error(`Job ${job.id} missing required fields (id, title) - rejecting ES sync`)
  }

  // Extract skills with proficiency (enhanced nested structure)
  const skillsNested =
    job.job_skills?.filter((js: any) => js.job_id === job.id && js.skills?.name)?.map((js: any) => ({
      name: js.skills.name,
      category: js.skills.category?.name || null,
      category_type: js.skills.category?.type || null,
      proficiency_required: js.proficiency || 1
    })) || []

  const skillsFlat = skillsNested.map((skill: any) => skill.name)
  const skillsTechnical = skillsNested.filter((skill: any) => skill.category_type === 'technical').map((skill: any) => skill.name)
  const skillsSoft = skillsNested.filter((skill: any) => skill.category_type !== 'technical').map((skill: any) => skill.name)

  // Extract job requirements with enhanced structure
  const jobRequirementsNested = job.job_requirements?.filter((req: any) => req.job_id === job.id) || []
  const jobRequirementsTitles = jobRequirementsNested.map((req: any) => req.title).filter(Boolean)
  const jobRequirementsYearsExp = jobRequirementsNested.map((req: any) => req.years_experience).filter(Boolean)
  const maxRequiredExperience = jobRequirementsYearsExp.length > 0 ? Math.max(...jobRequirementsYearsExp) : null
  const minRequiredExperience = jobRequirementsYearsExp.length > 0 ? Math.min(...jobRequirementsYearsExp) : null

  // Extract job categories with enhanced structure
  const jobCategoriesNested =
    job.job_categories
      ?.filter((jc: any) => jc.job_id === job.id && jc.categories?.name)
      ?.map((jc: any) => ({
        category_id: jc.categories.id,
        name: jc.categories.name,
        type: jc.categories.type
      })) || []

  const jobCategories = jobCategoriesNested.map((jc: any) => jc.name)
  const jobCategoryTypes = jobCategoriesNested.map((jc: any) => jc.type)

  // Extract job benefits with enhanced structure
  const jobBenefitsNested = job.job_benefits?.filter((benefit: any) => benefit.job_id === job.id) || []
  const jobBenefitsTypes = jobBenefitsNested.map((benefit: any) => benefit.benefit_type).filter(Boolean)
  const jobBenefitsValues = jobBenefitsNested.map((benefit: any) => benefit.value_amount).filter(Boolean)

  // Location hierarchy with safety checks
  const province = job.locations?.parent?.name || ''
  const district = job.locations?.name || ''

  // Company details extraction
  const companyIndustry = job.companies?.company_details?.industry || null
  const companySize = job.companies?.size || null

  return {
    // Core job info
    id: `job_${job.id}`,
    job_id: job.id,
    title: job.title || '',
    description: job.description || '',

    // Company relationship
    company_id: job.company_id,
    company_name: job.companies?.name || '',
    company_size: companySize,
    company_industry: companyIndustry,

    // Ownership information - validated above, guaranteed not null
    recruiter_id: job.companies.recruiter_id,
    recruiter_role: job.companies.users?.role || 'recruiter',

    // Location hierarchy
    location_id: job.location_id,
    location_name: job.locations?.name || '',
    location_province: province,
    location_district: district,
    location_combined: [province, district].filter(Boolean).join(' - '),

    // Salary & job details
    salary_range: job.salary_range ? JSON.stringify(job.salary_range) : null,
    salary_min: job.salary_range?.min || null,
    salary_max: job.salary_range?.max || null,
    job_type: job.job_type,
    experience_level: job.experience_level,

    // Job requirements (enhanced)
    job_requirements: jobRequirementsNested,
    min_experience_years: minRequiredExperience,
    max_experience_years: maxRequiredExperience,
    job_requirements_title: jobRequirementsTitles.join(' '),
    job_requirements_years_experience: maxRequiredExperience,
    job_requirements_is_required: jobRequirementsNested.some((req: any) => req.is_required),

    // Skills (enhanced nested structure)
    skills: skillsNested,
    skills_flat: skillsFlat,
    skills_technical: skillsTechnical,
    skills_soft: skillsSoft,

    // Work arrangements
    is_remote_allowed: job.job_work_arrangements?.is_remote_allowed || false,
    flexible_hours: job.job_work_arrangements?.flexible_hours || false,
    remote_percentage: job.job_work_arrangements?.remote_percentage || 0,
    travel_requirement: job.job_work_arrangements?.travel_requirement || null,
    overtime_expected: job.job_work_arrangements?.overtime_expected || false,
    shift_type: job.job_work_arrangements?.shift_type || null,

    // Categories and benefits (enhanced)
    job_categories: jobCategoriesNested,
    job_category: jobCategories,
    job_category_type: jobCategoryTypes,
    job_benefits: jobBenefitsNested,
    job_benefits_type: jobBenefitsTypes,
    job_benefits_value_amount: jobBenefitsValues.length > 0 ? Math.max(...jobBenefitsValues) : null,

    // Status & dates
    status: job.status,
    posted_at: job.posted_at,
    expires_at: job.expires_at,
    updated_at: job.updated_at,

    // Metadata
    metadata: job.metadata,
    version: job.version
  }
}

/**
 * Transform profile data to ES document with enhanced mapping support
 * CRITICAL: Validates user ownership before indexing
 */
export function profileToESDoc(profile: any) {
  // CRITICAL: Validate user ownership - reject if missing
  if (!profile.user_id) {
    throw new Error(`Profile ${profile.id} missing user ownership - rejecting ES sync`)
  }

  // Validate required fields
  if (!profile.id || !profile.user_id) {
    throw new Error(`Profile ${profile.id} missing required fields (id, user_id) - rejecting ES sync`)
  }

  // Transform skills with enhanced structure
  const skillsNested =
    profile.skills
      ?.filter((ps: any) => ps.profile_id === profile.id && ps.skills?.name)
      ?.map((ps: any) => ({
        name: ps.skills.name,
        proficiency: ps.proficiency || 1,
        level: ps.level || null,
        category: ps.skills.category?.name || null,
        category_type: ps.skills.category?.type || null
      })) || []

  const skillsFlat = skillsNested.map((skill: any) => skill.name)
  const skillsTechnical = skillsNested.filter((skill: any) => skill.category_type === 'technical').map((skill: any) => skill.name)
  const skillsSoft = skillsNested.filter((skill: any) => skill.category_type !== 'technical').map((skill: any) => skill.name)

  // Education data with enhanced structure
  const educationsNested = profile.educations?.filter((edu: any) => edu.profile_id === profile.id) || []
  const educationDegrees = educationsNested.map((edu: any) => edu.degree).filter(Boolean)
  const educationFields = educationsNested.map((edu: any) => edu.field_of_study).filter(Boolean)

  // Experience data with enhanced structure
  const experiencesNested = profile.experiences?.filter((exp: any) => exp.profile_id === profile.id) || []
  const currentEmployment = experiencesNested.some((exp: any) => exp.is_current)

  // Certifications with enhanced structure
  const certificationsNested = profile.certifications?.filter((cert: any) => cert.profile_id === profile.id) || []
  const certificationsSkills = certificationsNested
    .flatMap((cert: any) => (cert.skills_acquired || '').split(',').map((s: string) => s.trim()))
    .filter(Boolean)

  // Location hierarchy extraction
  const locationProvince = profile.locations?.parent?.name || null
  const locationDistrict = profile.locations?.name || null

  // Preferences extraction
  const desiredJobType = profile.desired_job_type || []
  const desiredBenefits = profile.desired_benefits || []
  const preferredCategories = profile.preferred_categories || []

  return {
    // Core profile info
    id: `profile_${profile.id}`,
    profile_id: profile.id,
    user_id: profile.user_id,
    user_role: profile.users?.role || 'candidate',

    full_name: profile.full_name || '',
    display_name: profile.display_name || '',
    headline: profile.headline || '',
    bio: profile.bio || '',

    // Job preferences
    desired_job_title: profile.desired_job_title,
    desired_salary_min: profile.desired_salary_min,
    desired_salary_max: profile.desired_salary_max || profile.desired_salary_min,
    desired_job_type: desiredJobType,
    desired_benefits: desiredBenefits,
    preferred_categories: preferredCategories,

    // Experience & Education
    years_of_experience: profile.years_of_experience || 0,
    current_employment: currentEmployment,
    is_looking_for_job: profile.is_looking_for_job || false,

    // Skills (enhanced nested structure)
    skills: skillsNested,
    skills_flat: skillsFlat,
    skills_technical: skillsTechnical,
    skills_soft: skillsSoft,

    // Education (enhanced nested structure)
    educations: educationsNested,
    education_degree: educationDegrees,
    education_field_of_study: educationFields.join(' '),

    // Experience (enhanced nested structure)
    experiences: experiencesNested,

    // Certifications (enhanced nested structure)
    certifications: certificationsNested,
    certifications_skills_acquired: certificationsSkills.join(' '),

    // Location
    location_id: profile.location_id,
    location_text: profile.location_text || '',
    location_province: locationProvince,
    location_district: locationDistrict,

    // Work preferences
    prefers_remote: profile.prefers_remote || false,
    prefers_flexible_hours: profile.prefers_flexible_hours || false,

    // Activity tracking
    last_active_at: profile.last_active_at || new Date(),
    updated_at: profile.updated_at,
    created_at: profile.created_at
  }
}

/**
 * Transform company data to ES document with enhanced mapping support
 * CRITICAL: Validates direct recruiter ownership before indexing
 */
export function companyToESDoc(company: any) {
  // CRITICAL: Validate direct ownership - reject if missing
  if (!company.recruiter_id) {
    throw new Error(`Company ${company.id} missing recruiter ownership - rejecting ES sync`)
  }

  // Validate required fields
  if (!company.id || !company.name) {
    throw new Error(`Company ${company.id} missing required fields (id, name) - rejecting ES sync`)
  }

  // Extract company details
  const companyDetails = company.company_details || {}

  return {
    // Core company info
    id: `company_${company.id}`,
    company_id: company.id,
    name: company.name || '',
    description: company.description || '',

    // Ownership
    recruiter_id: company.recruiter_id,
    recruiter_role: company.users?.role || 'recruiter',

    // Company details
    industry: companyDetails.industry || company.industry,
    size: company.size,
    founded_year: companyDetails.founded_year,
    employee_count_min: companyDetails.employee_count_min,
    employee_count_max: companyDetails.employee_count_max,
    website_url: companyDetails.website_url || company.website,
    headquarters_location: companyDetails.headquarters_location?.name || company.headquarters_location,

    // Business info
    company_type: companyDetails.company_type,
    revenue_range: companyDetails.revenue_range,
    culture_description: companyDetails.culture_description,

    // Contact info (not indexed for privacy)
    // logo_url, contact_email, contact_phone, etc. are not included for privacy

    // Status & verification
    is_verified: company.is_verified || false,
    status: company.status || 'active',

    // Timestamps
    created_at: company.created_at,
    updated_at: company.updated_at
  }
}

/**
 * Transform application data to ES document
 * CRITICAL: Validates dual ownership (recruiter + candidate) before indexing
 */
export function applicationToESDoc(application: any) {
  // CRITICAL: Validate dual ownership - reject if both paths missing
  const recruiterId = application.jobs?.companies?.recruiter_id
  const candidateId = application.profiles?.user_id

  if (!recruiterId && !candidateId) {
    throw new Error(`Application ${application.id} missing both recruiter and candidate ownership - rejecting ES sync`)
  }

  // Extract salary range if available
  const extractSalaryMin = (salaryRange?: any) => {
    if (!salaryRange || typeof salaryRange !== 'object') return null
    return salaryRange.min || null
  }

  const extractSalaryMax = (salaryRange?: any) => {
    if (!salaryRange || typeof salaryRange !== 'object') return null
    return salaryRange.max || null
  }

  // Transform candidate skills to nested structure with FK validation
  const candidateSkillsNested =
    application.profiles?.skills
      ?.filter((ps: any) => ps.profile_id === application.profile_id && ps.skills?.name)
      ?.map((ps: any) => ({
        name: ps.skills.name,
        proficiency: ps.proficiency || 1,
        category: ps.skills.category?.name || null,
        category_type: ps.skills.category?.type || null
      })) || []

  const candidateSkillsFlat = candidateSkillsNested.map((skill: any) => skill.name)

  // Calculate timeline analytics with safety
  const now = new Date()
  const appliedAt = new Date(application.applied_at)
  const firstViewedAt = application.first_viewed_at ? new Date(application.first_viewed_at) : null
  const lastViewedAt = application.last_viewed_at ? new Date(application.last_viewed_at) : null

  const daysSinceApplied = Math.floor((now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceFirstViewed = firstViewedAt
    ? Math.floor((now.getTime() - firstViewedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const daysSinceLastViewed = lastViewedAt
    ? Math.floor((now.getTime() - lastViewedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Application stages data with safety
  const currentStage = application.application_stages?.find(
    (stage: any) => stage.status === 'in_progress' || stage.status === 'scheduled'
  )
  const completedStagesCount = application.application_stages?.filter((stage: any) => stage.completed_at).length || 0
  const totalStagesCount = application.application_stages?.length || 0

  // Calculate average rating from stages
  const ratings = application.application_stages?.map((stage: any) => stage.rating).filter(Boolean) || []
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : null

  return {
    // ES _id sẽ là application.id (DB id). Trường id trong _source giữ prefix cho mục đích debug.
    id: `application_${application.id}`,
    application_id: application.id,
    job_id: application.job_id,
    profile_id: application.profile_id,
    user_id: application.profiles?.user_id,
    // Dual ownership context - may be null depending on access path
    recruiter_id: recruiterId, // May be null if candidate-owned view
    candidate_id: candidateId, // May be null if recruiter-owned view
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
    job_requirements_years_experience:
      application.jobs?.job_requirements?.reduce(
        (max: number, req: any) => Math.max(max, req.years_experience || 0),
        0
      ) || null,

    // Enhanced Candidate info with nested skills
    candidate_name: application.profiles?.display_name || application.profiles?.full_name || '',
    candidate_email: application.profiles?.users?.email || '',
    candidate_headline: application.profiles?.headline || '',
    candidate_location: application.profiles?.location_text || '',
    candidate_years_experience: application.profiles?.years_of_experience || 0,
    candidate_desired_salary_min: application.profiles?.desired_salary_min,
    candidate_desired_salary_max: application.profiles?.desired_salary_max || application.profiles?.desired_salary_min,
    candidate_skills: candidateSkillsNested, // Nested structure with FK validation
    candidate_skills_flat: candidateSkillsFlat, // Flat for simple queries
    candidate_education:
      application.profiles?.educations
        ?.filter((e: any) => e.profile_id === application.profile_id)
        ?.map((e: any) => e.degree)
        .filter(Boolean) || [],
    candidate_current_employment:
      application.profiles?.experiences
        ?.filter((exp: any) => exp.profile_id === application.profile_id)
        ?.some((exp: any) => exp.is_current) || false,

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
    has_notes:
      application.application_stages?.some((stage: any) => stage.interviewer_notes || stage.candidate_feedback) ||
      false,
    is_shortlisted: application.status === 'interviewing' || application.status === 'offered',
    is_withdrawn: application.is_withdrawn || false,

    // Tracking
    last_updated: new Date()
  }
}
