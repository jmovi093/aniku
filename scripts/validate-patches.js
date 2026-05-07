#!/usr/bin/env node
/**
 * Validates TypeScript syntax of patched node_modules files using @babel/parser.
 * Run after `npm ci` (post-postinstall) to catch broken patches before the build.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const DIRS_TO_CHECK = [
  path.join(__dirname, '../node_modules/react-native-screens/src/fabric'),
];

let errors = 0;

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['typescript'] });
  } catch (e) {
    console.error(`SYNTAX ERROR: ${filePath}\n  ${e.message}`);
    errors++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.ts') || f.endsWith('.tsx')) checkFile(full);
  });
}

DIRS_TO_CHECK.forEach(walk);

if (errors > 0) {
  console.error(`\n${errors} file(s) failed syntax check. Fix patches before building.`);
  process.exit(1);
} else {
  console.log('Patch syntax validation passed.');
}
