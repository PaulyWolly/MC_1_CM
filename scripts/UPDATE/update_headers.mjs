import fs from 'fs';
import path from 'path';
import pkg from 'enquirer';
const { prompt } = pkg;

const ROOT_DIRS = ['public', 'server', 'scripts'];
const EXCLUDE_DIRS = ['node_modules', 'backups'];
const EXCLUDE_PREFIXES = ['_ref_repo', '__REF-REPO'];
const EXTENSIONS = ['.js', '.css', '.html'];
const ALWAYS_INCLUDE = [
  'public/index.html',
  'public/app.js',
  'server.js'
];

function shouldExcludeDir(dir) {
  return EXCLUDE_DIRS.includes(dir) || EXCLUDE_PREFIXES.some(prefix => dir.startsWith(prefix));
}

function findFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldExcludeDir(entry.name)) continue;
      results = results.concat(findFiles(path.join(dir, entry.name)));
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function getHeader(content, ext) {
  if (ext === '.html') {
    const match = content.match(/<!--[\s\S]*?Created by [^\-]+-->/);
    return match ? match[0] : null;
  } else {
    const match = content.match(/\/\*[\s\S]*?Created by[^*]*\*\//);
    return match ? match[0] : null;
  }
}

function parseHeader(header, ext) {
  if (!header) return {};
  if (ext === '.html') {
    return {
      Version: (header.match(/Version: (.*)/) || [])[1]?.trim(),
      AppName: (header.match(/AppName: (.*)/) || [])[1]?.trim(),
      Updated: (header.match(/Updated: (.*)/) || [])[1]?.trim(),
      CreatedBy: (header.match(/Created by (.*)/) || [])[1]?.trim(),
    };
  } else {
    return {
      Version: (header.match(/Version: (.*)/) || [])[1]?.trim(),
      AppName: (header.match(/AppName: (.*)/) || [])[1]?.trim(),
      Updated: (header.match(/Updated: (.*)/) || [])[1]?.trim(),
      CreatedBy: (header.match(/Created by (.*)/) || [])[1]?.trim(),
    };
  }
}

function sanitizeNpmName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-._~]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeExitValidator(field) {
  return (input) => {
    if (["q", "x", "quit", "exit"].includes(input.trim().toLowerCase())) {
      console.log(`\nExiting gracefully from "${field}". No changes made to this or remaining files.`);
      process.exit(0);
    }
    return true;
  };
}

async function promptForHeader(current) {
  const { Version } = await prompt({
    type: 'input',
    name: 'Version',
    message: `Version: (type 'Q' or 'X' to exit)`,
    initial: current.Version || '23.0.0',
    validate: makeExitValidator('Version'),
  });
  const answers = await prompt([
    {
      type: 'input',
      name: 'AppName',
      message: `Display App Name (for UI, headers, etc.): (type 'Q' or 'X' to exit)`,
      initial: `MultiChat_Chatty [v${Version}]`,
      validate: makeExitValidator('AppName'),
    },
    {
      type: 'input',
      name: 'NpmName',
      message: `npm package name (for package.json): (type 'Q' or 'X' to exit)`,
      initial: sanitizeNpmName(`multichat_chatty-v${Version}`),
      validate: input =>
        /^[a-z0-9-._~]+$/.test(input.trim()) ||
        'Invalid npm package name! Use only lowercase letters, numbers, dashes, dots, underscores, or tildes.',
    },
    {
      type: 'input',
      name: 'Date',
      message: `Date (MM/DD/YYYY): (type 'Q' or 'X' to exit)`,
      initial: current.Updated ? current.Updated.split('@')[0].trim() : '5/16/2025',
      validate: input => {
        if (makeExitValidator('Date')(input) !== true) return false;
        const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
        return dateRegex.test(input) || 'Please enter a valid date in MM/DD/YYYY format';
      }
    },
    {
      type: 'input',
      name: 'Time',
      message: `Time (HH:MM[AM|PM]): (type 'Q' or 'X' to exit)`,
      initial: current.Updated ? current.Updated.split('@')[1].trim() : '1:00PM',
      validate: input => {
        input = input.trim();
        if (makeExitValidator('Time')(input) !== true) return false;
        const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9](AM|PM)$/i;
        if (!timeRegex.test(input)) {
          return 'Please enter a valid time in HH:MMAM or HH:MMPM format (e.g., 1:00PM, 2:30AM).';
        }
        return true;
      },
      result: input => {
        input = input.trim();
        const [time, meridiem] = input.split(/(?=[AP]M)/i);
        return time + meridiem.toUpperCase();
      }
    },
    {
      type: 'input',
      name: 'CreatedBy',
      message: `Created by: (type 'Q' or 'X' to exit)`,
      initial: current.CreatedBy || 'Paul Welby',
      validate: makeExitValidator('Created by'),
    },
  ]);
  const Updated = `${answers.Date} @${answers.Time}`;
  return { ...answers, Version, Updated };
}

