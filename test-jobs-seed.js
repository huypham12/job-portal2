const fs = require('fs');
const path = require('path');

// Test loading JSON data
console.log('Testing data loading...');

try {
  const jobsPath = path.join(__dirname, 'prisma', 'seeders', 'data', 'jobs.json');
  const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
  console.log(`✅ Loaded ${jobsData.length} jobs`);

  const companiesPath = path.join(__dirname, 'prisma', 'seeders', 'data', 'companies.json');
  const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
  console.log(`✅ Loaded ${companiesData.length} companies`);

  const companyDetailsPath = path.join(__dirname, 'prisma', 'seeders', 'data', 'company_details.json');
  const companyDetailsData = JSON.parse(fs.readFileSync(companyDetailsPath, 'utf-8'));
  console.log(`✅ Loaded ${companyDetailsData.length} company details`);

  // Test industry mapping
  console.log('\nTesting industry mapping...');
  const testIndustries = ['Technology', 'Healthcare', 'Finance', null];
  const testJobs = jobsData.slice(0, 20); // Take first 20 jobs for testing

  testIndustries.forEach(industry => {
    const relevantJobs = getRelevantJobsForIndustry(industry, testJobs);
    console.log(`Industry "${industry}": ${relevantJobs.length} relevant jobs`);
  });

  console.log('✅ Data loading and mapping test completed successfully');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

function getRelevantJobsForIndustry(industry, allJobs) {
  if (!industry) return allJobs.slice(0, 5);

  const industryLower = industry.toLowerCase();

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
    'energy': ['Energy', 'Oil', 'Gas', 'Power', 'Renewable', 'Utility']
  };

  const keywords = industryMappings[industryLower] || ['General', 'Business', 'Management'];

  const relevantJobs = allJobs.filter(job => {
    const titleLower = job.title.toLowerCase();
    const descLower = job.description.toLowerCase();
    return keywords.some(keyword =>
      titleLower.includes(keyword.toLowerCase()) ||
      descLower.includes(keyword.toLowerCase())
    );
  });

  if (relevantJobs.length < 5) {
    const generalJobs = allJobs.filter(job => !relevantJobs.includes(job));
    relevantJobs.push(...generalJobs.slice(0, 5 - relevantJobs.length));
  }

  return relevantJobs.slice(0, 5);
}
