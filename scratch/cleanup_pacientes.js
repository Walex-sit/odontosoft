const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'app/(dashboard)/pacientes/page.tsx',
  'app/(dashboard)/pacientes/[id]/page.tsx'
];

const fixMap = [
  { regex: /dark:border-slate-300 dark:border-slate-700\/50/g, replacement: 'dark:border-slate-700/50' },
  { regex: /dark:border-slate-200 dark:border-slate-800/g, replacement: 'dark:border-slate-800' },
  { regex: /bg-slate-50 dark:bg-slate-100 dark:bg-slate-900\/60/g, replacement: 'bg-white dark:bg-slate-900/60' },
  { regex: /bg-slate-50 dark:bg-slate-100 dark:bg-slate-900\/50/g, replacement: 'bg-white dark:bg-slate-900/50' },
  { regex: /bg-slate-50 dark:bg-slate-100 dark:bg-slate-900\/40/g, replacement: 'bg-white dark:bg-slate-900/40' },
  { regex: /bg-slate-100 dark:bg-slate-50 dark:bg-slate-900\/60/g, replacement: 'bg-white dark:bg-slate-900/60' },
  { regex: /bg-slate-100 dark:bg-slate-50 dark:bg-slate-900\/50/g, replacement: 'bg-white dark:bg-slate-900/50' },
  { regex: /bg-slate-100 dark:bg-slate-50 dark:bg-slate-900\/40/g, replacement: 'bg-white dark:bg-slate-900/40' },
  
  // also text-slate-800 dark:text-slate-800 dark:text-slate-100 ...
  { regex: /text-slate-800 dark:text-slate-800 dark:text-slate-100/g, replacement: 'text-slate-800 dark:text-slate-100' },
  
  // any border-slate-200 dark:border-slate-300 dark:border-slate-700/50
  { regex: /border-slate-200 dark:border-slate-300 dark:border-slate-700\/50/g, replacement: 'border-slate-200 dark:border-slate-700/50' }
];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    fixMap.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned ${file}`);
  }
});
