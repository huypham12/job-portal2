/**
 * Unified CV Template Engine
 * Single source of truth for both preview and PDF generation
 * Supports only 2 templates: Classic Professional & Modern Impact
 */

import { CV_THEMES, CVTheme } from '../constants/cv-themes'

export class UnifiedCVEngine {
  static generateHTML(data: any, themeId: string = 'classic'): string {
    const theme = CV_THEMES[themeId] || CV_THEMES.classic

    if (theme.layout === 'header-top') {
      return this.generateClassicHTML(data, theme)
    } else {
      return this.generateModernHTML(data, theme)
    }
  }

  private static generateClassicHTML(data: any, theme: CVTheme): string {
    const { colors } = theme
    const personalInfo = data.personal_info || {}
    const skills = data.skills || []
    const experiences = data.experiences || []
    const educations = data.educations || []
    const certifications = data.certifications || []
    const awards = data.awards || []
    const projects = data.projects || []
    const technologies = data.technologies || []
    const highlights = data.highlights || []
    const links = data.links || []
    const languages = data.languages || []
    const summary = data.summary || ''
    const references = data.references || []

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title || 'CV'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
          }

          .cv-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          /* Header - Classic Layout */
          .cv-header {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }

          .cv-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .cv-contact {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 20px;
          }

