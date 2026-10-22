const fs = require('fs');
const path = require('path');

function replaceUnknownError(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/result\.error/g, '(result as any).error');
  fs.writeFileSync(file, content);
}

replaceUnknownError(path.join(__dirname, 'src/lib/jobs/handlers/generate-flashcards.ts'));
replaceUnknownError(path.join(__dirname, 'src/lib/jobs/handlers/generate-questions.ts'));
console.log('Fixed unknown result.error');
