/**
 * Remove unused `const cookieStore = await cookies()` and `const token = cookieStore.get('ll_token')?.value;`
 * patterns from page files where the token variable is never used after retrieval.
 * 
 * Also removes `import { cookies } from 'next/headers'` if no longer needed.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
let fixedFiles = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Check if 'token' variable is declared but never used beyond the declaration
      // Pattern: const token = cookieStore.get('ll_token')?.value; -- only remove if token is never used elsewhere
      const tokenDeclMatch = content.match(/const token = cookieStore\.get\('ll_token'\)\?\.value;/);
      if (tokenDeclMatch) {
        // Count how many times 'token' appears (excluding the declaration itself)
        const allMatches = [...content.matchAll(/\btoken\b/g)];
        // The declaration has 'token' once; if it's only 1 occurrence total, it's unused
        if (allMatches.length <= 1) {
          // Remove the token declaration line
          content = content.replace(/\s*const token = cookieStore\.get\('ll_token'\)\?\.value;\r?\n/, '\n');
          // Now check if cookieStore is still used
          if (!content.includes('cookieStore')) {
            // Remove the cookieStore declaration too
            content = content.replace(/\s*const cookieStore = await cookies\(\);\r?\n/, '\n');
            // Check if cookies import is still needed
            if (!content.includes('cookies(') && !content.includes('cookies }')) {
              content = content.replace(/\s*import \{ cookies \} from 'next\/headers';\r?\n/, '\n');
              content = content.replace(/\s*import \{ cookies \} from "next\/headers";\r?\n/, '\n');
            }
          }
        } else if (allMatches.length === 2) {
          // token is used once more - check if it's used in an if(!token) guard that's now redundant
          // The layout handles auth now, so the if(!token) redirect is redundant
          // Remove: const token = ...; if (!token) { redirect('/login'); }
          const deadGuardPattern = /const token = cookieStore\.get\('ll_token'\)\?\.value;\r?\n\r?\n?\s*if \(!token\) \{\s*\r?\n\s*redirect\('\/login'\);\s*\r?\n\s*\}\r?\n/;
          if (deadGuardPattern.test(content)) {
            content = content.replace(deadGuardPattern, '');
            // Now check if cookieStore is still used
            if (!content.includes('cookieStore')) {
              content = content.replace(/\s*const cookieStore = await cookies\(\);\r?\n/, '\n');
              if (!content.includes('cookies(') && !content.includes('cookies }')) {
                content = content.replace(/\s*import \{ cookies \} from 'next\/headers';\r?\n/, '\n');
                content = content.replace(/\s*import \{ cookies \} from "next\/headers";\r?\n/, '\n');
              }
            }
          }
        }
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        fixedFiles++;
        console.log('Cleaned:', path.relative(SRC_DIR, fullPath));
      }
    }
  }
}

walkDir(SRC_DIR);
console.log(`\nDone! Cleaned ${fixedFiles} files.`);
