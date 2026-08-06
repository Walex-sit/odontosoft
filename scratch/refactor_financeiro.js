const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app/(dashboard)/financeiro/page.tsx');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We should do a clean replace that avoids multiple applications.
  // Using word boundaries to avoid replacing "bg-slate-500" when looking for "bg-slate-50".
  const replacements = [
    { regex: /\bbg-slate-50\b(?! dark:bg-slate-900)/g, replacement: 'bg-slate-50 dark:bg-slate-900' },
    { regex: /\bbg-white\b(?! dark:bg-slate-800)/g, replacement: 'bg-white dark:bg-slate-800' },
    { regex: /\bborder-slate-200\b(?! dark:border-slate-700)/g, replacement: 'border-slate-200 dark:border-slate-700' },
    { regex: /\bborder-slate-100\b(?! dark:border-slate-700\/50)/g, replacement: 'border-slate-100 dark:border-slate-700/50' },
    { regex: /\btext-slate-900\b(?! dark:text-slate-100)/g, replacement: 'text-slate-900 dark:text-slate-100' },
    { regex: /\btext-slate-800\b(?! dark:text-slate-100)/g, replacement: 'text-slate-800 dark:text-slate-100' },
    { regex: /\btext-slate-700\b(?! dark:text-slate-200)/g, replacement: 'text-slate-700 dark:text-slate-200' },
    { regex: /\btext-slate-600\b(?! dark:text-slate-300)/g, replacement: 'text-slate-600 dark:text-slate-300' },
    { regex: /\btext-slate-500\b(?! dark:text-slate-400)/g, replacement: 'text-slate-500 dark:text-slate-400' },
    // A special rule to not ruin bg-blue-600 text-white
    // Not touching text-white as requested.
  ];

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed financeiro/page.tsx');
} else {
  console.log('File not found');
}
