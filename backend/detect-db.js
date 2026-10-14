const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || '';
const schemaPath = path.join(__dirname, 'prisma/schema.prisma');

let target = 'mysql';
if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  target = 'postgresql';
}

if (fs.existsSync(schemaPath)) {
  let content = fs.readFileSync(schemaPath, 'utf8');
  content = content.replace(/provider\s*=\s*"(mysql|postgresql)"/, `provider = "${target}"`);
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log(`✅ [detect-db] Target database provider set to: "${target}" based on DATABASE_URL`);
} else {
  console.error(`❌ [detect-db] Schema file not found at ${schemaPath}`);
}
