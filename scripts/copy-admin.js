const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'static/admin');
const destDir = path.join(__dirname, 'public/admin');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  copyDir(srcDir, destDir);
  console.log('Admin files copied successfully');
} catch (err) {
  console.error('Error copying admin files:', err);
  process.exit(1);
}
