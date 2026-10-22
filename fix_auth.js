const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(path.join(__dirname, 'src/app'), (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    if (content.includes("import { verifyToken } from '@/lib/auth';") || content.includes('import { verifyToken } from "@/lib/auth";')) {
      content = content.replace(/import\s*\{\s*verifyToken\s*\}\s*from\s*['"]@\/lib\/auth['"];?/g, "import { getUser } from '@/lib/auth';");
      changed = true;
    }

    if (content.includes("import { getSession } from '@/lib/action-wrapper';")) {
       // if we want to replace getSession with getUser, but getSession is still fine for actions.
       // However if it's used in page components, let's just leave it if it works.
    }

    // Replace cookie fetching
    // const cookieStore = await cookies();
    // const token = cookieStore.get('token')?.value;
    // const session = await verifyToken(token as string);
    // OR const payload = await verifyToken(token);
    
    // We will do a generic regex replace for verifyToken(...)
    if (changed || content.includes('verifyToken(')) {
       content = content.replace(/await verifyToken\([^)]*\)/g, 'await getUser()');
       // Also remove the token/cookie lines if they are now unused, but it's fine if they remain and typescript complains about unused vars, we can ignore or let eslint ignore. 
       changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed', filePath);
    }
  }
});
