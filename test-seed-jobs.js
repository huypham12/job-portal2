// Quick test for seed-jobs.ts
const { execSync } = require('child_process');

console.log('Testing seed-jobs.ts compilation...');

try {
  // Try to compile TypeScript
  execSync('npx tsc --noEmit --skipLibCheck prisma/seeders/seed-jobs.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}
