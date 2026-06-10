const fs = require('fs');
const path = require('path');

// 1. Generate Environment
const envFileContent = `
window.ENV = {
  SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}"
};
`;

const envPath = path.join(__dirname, 'js', 'env.js');
fs.writeFileSync(envPath, envFileContent, 'utf8');
console.log('Environment configuration generated at js/env.js');

// 2. Minify CSS
try {
  const cssPath = path.join(__dirname, 'css', 'index.css');
  const minCssPath = path.join(__dirname, 'css', 'index.min.css');
  
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const minified = cssContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s*([{}|:;,])\s*/g, '$1') // Remove space around delimiters
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
    
    fs.writeFileSync(minCssPath, minified, 'utf8');
    console.log('CSS minified successfully at css/index.min.css');
  }
} catch (e) {
  console.error('Failed to minify CSS:', e);
}

