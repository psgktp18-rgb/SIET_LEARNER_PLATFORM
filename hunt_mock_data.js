const fs = require('fs');
const path = require('path');

const targetDirs = ['src', 'prisma', 'scripts', 'public'];
const keywords = [
  'Math.random()',
  'faker',
  'Teacher 1',
  'Student 1',
  'sample',
  'demo',
  'mock',
  'dummy',
  'placeholder',
  'coming soon',
  'setTimeout'
];

let findings = [];

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('.next')) {
        searchDir(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const kw of keywords) {
          if (lines[i].toLowerCase().includes(kw.toLowerCase())) {
            // Ignore if it's just this script or if it's package.json etc
            findings.push({ file: fullPath, line: i + 1, match: kw, text: lines[i].trim().substring(0, 80) });
          }
        }
      }
    }
  }
}

targetDirs.forEach(searchDir);

console.log('| File | Line | Keyword | Context |');
console.log('|---|---|---|---|');
findings.forEach(f => {
  console.log(`| ${f.file.replace(/\\/g, '/')} | ${f.line} | ${f.match} | ${f.text.replace(/\|/g, '-')} |`);
});
