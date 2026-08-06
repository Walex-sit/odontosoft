const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'app/(dashboard)/pacientes/page.tsx',
  'app/(dashboard)/pacientes/[id]/page.tsx'
];

const replaceMap = [
  { regex: /\bbg-slate-800\b/g, replacement: 'bg-white dark:bg-slate-800' },
  { regex: /\bbg-slate-900\b/g, replacement: 'bg-slate-100 dark:bg-slate-900' },
  { regex: /\bbg-slate-900\/60\b/g, replacement: 'bg-slate-50 dark:bg-slate-900/60' },
  { regex: /\bbg-slate-900\/50\b/g, replacement: 'bg-slate-50 dark:bg-slate-900/50' },
  { regex: /\bbg-slate-900\/40\b/g, replacement: 'bg-slate-50 dark:bg-slate-900/40' },
  
  { regex: /\bborder-slate-700\/50\b/g, replacement: 'border-slate-200 dark:border-slate-700/50' },
  { regex: /\bborder-slate-700\b/g, replacement: 'border-slate-300 dark:border-slate-700' },
  { regex: /\bborder-slate-800\b/g, replacement: 'border-slate-200 dark:border-slate-800' },
  
  { regex: /\btext-slate-100\b/g, replacement: 'text-slate-800 dark:text-slate-100' },
  { regex: /\btext-slate-300\b/g, replacement: 'text-slate-600 dark:text-slate-300' },
  
  // Exclude buttons from text-white replacement by using a negative lookbehind if possible, 
  // but JS regex doesn't universally support complex lookbehinds easily if not careful.
  // We'll replace text-white only if it's NOT preceded by bg-blue or bg-green.
  { regex: /(?<!bg-(?:blue|green|red|amber)-\d{3}.*?)\btext-white\b/g, replacement: 'text-slate-800 dark:text-white' }
];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    replaceMap.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });

    // Special fix for inputs
    content = content.replace(/placeholder-slate-500/g, 'placeholder-slate-400 dark:placeholder-slate-500');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
