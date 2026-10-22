/**
 * Remove redundant token check patterns from PAGE files (not API routes):
 * - const cookieStore = await cookies();\n  const token = ...\n  if (!token) return redirect...
 * - Also removes `import { cookies }` if no longer needed
 */
const fs = require('fs');
const path = require('path');

const SRC_APP = path.join(__dirname, 'src', 'app');
let fixedFiles = 0;

// Only target page.tsx files, not route.ts API files
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'api'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Pattern to remove:
      // const cookieStore = await cookies();\n  const token = cookieStore.get('ll_token')?.value;\n  if (!token) return redirect('/login');\n
      // Various whitespace/newline combos
      content = content.replace(
        /[ \t]*const cookieStore = await cookies\(\);\r?\n[ \t]*const token = cookieStore\.get\('ll_token'\)\?\.value;\r?\n[ \t]*if \(!token\) (return )?redirect\('\/login'\);\r?\n/g,
        ''
      );
      
      // Also: `const cookieStore = await cookies();` with no following token usage (orphan)
      // If cookieStore not used anymore, remove it
      if (!content.includes('cookieStore') && original.includes('cookieStore')) {
        content = content.replace(/[ \t]*const cookieStore = await cookies\(\);\r?\n/g, '');
      }
      
      // Remove `import { cookies } from 'next/headers'` if cookies() not called anymore
      if (!content.includes('cookies()') && !content.includes('cookies }')) {
        content = content.replace(/[ \t]*import \{ cookies \} from 'next\/headers';\r?\n/g, '');
        content = content.replace(/[ \t]*import \{ cookies \} from "next\/headers";\r?\n/g, '');
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        fixedFiles++;
        console.log('Cleaned:', path.relative(SRC_APP, fullPath));
      }
    }
  }
}

walkDir(SRC_APP);
console.log(`\nDone! Cleaned ${fixedFiles} page files.`);
