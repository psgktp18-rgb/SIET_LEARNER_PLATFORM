const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/teacher/assignments/route.ts',
  'src/app/api/teacher/assignments/grade/route.ts',
  'src/app/api/student/assignments/submit/route.ts',
  'src/app/api/admin/students/route.ts',
  'src/app/api/admin/teachers/route.ts',
  'src/app/api/admin/departments/route.ts'
];

files.forEach(f => {
  const absPath = path.join(__dirname, f);
  let content = fs.readFileSync(absPath, 'utf-8');
  // We want to replace `await logAudit(payload.userId, something, 'ACTION', `Details`);`
  // with `await logAudit({ action: 'ACTION', userId: payload.userId, targetUserId: something, details: `Details` });`
  content = content.replace(/await\s+logAudit\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*('[^']+')\s*,\s*(`[^`]+`|'[^']+'|"[^"]+")\s*\);?/g, 
    "await logAudit({ userId: $1, targetUserId: $2, action: $3, details: $4 });");
  fs.writeFileSync(absPath, content);
});
console.log('Fixed logAudit calls');
