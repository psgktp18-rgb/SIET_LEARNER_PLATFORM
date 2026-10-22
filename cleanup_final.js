/**
 * Final cleanup: remove any remaining orphan `const cookieStore = await cookies();`
 * and unused `import { cookies } from 'next/headers'` from page.tsx files (not API routes).
 */
const fs = require('fs');
const path = require('path');

const SRC_APP = path.join(__dirname, 'src', 'app');
let fixedFiles = 0;

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

      // Remove any orphan cookieStore that's declared but cookieStore is not used after that point
      // This handles both \n and \r\n
      const cookieStoreDecl = /[ \t]*const cookieStore = await cookies\(\);[\r\n]+/g;
      if (cookieStoreDecl.test(content)) {
        content = content.replace(/[ \t]*const cookieStore = await cookies\(\);[\r\n]+/g, '');
        fixedFiles++;
        console.log('Removed orphan cookieStore:', path.relative(SRC_APP, fullPath));
      }

      // Now remove `import { cookies }` if cookies() not used anymore
      if (!content.includes('cookies()')) {
        const before = content;
        content = content.replace(/[ \t]*import \{ cookies \} from 'next\/headers';[\r\n]+/g, '');
        content = content.replace(/[ \t]*import \{ cookies \} from "next\/headers";[\r\n]+/g, '');
        if (content !== before) {
          console.log('Removed cookies import:', path.relative(SRC_APP, fullPath));
        }
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

walkDir(SRC_APP);
console.log(`\nDone!`);
