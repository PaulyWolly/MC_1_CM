import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.MULTICHAT_ACCESS_TOKEN;

const REPO_OWNER = 'PaulyWolly'; // TODO: Replace with your GitHub username or org
const REPO_NAME = 'MultiChat_Chatty'; // TODO: Replace with your repo name

const RELEASE_NOTES_PATH = path.resolve('./RELEASE-NOTES.md');
const README_PATH = path.resolve('./README.md');

if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN not found in .env');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

function getLastReleaseDate() {
  if (!fs.existsSync(RELEASE_NOTES_PATH)) return null;
  const content = fs.readFileSync(RELEASE_NOTES_PATH, 'utf-8');
  const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/); // ISO date
  return dateMatch ? new Date(dateMatch[0]) : null;
}

function getLocalCommits(since) {
  let cmd = 'git log --pretty=format:"%H|%ad|%s" --date=iso';
  if (since) cmd += ` --since=\"${since.toISOString()}\"`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  return output.split('\n').map(line => {
    const [hash, date, message] = line.split('|');
    return { hash, date: date.trim(), message: message.trim() };
  });
}

async function getGitHubData(since) {
  // Fetch PRs
  const prs = await octokit.paginate(octokit.pulls.list, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });
  const newPRs = prs.filter(pr => new Date(pr.merged_at || pr.closed_at) > since);

  // Fetch Issues
  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });
  const newIssues = issues.filter(issue => !issue.pull_request && new Date(issue.closed_at) > since);

  // Fetch Commits
  const commits = await octokit.paginate(octokit.repos.listCommits, {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    since: since.toISOString(),
    per_page: 100,
  });
  return { newPRs, newIssues, commits };
}

function dedupeAndFormat(commits, prs, issues, version) {
  const seen = new Set();
  const bullets = [];
  
  // Get the current date for the version header
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // Add version header
  bullets.push(`## v${version} (${dateStr})`);
  bullets.push('');  // Empty line after header
  
  for (const c of commits) {
    const key = c.message || c.commit && c.commit.message;
    if (!seen.has(key)) {
      bullets.push(`- [${c.date || c.commit.author.date.split('T')[0]}] Commit: ${key}`);
      seen.add(key);
    }
  }
  for (const pr of prs) {
    const key = pr.title;
    if (!seen.has(key)) {
      bullets.push(`- [${(pr.merged_at || pr.closed_at).split('T')[0]}] PR: ${key}`);
      seen.add(key);
    }
  }
  for (const issue of issues) {
    const key = issue.title;
    if (!seen.has(key)) {
      bullets.push(`- [${issue.closed_at.split('T')[0]}] Issue: ${key}`);
      seen.add(key);
    }
  }
  return bullets.join('\n');
}

function prependToFile(filePath, content) {
  const old = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  fs.writeFileSync(filePath, `${content}\n\n${old}`);
}

function appendToWhatsNew(filePath, content) {
  let file = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const whatsNewHeader = '## What\'s new';
  if (!file.includes(whatsNewHeader)) {
    file += `\n\n${whatsNewHeader}\n`;
  }
  file = file.replace(
    /(## What\'s new[\s\S]*?)(\n## |$)/,
    (match, p1, p2) => `${p1}\n${content}${p2}`
  );
  fs.writeFileSync(filePath, file);
}

async function main() {
  const lastDate = getLastReleaseDate() || new Date(0);
  const localCommits = getLocalCommits(lastDate);
  const { newPRs, newIssues, commits } = await getGitHubData(lastDate);
  
  // Prompt for version number
  const { version } = await inquirer.prompt([
    {
      type: 'input',
      name: 'version',
      message: 'Enter version number (e.g., 1.0.0):',
      default: '1.0.0',
      validate: input => /^\d+\.\d+\.\d+$/.test(input) || 'Please enter a valid version number (e.g., 1.0.0)'
    }
  ]);
  
  // Update the version in dedupeAndFormat
  const bullets = dedupeAndFormat(localCommits, newPRs, newIssues, version);
  
  if (!bullets.trim()) {
    console.log('No new changes found since last release note.');
    return;
  }
  console.log("DEBUG: About to prompt for editing release notes...");

  const { userEdit } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'userEdit',
      message: 'Review and edit the following release notes:',
      default: bullets,
      editor: "notepad.exe"
    },
  ]);

  console.log("DEBUG: Editor prompt finished. userEdit:", userEdit);
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Does this look okay?',
      default: true,
    },
  ]);
  if (!confirm) {
    console.log('Aborted by user.');
    return;
  }
  prependToFile(RELEASE_NOTES_PATH, userEdit);
  appendToWhatsNew(README_PATH, userEdit);
  console.log('RELEASE-NOTES.md and README.md updated!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 