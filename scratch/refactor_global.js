const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const appDir = path.join(__dirname, '..', 'app');
const files = walk(appDir);

const replacements = [
  { regex: /\bbg-slate-50\b(?! dark:bg-slate-950| dark:bg-slate-900)/g, replacement: 'bg-slate-50 dark:bg-slate-950' },
  { regex: /\bbg-white\b(?! dark:bg-slate-800| dark:bg-slate-900| dark:bg-slate-900\/60)/g, replacement: 'bg-white dark:bg-slate-800' },
  { regex: /\bborder-slate-200\b(?! dark:border-slate-700)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /\bborder-slate-300\b(?! dark:border-slate-700)/g, replacement: 'border-slate-300 dark:border-slate-700' },
  { regex: /\btext-black\b(?! dark:text-slate-100)/g, replacement: 'text-slate-900 dark:text-slate-100' },
  { regex: /\btext-slate-900\b(?! dark:text-slate-100| dark:text-white)/g, replacement: 'text-slate-900 dark:text-slate-100' },
  { regex: /\btext-slate-800\b(?! dark:text-slate-100| dark:text-slate-200)/g, replacement: 'text-slate-800 dark:text-slate-100' },
  { regex: /\btext-slate-700\b(?! dark:text-slate-200)/g, replacement: 'text-slate-700 dark:text-slate-200' },
  { regex: /\btext-slate-600\b(?! dark:text-slate-300)/g, replacement: 'text-slate-600 dark:text-slate-300' },
  { regex: /\btext-slate-500\b(?! dark:text-slate-400)/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /\bhover:bg-slate-50\b(?! dark:hover:bg-slate-700| dark:hover:bg-slate-800)/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-700' },
  { regex: /\bhover:bg-slate-100\b(?! dark:hover:bg-slate-700| dark:hover:bg-slate-800)/g, replacement: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
];

let changedFiles = 0;

files.forEach(file => {
  let originalContent = fs.readFileSync(file, 'utf8');
  let content = originalContent;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${path.relative(appDir, file)}`);
    changedFiles++;
  }
});

console.log(`\nFinished processing. Updated ${changedFiles} files.`);
