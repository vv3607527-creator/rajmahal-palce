/* quick size scan of the project tree */
const fs = require('fs');
const path = require('path');
const root = 'C:/Users/venkatesh/Documents/RAJMAHAL PALACE WEBSITE';
function walk(dir, prefix) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = walk(full, prefix + e.name + '/');
      total += sub;
    } else {
      const sz = fs.statSync(full).size;
      total += sz;
    }
  }
  console.log((prefix || '(root)') + '  ' + (total / 1048576).toFixed(1) + ' MB');
  return total;
}
walk(path.join(root, 'assets'), 'assets/');
console.log('scripts/  files: ' + fs.readdirSync(path.join(root, 'scripts')).length);
console.log('test-screens/  files: ' + fs.readdirSync(path.join(root, 'test-screens')).length);
