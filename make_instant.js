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
    content = content.replace("export const dynamic = 'force-dynamic';", "export const instant = false;");
    fs.writeFileSync(filePath, content);
  }
});
console.log('Replaced force-dynamic with instant = false');
