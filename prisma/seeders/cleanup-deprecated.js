#!/usr/bin/env node

/**
 * Cleanup Deprecated Seeders Script
 * Di chuyển các file seeder cũ vào thư mục archive
 */

const fs = require('fs')
const path = require('path')

const DEPRECATED_FILES = [
  'seed-users.ts',
  'seed-jobs.ts',
  'seed-company-metadata.ts',
  'seed-job-metadata.ts',
  'seed-application-metadata.ts',
  'seed-additional-features.ts'
]

const ARCHIVE_DIR = path.join(__dirname, 'archive')

function createArchiveDir() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR)
    console.log('📁 Created archive directory:', ARCHIVE_DIR)
  }
}

function moveFileToArchive(filename) {
  const sourcePath = path.join(__dirname, filename)
  const destPath = path.join(ARCHIVE_DIR, filename)

  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, destPath)
    console.log(`📦 Moved ${filename} to archive/`)
  } else {
    console.log(`⚠️  ${filename} not found, skipping...`)
  }
}

function createDeprecationNotice() {
  const noticePath = path.join(ARCHIVE_DIR, 'README.md')
  const notice = `# Archived Seeders

Các file trong thư mục này đã được deprecated và thay thế bởi streaming processors.

## Files in this archive:
${DEPRECATED_FILES.map((f) => `- \`${f}\``).join('\n')}

## Migration:
- Sử dụng streaming mode: \`npm run db:seed:streaming\`
- Tham khảo: \`../OPTIMIZATION_README.md\`
- Documentation: \`../DEPRECATED_SEEDERS.md\`

---
*Archived on: ${new Date().toISOString()}*
`

  fs.writeFileSync(noticePath, notice)
  console.log('📝 Created deprecation notice in archive/')
}

function main() {
  console.log('🧹 Starting cleanup of deprecated seeders...\n')

  // Confirm with user
  console.log('This will move the following files to archive/:')
  DEPRECATED_FILES.forEach((file) => console.log(`  - ${file}`))
  console.log('\n⚠️  This action cannot be undone easily.')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')

  setTimeout(() => {
    createArchiveDir()
    DEPRECATED_FILES.forEach(moveFileToArchive)
    createDeprecationNotice()

    console.log('\n✅ Cleanup completed!')
    console.log('📂 Check archive/ directory for moved files')
    console.log('📖 Read DEPRECATED_SEEDERS.md for more information')
  }, 5000)
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { DEPRECATED_FILES, ARCHIVE_DIR }
