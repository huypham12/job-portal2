"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedJobs = seedJobs;
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const elasticsearch_sync_service_1 = require("../../src/shared/services/elasticsearch-sync.service");
const prisma = new client_1.PrismaClient();
// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = process.env.DISABLE_ELASTICSEARCH !== 'true';
let isElasticsearchAvailable = false;
// Industry to job mapping logic
function getRelevantJobsForIndustry(industry, allJobs) {
    if (!industry)
        return allJobs.slice(0, 5); // Default fallback
    const industryLower = industry.toLowerCase();
    // Map industries to relevant job keywords
    const industryMappings = {
        'technology': ['Software Engineer', 'Developer', 'IT', 'Tech', 'Engineer', 'Developer', 'Data', 'AI', 'Cloud', 'Cybersecurity'],
        'telecommunications': ['Network', 'Telecom', 'Mobile', 'Communication', 'Infrastructure', 'System'],
        'finance': ['Financial', 'Bank', 'Investment', 'Accounting', 'Finance', 'Analyst', 'Credit'],
        'banking': ['Bank', 'Financial', 'Credit', 'Loan', 'Investment', 'Risk'],
        'healthcare': ['Medical', 'Healthcare', 'Health', 'Clinical', 'Patient', 'Pharma', 'Doctor', 'Nurse'],
        'retail': ['Sales', 'Retail', 'Customer', 'Store', 'Merchandise', 'Shop', 'Commerce'],
        'manufacturing': ['Manufacturing', 'Production', 'Quality', 'Supply Chain', 'Operations', 'Engineering'],
        'education': ['Education', 'Teaching', 'Academic', 'Training', 'Learning', 'School'],
        'consulting': ['Consultant', 'Advisory', 'Strategy', 'Management', 'Business'],
        'marketing': ['Marketing', 'Brand', 'Digital', 'Content', 'Advertising', 'Media'],
        'real estate': ['Real Estate', 'Property', 'Construction', 'Development', 'Housing'],
        'automotive': ['Automotive', 'Car', 'Vehicle', 'Manufacturing', 'Engineering'],
        'food & beverage': ['Food', 'Beverage', 'Restaurant', 'Hospitality', 'Chef', 'Service'],
        'energy': ['Energy', 'Oil', 'Gas', 'Power', 'Renewable', 'Utility'],
        'logistics': ['Logistics', 'Supply Chain', 'Transportation', 'Warehouse', 'Delivery']
    };
    const keywords = industryMappings[industryLower] || ['General', 'Business', 'Management'];
    // Filter jobs that match the industry keywords
    const relevantJobs = allJobs.filter(job => {
        const titleLower = job.title.toLowerCase();
        const descLower = job.description.toLowerCase();
        return keywords.some(keyword => titleLower.includes(keyword.toLowerCase()) ||
            descLower.includes(keyword.toLowerCase()));
    });
    // If we don't have enough relevant jobs, supplement with general jobs
    if (relevantJobs.length < 5) {
        const generalJobs = allJobs.filter(job => !relevantJobs.includes(job));
        relevantJobs.push(...generalJobs.slice(0, 5 - relevantJobs.length));
    }
    return relevantJobs.slice(0, 5);
}
async function seedJobs() {
    console.log('💼 Starting jobs seeding...');
    try {
        // Check Elasticsearch availability
        if (isElasticsearchEnabled) {
            try {
                isElasticsearchAvailable = await Promise.resolve().then(() => __importStar(require('../../src/config/elasticsearch.service'))).then(({ elasticsearchService }) => elasticsearchService.checkConnection());
                if (isElasticsearchAvailable) {
                    console.log('✅ Elasticsearch is available for job sync');
                }
                else {
                    console.log('⚠️  Elasticsearch is not available - sync disabled');
                }
            }
            catch (error) {
                console.log('⚠️  Elasticsearch check failed - sync disabled');
                isElasticsearchAvailable = false;
            }
        }
        // Load data from JSON files
        const jobsPath = path.join(__dirname, 'data', 'jobs.json');
        const jobBenefitsPath = path.join(__dirname, 'data', 'job_benefits.json');
        const jobCategoriesPath = path.join(__dirname, 'data', 'job_categories.json');
        const jobRequirementsPath = path.join(__dirname, 'data', 'job_requirements.json');
        const jobWorkArrangementsPath = path.join(__dirname, 'data', 'job_work_arrangements.json');
        const categoriesPath = path.join(__dirname, 'data', 'categories.json');
        const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
        const jobBenefitsData = JSON.parse(fs.readFileSync(jobBenefitsPath, 'utf-8'));
        const jobCategoriesData = JSON.parse(fs.readFileSync(jobCategoriesPath, 'utf-8'));
        const jobRequirementsData = JSON.parse(fs.readFileSync(jobRequirementsPath, 'utf-8'));
        const jobWorkArrangementsData = JSON.parse(fs.readFileSync(jobWorkArrangementsPath, 'utf-8'));
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
        console.log(`📊 Loaded ${jobsData.length} jobs, ${jobBenefitsData.length} job benefits, ${jobCategoriesData.length} job categories, ${jobRequirementsData.length} job requirements, ${jobWorkArrangementsData.length} work arrangements`);
        // Get all existing companies with their industries
        console.log('🏢 Fetching existing companies...');
        const companies = await prisma.companies.findMany({
            include: {
                company_details: {
                    select: {
                        industry: true,
                        headquarters_location_id: true
                    }
                }
            }
        });
        if (companies.length === 0) {
            throw new Error('No companies found. Please run companies seeding first.');
        }
        console.log(`🏢 Found ${companies.length} companies to create jobs for`);
        // Clear existing job-related data
        console.log('🧹 Clearing existing job data...');
        await prisma.job_views.deleteMany({});
        await prisma.job_skills.deleteMany({});
        await prisma.job_categories.deleteMany({});
        await prisma.job_requirements.deleteMany({});
        await prisma.job_benefits.deleteMany({});
        await prisma.job_work_arrangements.deleteMany({});
        await prisma.saved_jobs.deleteMany({});
        await prisma.connection_interests.deleteMany({});
        await prisma.applications.deleteMany({});
        await prisma.jobs.deleteMany({});
        console.log('✅ Cleared existing job data');
        // Process companies in batches
        const batchSize = 5; // Process 5 companies at a time
        let totalJobsCreated = 0;
        let processedCompanies = 0;
        for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);
            console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)} (${batch.length} companies)`);
            const batchPromises = batch.map(async (company) => {
                try {
                    const industry = company.company_details?.industry || null;
                    const locationId = company.company_details?.headquarters_location_id || null;
                    // Get 5 relevant jobs for this company
                    const relevantJobs = getRelevantJobsForIndustry(industry, jobsData);
                    const companyJobs = await Promise.all(relevantJobs.map(async (jobData, jobIndex) => {
                        // Create job
                        const job = await prisma.jobs.create({
                            data: {
                                title: jobData.title,
                                description: jobData.description,
                                company_id: company.id,
                                location_id: locationId,
                                salary_range: jobData.salary_range,
                                job_type: jobData.job_type,
                                experience_level: jobData.experience_level,
                                posted_at: new Date(jobData.posted_at),
                                expires_at: new Date(jobData.expires_at),
                                status: client_1.job_status.approved,
                                metadata: {
                                    seeded: true,
                                    industry: industry,
                                    batch_index: jobIndex
                                },
                                version: 1,
                                deleted: false,
                                updated_at: new Date()
                            }
                        });
                        // Create job benefits (random selection)
                        const benefitsPerJob = 3;
                        const shuffledBenefits = [...jobBenefitsData].sort(() => 0.5 - Math.random());
                        const selectedBenefits = shuffledBenefits.slice(0, benefitsPerJob);
                        await Promise.all(selectedBenefits.map(benefitData => prisma.job_benefits.create({
                            data: {
                                job_id: job.id,
                                benefit_type: benefitData.benefit_type,
                                title: benefitData.title,
                                description: benefitData.description,
                                value_amount: benefitData.value_amount,
                                value_currency: benefitData.value_currency,
                                created_at: new Date()
                            }
                        })));
                        // Create job categories (random industry categories)
                        const industryCategories = categoriesData.filter(cat => cat.type === 'industry');
                        const categoriesPerJob = 2;
                        const shuffledCategories = [...industryCategories].sort(() => 0.5 - Math.random());
                        const selectedCategories = shuffledCategories.slice(0, categoriesPerJob);
                        await Promise.all(selectedCategories.map(categoryData => prisma.job_categories.create({
                            data: {
                                job_id: job.id,
                                category_id: categoryData.id
                            }
                        })));
                        // Create job requirements (random selection)
                        const requirementsPerJob = 3;
                        const shuffledRequirements = [...jobRequirementsData].sort(() => 0.5 - Math.random());
                        const selectedRequirements = shuffledRequirements.slice(0, requirementsPerJob);
                        await Promise.all(selectedRequirements.map(requirementData => prisma.job_requirements.create({
                            data: {
                                job_id: job.id,
                                requirement_type: requirementData.requirement_type,
                                title: requirementData.title,
                                description: requirementData.description,
                                is_required: requirementData.is_required,
                                level: requirementData.level,
                                years_experience: requirementData.years_experience,
                                created_at: new Date()
                            }
                        })));
                        // Create job work arrangement
                        const workArrangementData = jobWorkArrangementsData[Math.floor(Math.random() * jobWorkArrangementsData.length)];
                        await prisma.job_work_arrangements.create({
                            data: {
                                job_id: job.id,
                                is_remote_allowed: workArrangementData.is_remote_allowed,
                                remote_percentage: workArrangementData.remote_percentage,
                                flexible_hours: workArrangementData.flexible_hours,
                                travel_requirement: workArrangementData.travel_requirement,
                                overtime_expected: workArrangementData.overtime_expected,
                                shift_type: workArrangementData.shift_type,
                                created_at: new Date()
                            }
                        });
                        // Sync to Elasticsearch if available
                        if (isElasticsearchAvailable && isElasticsearchEnabled) {
                            try {
                                const esDoc = {
                                    id: job.id,
                                    title: job.title,
                                    description: job.description,
                                    company_id: job.company_id,
                                    location_id: job.location_id,
                                    salary_range: job.salary_range,
                                    job_type: job.job_type,
                                    experience_level: job.experience_level,
                                    posted_at: job.posted_at,
                                    expires_at: job.expires_at,
                                    status: job.status,
                                    metadata: job.metadata,
                                    created_at: job.updated_at,
                                    updated_at: job.updated_at
                                };
                                await elasticsearch_sync_service_1.elasticsearchSyncService.syncToElasticsearch('jobs', job.id, esDoc);
                            }
                            catch (esError) {
                                console.warn(`⚠️  Failed to sync job ${job.id} to Elasticsearch:`, esError);
                            }
                        }
                        return job;
                    }));
                    return companyJobs.length;
                }
                catch (error) {
                    console.error(`❌ Error creating jobs for company ${company.name}:`, error);
                    throw error;
                }
            });
            const batchResults = await Promise.all(batchPromises);
            const batchJobCount = batchResults.reduce((sum, count) => sum + count, 0);
            totalJobsCreated += batchJobCount;
            processedCompanies += batch.length;
            console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}, created ${batchJobCount} jobs, ` +
                `total: ${totalJobsCreated} jobs for ${processedCompanies} companies`);
        }
        console.log(`🎉 Successfully seeded ${totalJobsCreated} jobs for ${companies.length} companies!`);
        console.log(`📊 Average ${totalJobsCreated / companies.length} jobs per company`);
    }
    catch (error) {
        console.error('❌ Error seeding jobs:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Main execution function for standalone running
async function main() {
    try {
        await seedJobs();
    }
    catch (error) {
        console.error('❌ Job seeding failed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
