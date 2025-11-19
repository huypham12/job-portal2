// prisma/seeders/seed-profile-certifications.ts
import { PrismaClient } from '@prisma/client'

export async function seedProfileCertifications(prisma: PrismaClient) {
  console.log('Seeding Profile Certifications...')

  // Lấy tất cả profiles để tạo certifications
  const profiles = await prisma.profiles.findMany({
    select: { id: true }
  })

  if (profiles.length === 0) {
    console.log('Không có profiles nào để tạo certifications')
    return
  }

  // Danh sách các certifications mẫu
  const certificationTemplates = [
    {
      name: 'AWS Certified Solutions Architect',
      issuing_org: 'Amazon Web Services',
      description: 'Validates expertise in designing distributed systems on AWS',
      skills_acquired: 'Cloud Architecture, AWS Services, System Design',
      never_expires: false,
      category: 'cloud'
    },
    {
      name: 'Google Cloud Professional Data Engineer',
      issuing_org: 'Google Cloud',
      description: 'Demonstrates ability to design and build data processing systems',
      skills_acquired: 'BigQuery, Cloud Storage, Data Pipeline, Machine Learning',
      never_expires: false,
      category: 'data'
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      issuing_org: 'Cloud Native Computing Foundation',
      description: 'Validates skills to perform the responsibilities of Kubernetes administrators',
      skills_acquired: 'Kubernetes, Container Orchestration, DevOps',
      never_expires: false,
      category: 'devops'
    },
    {
      name: 'Project Management Professional (PMP)',
      issuing_org: 'Project Management Institute',
      description: 'Demonstrates competency in leading and directing projects',
      skills_acquired: 'Project Management, Leadership, Risk Management',
      never_expires: false,
      category: 'management'
    },
    {
      name: 'Certified Information Systems Security Professional (CISSP)',
      issuing_org: 'International Information System Security Certification Consortium',
      description: 'Validates expertise in cybersecurity',
      skills_acquired: 'Security Architecture, Risk Management, Security Operations',
      never_expires: false,
      category: 'security'
    },
    {
      name: 'Oracle Certified Professional Java Developer',
      issuing_org: 'Oracle Corporation',
      description: 'Validates Java programming skills and knowledge',
      skills_acquired: 'Java Programming, Object-Oriented Design, JVM',
      never_expires: true,
      category: 'programming'
    },
    {
      name: 'Microsoft Certified: Azure Developer Associate',
      issuing_org: 'Microsoft',
      description: 'Validates ability to design, build, test, and maintain cloud applications',
      skills_acquired: 'Azure Services, Cloud Development, API Development',
      never_expires: false,
      category: 'cloud'
    },
    {
      name: 'Certified Scrum Master (CSM)',
      issuing_org: 'Scrum Alliance',
      description: 'Demonstrates understanding of Scrum framework and ability to facilitate teams',
      skills_acquired: 'Scrum Framework, Agile Methodologies, Team Facilitation',
      never_expires: false,
      category: 'agile'
    }
  ]

  const certifications = []

  // Tạo certifications cho mỗi profile (ngẫu nhiên 1-3 certifications)
  for (const profile of profiles) {
    const numCerts = Math.floor(Math.random() * 3) + 1 // 1-3 certifications
    const selectedTemplates = certificationTemplates.sort(() => 0.5 - Math.random()).slice(0, numCerts)

    for (const template of selectedTemplates) {
      const issueDate = new Date()
      issueDate.setFullYear(issueDate.getFullYear() - Math.floor(Math.random() * 5)) // 0-5 năm trước

      let expiryDate = null
      if (!template.never_expires) {
        expiryDate = new Date(issueDate)
        expiryDate.setFullYear(expiryDate.getFullYear() + 3) // Hết hạn sau 3 năm
      }

      certifications.push({
        profile_id: profile.id,
        name: template.name,
        issuing_org: template.issuing_org,
        credential_id: `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        credential_url: `https://verify.${template.issuing_org.toLowerCase().replace(/\s+/g, '')}.com/${Math.random().toString(36).substr(2, 12)}`,
        issue_date: issueDate,
        expiry_date: expiryDate,
        never_expires: template.never_expires,
        description: template.description,
        skills_acquired: template.skills_acquired
      })
    }
  }

  // Bulk insert certifications
  if (certifications.length > 0) {
    await prisma.profile_certifications.createMany({
      data: certifications,
      skipDuplicates: true
    })
    console.log(`Đã tạo ${certifications.length} profile certifications`)
  }

  console.log('Seeding Profile Certifications hoàn tất')
}
