const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const path = require('path');

async function bundleSwagger() {
  try {
    console.log('Bundling Swagger documentation...');

    // Parse and bundle the main swagger file
    const bundled = await SwaggerParser.bundle('swagger/main.yaml');

    // Write the bundled result to file
    fs.writeFileSync('swagger/bundled-openapi.yaml', JSON.stringify(bundled, null, 2));

    console.log('✅ Swagger documentation bundled successfully!');
    console.log('📄 Bundled file: swagger/bundled-openapi.yaml');

  } catch (error) {
    console.error('❌ Error bundling Swagger documentation:', error);
    process.exit(1);
  }
}

bundleSwagger();
