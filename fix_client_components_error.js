const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/student/client-components.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The original type ActionState<{success: boolean}> has no .error if ok is true
// Earlier we replaced `res.error` with `(res as any).error`.
// Now we need to fix `new Error((res as any).error)` -> `new Error((res as any).error?.message || 'Error')`
content = content.replace(/new Error\(\(res as any\)\.error\)/g, "new Error((res as any).error?.message || 'Error')");

fs.writeFileSync(filePath, content);
console.log('Fixed client-components.tsx Error constructor');
