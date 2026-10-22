/**
 * Fix all occurrences of cookieStore.get('token') → cookieStore.get('ll_token')
 * and req.cookies.get('token') → req.cookies.get('ll_token')
 * throughout the codebase.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

let totalFiles = 0;
let fixedFiles = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      totalFiles++;
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Pattern 1: cookieStore.get('token') → cookieStore.get('ll_token')
      // Pattern 2: req.cookies.get('token') → req.cookies.get('ll_token')
      // Pattern 3: cookies.get('token') → cookies.get('ll_token')
      // Only match the string 'token' not 'll_token' (avoid double-fixing)
      const original = content;
      content = content.replace(/\.get\('token'\)/g, ".get('ll_token')");
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        fixedFiles++;
        console.log('Fixed:', path.relative(SRC_DIR, fullPath));
      }
    }
  }
}

walkDir(SRC_DIR);
console.log(`\nDone! Fixed ${fixedFiles} of ${totalFiles} scanned files.`);
