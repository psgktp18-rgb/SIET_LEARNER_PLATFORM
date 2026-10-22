/**
 * Add `export const instant = false;` to all page.tsx files that:
 * 1. Use prisma/getUser/cookies (i.e., are dynamic/data-fetching pages)
 * 2. Don't already have `instant = false`
 * 
 * Also adds it to layout.tsx files missing it.
 */
const fs = require('fs');
const path = require('path');

const SRC_APP = path.join(__dirname, 'src', 'app');
let fixed = 0;

function needsInstant(content) {
  return (content.includes('prisma.') || content.includes('getUser()') || content.includes('cookies()'))
    && !content.includes('instant = false')
    && !content.includes("'use client'")
    && !content.includes('"use client"');
}

function addInstantExport(content) {
  // Add after the last import line
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('// @ts')) {
      lastImportIdx = i;
    }
  }
  
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, '\nexport const instant = false;');
  } else {
    lines.unshift('export const instant = false;\n');
  }
  return lines.join('\n');
}

function walkDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'api'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name === 'page.tsx' || entry.name === 'layout.tsx')) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (needsInstant(content)) {
          content = addInstantExport(content);
          fs.writeFileSync(fullPath, content, 'utf8');
          fixed++;
          console.log('Added instant=false to:', path.relative(SRC_APP, fullPath));
        }
      } catch (e) {
        console.error('Error processing:', fullPath, e.message);
      }
    }
  }
}

walkDir(SRC_APP);
console.log(`\nDone! Fixed ${fixed} files.`);