          .cv-contact-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            opacity: 0.9;
          }

          /* Main Content - 2 Column */
          .cv-main {
            padding: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }

          .cv-section {
            margin-bottom: 25px;
          }

          .cv-section-title {
            font-size: 16px;
            font-weight: 600;
            color: ${colors.primary};
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid ${colors.primary};
          }

          .cv-item {
            margin-bottom: 15px;
          }

          .cv-item-title {
            font-weight: 600;
            font-size: 14px;
            color: #1e293b;
          }

          .cv-item-subtitle {
            color: ${colors.primary};
            font-size: 13px;
            margin: 2px 0;
          }

          .cv-item-date {
            font-size: 12px;
            color: #64748b;
          }

          /* Skills */
          .cv-skills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .cv-skill {
            background: #f1f5f9;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }

          /* Print Styles */
          @media print {
            body { background: white; padding: 0; }
            .cv-container { box-shadow: none; }
          }

          @media (max-width: 768px) {
            .cv-main { grid-template-columns: 1fr; }
            .cv-contact { flex-direction: column; align-items: center; }
          }
        </style>
      </head>
      <body>
        <div class="cv-container">
          <!-- Header -->
          <div class="cv-header">
            <h1>${personalInfo.full_name || 'Tên của bạn'}</h1>
            <div class="cv-contact">
              ${personalInfo.email ? `<div class="cv-contact-item">📧 ${personalInfo.email}</div>` : ''}
              ${personalInfo.phone ? `<div class="cv-contact-item">📱 ${personalInfo.phone}</div>` : ''}
              ${personalInfo.location ? `<div class="cv-contact-item">📍 ${personalInfo.location}</div>` : ''}
            </div>
          </div>

          <!-- Main Content -->
          <div class="cv-main">
            <div>
              <!-- Summary -->
              ${
                summary
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Tóm tắt</h3>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">${summary}</p>
                </div>
              `
                  : ''
              }

              <!-- Experience -->
              ${
                experiences.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Kinh nghiệm</h3>
                  ${experiences
                    .map(
                      (exp: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${exp.job_title || exp.position || 'Chức vụ'}</div>
                      <div class="cv-item-subtitle">${exp.company_name || exp.company || 'Công ty'}</div>
                      <div class="cv-item-date">${this.formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</div>
                      ${exp.description ? `<p style="font-size: 13px; margin-top: 5px; color: #475569;">${exp.description}</p>` : ''}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Education -->
              ${
                educations.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Học vấn</h3>
                  ${educations
                    .map(
                      (edu: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${edu.institution_name || edu.school_name || 'Trường'}</div>
                      <div class="cv-item-subtitle">${edu.degree || 'Bằng cấp'}</div>
                      <div class="cv-item-date">${this.formatDateRange(edu.start_date, edu.end_date)}</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>

            <div>
              <!-- Skills -->
              ${
                skills.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Kỹ năng</h3>
                  <div class="cv-skills">
                    ${skills
                      .map(
                        (skill: any) => `
                      <span class="cv-skill">${this.getSkillName(skill)}</span>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Certifications -->
              ${
                certifications.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Chứng chỉ</h3>
                  ${certifications
                    .map(
                      (cert: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${cert.name || cert.title || 'Chứng chỉ'}</div>
                      <div class="cv-item-subtitle">${cert.issuing_org || cert.issuer || 'Tổ chức'}</div>
                      <div class="cv-item-date">${this.formatDate(cert.issue_date)}</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Awards -->
              ${
                awards.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Giải thưởng</h3>
                  ${awards
                    .map(
                      (award: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${award.title || award.name || 'Giải thưởng'}</div>
                      <div class="cv-item-subtitle">${award.issuer || award.issuing_org || 'Đơn vị'}</div>
                      <div class="cv-item-date">${this.formatDate(award.date)}</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Projects -->
              ${
                projects.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Dự án</h3>
                  ${projects
                    .map(
                      (project: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${project.title || project.name || 'Dự án'}</div>
                      <div class="cv-item-subtitle">${project.role || ''}</div>
                      <div class="cv-item-date">${this.formatDateRange(project.start_date, project.end_date)}</div>
                      ${project.description ? `<p style="font-size: 13px; margin-top: 5px; color: #475569;">${project.description}</p>` : ''}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Technologies -->
              ${
                technologies.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Công nghệ</h3>
                  <div class="cv-skills">
                    ${technologies
                      .map(
                        (tech: any) => `
                      <span class="cv-skill">${tech}</span>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <!-- Highlights -->
              ${
                highlights.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Điểm nổi bật</h3>
                  ${highlights
                    .map(
                      (highlight: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${highlight.title || highlight}</div>
                      ${highlight.description ? `<p style="font-size: 13px; margin-top: 5px; color: #475569;">${highlight.description}</p>` : ''}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Links -->
              ${
                links.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Liên kết</h3>
                  ${links
                    .map(
                      (link: any) => `
                    <div class="cv-item">
                      <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: ${colors.primary}; text-decoration: none; font-weight: 500;">${link.label || link.url}</a>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Languages -->
              ${
                languages.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Ngôn ngữ</h3>
                  <div class="cv-skills">
                    ${languages
                      .map(
                        (lang: any) => `
                      <span class="cv-skill">${lang.name || lang.language} - ${lang.proficiency || lang.level || 'Trung cấp'}</span>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <!-- References -->
              ${
                references.length > 0
                  ? `
                <div class="cv-section">
                  <h3 class="cv-section-title">Người tham khảo</h3>
                  ${references
                    .map(
                      (ref: any) => `
                    <div class="cv-item">
                      <div class="cv-item-title">${ref.name || 'Người tham khảo'}</div>
                      <div class="cv-item-subtitle">${ref.position || ref.title || ''} ${ref.company ? `tại ${ref.company}` : ''}</div>
                      ${ref.email ? `<div style="font-size: 12px; color: #64748b;">📧 ${ref.email}</div>` : ''}
                      ${ref.phone ? `<div style="font-size: 12px; color: #64748b;">📱 ${ref.phone}</div>` : ''}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private static generateModernHTML(data: any, theme: CVTheme): string {
    const { colors } = theme
    const personalInfo = data.personal_info || {}
    const skills = data.skills || []
    const experiences = data.experiences || []
    const educations = data.educations || []
    const certifications = data.certifications || []
    const awards = data.awards || []
    const projects = data.projects || []
    const technologies = data.technologies || []
    const highlights = data.highlights || []
    const links = data.links || []
    const languages = data.languages || []
    const summary = data.summary || ''
    const references = data.references || []

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title || 'CV'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }

          .cv-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            gap: 0;
          }

          /* Sidebar: narrower to balance with main */
          .cv-sidebar {
            width: 30%;
            min-width: 160px;
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
            color: white;
            padding: 28px 22px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          /* Smaller avatar so sidebar feels lighter */
          .cv-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255,255,255,0.16);
            margin: 0 0 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
          }

          .cv-sidebar h1 {
            font-size: 18px;
            text-align: center;
            margin-bottom: 10px;
          }

          .cv-sidebar-contact {
            margin-top: auto;
            width: 100%;
          }

          .cv-sidebar-contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-size: 13px;
            justify-content: flex-start;
          }

          /* Main Content */
          .cv-main {
            flex: 1;
            padding: 36px;
            background: white;
            border-left: 1px solid rgba(15, 23, 42, 0.06);
            min-width: 260px;
          }

          .cv-section {
            margin-bottom: 22px;
          }

          .cv-section-title {
            font-size: 15px;
            font-weight: 600;
            color: ${colors.primary};
            margin-bottom: 12px;
            position: relative;
            padding-left: 14px;
          }

          .cv-section-title::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: ${colors.primary};
            border-radius: 2px;
          }

          /* Content text tweaks for balance */
          .cv-main p,
          .cv-main .cv-item {
            color: #475569;
            line-height: 1.5;
            margin-bottom: 8px;
            font-size: 13px;
          }

          /* Print Styles */
          @media print {
            body { background: white; padding: 0; }
            .cv-container { border-radius: 0; display: block; }
            .cv-sidebar { width: 100%; padding: 18px; }
            .cv-main { padding: 18px; border-left: none; }
          }

          @media (max-width: 768px) {
            .cv-container { flex-direction: column; }
            .cv-sidebar { width: 100%; padding: 20px; align-items: flex-start; }
            .cv-main { padding: 18px; border-left: none; }
          }
        </style>
      </head>
      <body>
        <div class="cv-container">
          <!-- Sidebar -->
          <div class="cv-sidebar">
            <div class="cv-avatar">
              ${
                personalInfo.full_name
                  ? personalInfo.full_name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .substring(0, 2)
                  : 'CV'
              }
            </div>
            <h1>${personalInfo.full_name || 'Tên của bạn'}</h1>

            <div class="cv-sidebar-contact">
              ${personalInfo.email ? `<div class="cv-sidebar-contact-item">📧 ${personalInfo.email}</div>` : ''}
              ${personalInfo.phone ? `<div class="cv-sidebar-contact-item">📱 ${personalInfo.phone}</div>` : ''}
              ${personalInfo.location ? `<div class="cv-sidebar-contact-item">📍 ${personalInfo.location}</div>` : ''}
            </div>
          </div>

          <!-- Main Content -->
          <div class="cv-main">
            ${personalInfo.bio ? `<div class="cv-section"><p style="font-size: 14px; line-height: 1.6; color: #475569;">${personalInfo.bio}</p></div>` : ''}

            <!-- Summary -->
            ${
              summary
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Tóm tắt</h3>
                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0;">${summary}</p>
              </div>
            `
                : ''
            }

            <!-- Skills -->
            ${
              skills.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Kỹ năng</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${skills
                    .map(
                      (skill: any) => `
                    <span style="background: rgba(124, 58, 237, 0.1); color: ${colors.primary}; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                      ${this.getSkillName(skill)}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <!-- Experience -->
            ${
              experiences.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Kinh nghiệm</h3>
                ${experiences
                  .map(
                    (exp: any) => `
                  <div style="margin-bottom: 20px; padding-left: 20px; position: relative;">
                    <div style="position: absolute; left: 0; top: 5px; width: 8px; height: 8px; background: ${colors.primary}; border-radius: 50%;"></div>
                    <div style="font-weight: 600; font-size: 15px; color: #1e293b;">${exp.job_title || exp.position || 'Chức vụ'}</div>
                    <div style="color: ${colors.primary}; font-size: 14px; margin: 2px 0;">${exp.company_name || exp.company || 'Công ty'}</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">${this.formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</div>
                    ${exp.description ? `<p style="font-size: 13px; color: #475569;">${exp.description}</p>` : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Education & Certifications -->
            ${
              educations.length > 0 || certifications.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Học vấn & Chứng chỉ</h3>
                ${educations
                  .map(
                    (edu: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${edu.institution_name || edu.school_name || 'Trường'}</div>
                    <div style="color: ${colors.primary}; font-size: 13px;">${edu.degree || 'Bằng cấp'}</div>
                    <div style="font-size: 12px; color: #64748b;">${this.formatDateRange(edu.start_date, edu.end_date)}</div>
                  </div>
                `
                  )
                  .join('')}
                ${certifications
                  .map(
                    (cert: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${cert.name || cert.title || 'Chứng chỉ'}</div>
                    <div style="color: ${colors.primary}; font-size: 13px;">${cert.issuing_org || cert.issuer || 'Tổ chức'}</div>
                    <div style="font-size: 12px; color: #64748b;">${this.formatDate(cert.issue_date)}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Awards -->
            ${
              awards.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Giải thưởng</h3>
                ${awards
                  .map(
                    (award: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${award.title || award.name || 'Giải thưởng'}</div>
                    <div style="color: ${colors.primary}; font-size: 13px;">${award.issuer || award.issuing_org || 'Đơn vị'}</div>
                    <div style="font-size: 12px; color: #64748b;">${this.formatDate(award.date)}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Projects -->
            ${
              projects.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Dự án</h3>
                ${projects
                  .map(
                    (project: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${project.title || project.name || 'Dự án'}</div>
                    <div style="color: ${colors.primary}; font-size: 13px;">${project.role || ''}</div>
                    <div style="font-size: 12px; color: #64748b;">${this.formatDateRange(project.start_date, project.end_date)}</div>
                    ${project.description ? `<p style="font-size: 13px; margin-top: 5px; color: #475569;">${project.description}</p>` : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Technologies -->
            ${
              technologies.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Công nghệ</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${technologies
                    .map(
                      (tech: any) => `
                    <span style="background: rgba(124, 58, 237, 0.1); color: ${colors.primary}; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                      ${tech}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <!-- Highlights -->
            ${
              highlights.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Điểm nổi bật</h3>
                ${highlights
                  .map(
                    (highlight: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${highlight.title || highlight}</div>
                    ${highlight.description ? `<p style="font-size: 13px; margin-top: 5px; color: #475569;">${highlight.description}</p>` : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Links -->
            ${
              links.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Liên kết</h3>
                ${links
                  .map(
                    (link: any) => `
                  <div style="margin-bottom: 15px;">
                      <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: ${colors.primary}; text-decoration: none; font-weight: 500;">${link.label || link.url}</a>
                    </div>
                  `
                  )
                  .join('')}
              </div>
            `
                : ''
            }

            <!-- Languages -->
            ${
              languages.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Ngôn ngữ</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${languages
                    .map(
                      (lang: any) => `
                    <span style="background: rgba(124, 58, 237, 0.1); color: ${colors.primary}; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                      ${lang.name || lang.language} - ${lang.proficiency || lang.level || 'Trung cấp'}
                    </span>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <!-- References -->
            ${
              references.length > 0
                ? `
              <div class="cv-section">
                <h3 class="cv-section-title">Người tham khảo</h3>
                ${references
                  .map(
                    (ref: any) => `
                  <div style="margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${ref.name || 'Người tham khảo'}</div>
                    <div style="color: ${colors.primary}; font-size: 13px;">${ref.position || ref.title || ''} ${ref.company ? `tại ${ref.company}` : ''}</div>
                    ${ref.email ? `<div style="font-size: 12px; color: #64748b;">📧 ${ref.email}</div>` : ''}
                    ${ref.phone ? `<div style="font-size: 12px; color: #64748b;">📱 ${ref.phone}</div>` : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
        </div>
      </body>
      </html>
    `
  }

  private static formatDate(dateStr: string): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })
  }

  private static formatDateRange(start: string, end: string, isCurrent?: boolean): string {
    const startText = this.formatDate(start) || '—'
    const endText = isCurrent ? 'Hiện tại' : this.formatDate(end) || '—'
    return `${startText} – ${endText}`
  }

  private static getSkillName(skill: any): string {
    if (typeof skill === 'string') return skill
    return skill?.name || skill?.skills?.name || 'Kỹ năng'
  }
}
