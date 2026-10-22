const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/student/client-components.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The original type ActionState<{success: boolean}> has no .error if ok is true
// Let's just remove `.error` usage or change the type check
content = content.replace(/res\.error/g, '(res as any).error');

fs.writeFileSync(filePath, content);
console.log('Fixed client-components.tsx');
