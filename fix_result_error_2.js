const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'src/lib/jobs/handlers/generate-flashcards.ts');
let content1 = fs.readFileSync(file1, 'utf-8');
content1 = content1.replace(/result\.error/g, '(result as any).error');
fs.writeFileSync(file1, content1);

const file2 = path.join(__dirname, 'src/lib/jobs/handlers/generate-questions.ts');
let content2 = fs.readFileSync(file2, 'utf-8');
content2 = content2.replace(/result\.error/g, '(result as any).error');
fs.writeFileSync(file2, content2);

const file3 = path.join(__dirname, 'src/app/student/client-components.tsx');
let content3 = fs.readFileSync(file3, 'utf-8');
content3 = content3.replace(/res\.error/g, '(res as any).error');
fs.writeFileSync(file3, content3);
