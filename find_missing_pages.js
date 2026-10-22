const fs = require('fs');
const path = require('path');

const targetDirs = [
  'src/app/student',
  'src/app/teacher',
  'src/app/admin',
  'src/app/hod'
];

let missing = [];

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  // If it's a route directory (not an api route or hidden folder)
  const hasPage = files.includes('page.tsx') || files.includes('page.ts') || files.includes('page.js') || files.includes('page.jsx');
  if (!hasPage && files.some(f => fs.statSync(path.join(dir, f)).isDirectory())) {
     // If it's a directory like `student/[id]`, it should have a page.tsx
     // But wait, the directory itself doesn't strictly need one if it's just a folder containing other routes.
     // Let's just list all dirs that don't have page.tsx
     missing.push(dir);
  } else if (!hasPage) {
     missing.push(dir);
  }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && !fullPath.includes('node_modules')) {
      checkDir(fullPath);
    }
  }
}

targetDirs.forEach(checkDir);

console.log("Directories missing page.tsx:", missing);
