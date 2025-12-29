import SwaggerParser from '@apidevtools/swagger-parser'
import { writeFileSync } from 'fs'

interface BundledSwagger {
  [key: string]: any
}

async function bundleSwagger(): Promise<void> {
  try {
    console.log('Bundling Swagger documentation...')

    // Parse and bundle the main swagger file
    const bundled: BundledSwagger = await SwaggerParser.bundle('swagger/main.yaml')

    // Write the bundled result to file
    writeFileSync('swagger/bundled-openapi.yaml', JSON.stringify(bundled, null, 2))

    console.log('✅ Swagger documentation bundled successfully!')
    console.log('📄 Bundled file: swagger/bundled-openapi.yaml')
  } catch (error: any) {
    console.error('❌ Error bundling Swagger documentation:', error)
    process.exit(1)
  }
}

bundleSwagger()
