const fs = require('fs');
const path = require('path');

const layouts = [
  'src/app/admin/layout.tsx',
  'src/app/student/layout.tsx',
  'src/app/teacher/layout.tsx',
  'src/app/hod/layout.tsx'
];

layouts.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes("export const dynamic = 'force-dynamic';")) {
       content = "export const dynamic = 'force-dynamic';\n" + content;
       fs.writeFileSync(filePath, content);
    }
  }
});
console.log('Added force-dynamic to all portal layouts');