function buildHeader(ext, fileName, updated) {
  if (ext === '.html') {
    return [
      '<!--',
      `  ${fileName.toUpperCase()}`,
      `  Version: ${updated.Version}`,
      `  AppName: ${updated.AppName}`,
      `  Updated: ${updated.Updated}`,
      '  Created by Paul Welby',
      '-->'
    ].join('\n');
  } else {
    return [
      '/*',
      `  ${fileName.toUpperCase()}`,
      `  Version: ${updated.Version}`,
      `  AppName: ${updated.AppName}`,
      `  Updated: ${updated.Updated}`,
      '  Created by Paul Welby',
      '*/'
    ].join('\n');
  }
}

function updateHeaderInText(content, ext, newHeader) {
  const oldHeader = getHeader(content, ext);
  if (oldHeader) {
    return content.replace(oldHeader, newHeader);
  } else {
    // Insert at the top
    return newHeader + '\n\n' + content;
  }
}

function updateIndexHtml(content, updated) {
  // Update or insert header comment
  const newHeader = [
    '<!--',
    `  INDEX.html`,
    `  Version: ${updated.Version}`,
    `  AppName: ${updated.AppName}`,
    `  Updated: ${updated.Updated}`,
    '  Created by Paul Welby',
    '-->'
  ].join('\n');
  if (/<!--[\s\S]*?Created by Paul Welby[\s\S]*?-->/.test(content)) {
    content = content.replace(/<!--[\s\S]*?Created by Paul Welby[\s\S]*?-->/, newHeader);
  } else {
    content = newHeader + '\n\n' + content;
  }
  // Update <title>
  content = content.replace(/<title>.*?<\/title>/i, `<title>${updated.AppName}</title>`);
  // Update first <h3 class="top-bar-title" ...>...</h3>
  content = content.replace(/<h3([^>]*class=["']top-bar-title["'][^>]*)>.*?<\/h3>/i,
    `<h3$1>${updated.AppName} ${updated.Updated}</h3>`);
  return content;
}

async function main() {
  console.log('=== Auto Header Updater ===');
  let allFiles = [];
  for (const root of ROOT_DIRS) {
    if (fs.existsSync(root)) {
      allFiles = allFiles.concat(findFiles(root));
    }
  }
  // Add always-include files if they exist, avoiding duplicates
  for (const file of ALWAYS_INCLUDE) {
    if (fs.existsSync(file) && !allFiles.includes(file)) {
      allFiles.push(file);
    }
  }
  if (allFiles.length === 0) {
    console.log('No files found to update.');
    return;
  }
  // Use the first file with a header as the template for defaults
  let firstHeader = { Version: '', AppName: '', Updated: '', CreatedBy: '' };
  for (const filePath of allFiles) {
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const header = getHeader(content, ext);
    if (header) {
      firstHeader = parseHeader(header, ext);
      break;
    }
  }
  const updated = await promptForHeader(firstHeader);
  const changes = [];
  for (const filePath of allFiles) {
    const ext = path.extname(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    if (filePath.endsWith('index.html')) {
      const newContent = updateIndexHtml(content, updated);
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        changes.push(filePath);
      }
      continue;
    }
    const newHeader = buildHeader(ext, path.basename(filePath), updated);
    const newContent = updateHeaderInText(content, ext, newHeader);
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      changes.push(filePath);
    }
  }
  console.log(`\nUpdated headers in ${changes.length} files:`);
  changes.forEach(f => console.log('  -', f));
}

main();
