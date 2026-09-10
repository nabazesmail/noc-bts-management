const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/nabaz.ismael/.gemini/antigravity/scratch/noc-bts-management/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let original = content;
  
  // Icons
  content = content.replace(/className="(w-\d+ h-\d+) text-white drop-shadow-md"/g, 'className="$1 text-slate-800 dark:text-white drop-shadow-md"');
  
  // Headers
  content = content.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');
  
  // Subheaders (if any)
  content = content.replace(/text-gray-300 dark:text-gray-400/g, 'text-slate-500 dark:text-gray-400');
  
  if (content !== original) {
    fs.writeFileSync(path.join(dir, file), content);
    console.log('Fixed', file);
  }
}
