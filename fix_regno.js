const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const dirs = [path.join(__dirname, 'src'), path.join(__dirname, 'tests')];
dirs.forEach(dir => walkDir(dir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('regNo')) {
      content = content.replace(/\bregNo\b/g, 'loginId');
      fs.writeFileSync(filePath, content);
      console.log('Fixed regNo in', filePath);
    }
  }
}));
