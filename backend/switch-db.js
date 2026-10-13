const fs = require('fs');
const path = require('path');

const target = process.argv[2] === 'postgres' || process.argv[2] === 'postgresql' ? 'postgresql' : 'mysql';
const schemaPath = path.join(__dirname, 'prisma/schema.prisma');

if (fs.existsSync(schemaPath)) {
  let content = fs.readFileSync(schemaPath, 'utf8');
  content = content.replace(/provider\s*=\s*"(mysql|postgresql)"/, `provider = "${target}"`);
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log(`✅ Prisma provider successfully set to: "${target}"`);
} else {
  console.error(`❌ Could not find schema file at ${schemaPath}`);
}
