const fs = require('fs');
const path = require('path');

// 1. Configurações Tabs
const configPath = path.join(__dirname, '..', 'app/(dashboard)/configuracoes/page.tsx');
if (fs.existsSync(configPath)) {
  let content = fs.readFileSync(configPath, 'utf8');
  content = content.replace(
    /'border-blue-600 text-blue-600 bg-blue-50\/50'/g,
    "'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800'"
  );
  fs.writeFileSync(configPath, content, 'utf8');
}

// 2. Financeiro Tabs
const finPath = path.join(__dirname, '..', 'app/(dashboard)/financeiro/page.tsx');
if (fs.existsSync(finPath)) {
  let content = fs.readFileSync(finPath, 'utf8');
  content = content.replace(
    /'border-blue-600 text-blue-600'/g,
    "'border-blue-600 text-blue-600 dark:text-blue-400 dark:bg-slate-800/50 rounded-t-lg'"
  );
  fs.writeFileSync(finPath, content, 'utf8');
}

// 3. Pacientes Text Contrast (Light mode)
const pacPath = path.join(__dirname, '..', 'app/(dashboard)/pacientes/page.tsx');
if (fs.existsSync(pacPath)) {
  let content = fs.readFileSync(pacPath, 'utf8');
  // text-slate-500 -> text-slate-600
  // text-slate-400 -> text-slate-500
  content = content.replace(/text-slate-500/g, 'text-slate-600');
  content = content.replace(/text-slate-400/g, 'text-slate-500');
  // but wait, we already have dark:text-slate-400 which would become dark:text-slate-500, that's fine actually.
  // Let's replace text-slate-600 dark:text-slate-400 with text-slate-700 dark:text-slate-300
  content = content.replace(/text-slate-600 dark:text-slate-400/g, 'text-slate-700 dark:text-slate-300');
  // Replace remaining text-slate-600 dark:text-slate-500 if any
  content = content.replace(/text-slate-600 dark:text-slate-500/g, 'text-slate-700 dark:text-slate-400');
  fs.writeFileSync(pacPath, content, 'utf8');
}

// 4. Agenda FullCalendar Styles
const agendaPath = path.join(__dirname, '..', 'app/(dashboard)/agenda/page.tsx');
if (fs.existsSync(agendaPath)) {
  let content = fs.readFileSync(agendaPath, 'utf8');
  // .custom-calendar .fc-theme-standard th { border-color: #e2e8f0; padding: 8px 0;
  content = content.replace(
    /border-color: #e2e8f0;/g,
    "border-color: var(--calendar-border, #f1f5f9);"
  );
  content = content.replace(
    /padding: 8px 0;/g,
    "padding: 12px 0;"
  );
  content = content.replace(
    /\.custom-calendar \.fc-event \{ border-radius: 8px; padding: 3px 6px; font-size: 0\.75rem; font-weight: 600; cursor: pointer; transition: all 0\.15s ease; box-shadow: 0 2px 4px rgba\(0,0,0,0\.06\); \}/g,
    ".custom-calendar .fc-event { border-radius: 10px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.2) !important; }"
  );
  // Add dark mode support for FullCalendar inline CSS by injecting a block for .dark .custom-calendar
  if (!content.includes('.dark .custom-calendar')) {
    content = content.replace(
      /<\/style>/,
      `
                .dark .custom-calendar { --calendar-border: #1e293b; }
                .dark .custom-calendar .fc-toolbar-title { color: #f8fafc !important; }
                .dark .custom-calendar .fc-button-primary { background-color: #1e293b !important; color: #cbd5e1 !important; }
                .dark .custom-calendar .fc-theme-standard th, .dark .custom-calendar .fc-theme-standard td { border-color: #1e293b !important; }
                .dark .custom-calendar .fc-timegrid-slot:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
              </style>`
    );
  }
  fs.writeFileSync(agendaPath, content, 'utf8');
}

console.log('Polishing completed.');
