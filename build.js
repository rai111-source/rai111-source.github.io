const fs = require('fs');
const path = require('path');

const envFileContent = `
window.ENV = {
  SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}"
};
`;

const outputPath = path.join(__dirname, 'js', 'env.js');
fs.writeFileSync(outputPath, envFileContent, 'utf8');

console.log('Environment configuration generated at js/env.js');
