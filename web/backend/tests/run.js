#!/usr/bin/env node
const { readdirSync, statSync } = require('fs');
const { join, resolve } = require('path');
const { spawnSync } = require('child_process');

function collect(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...collect(p));
    else if (name.endsWith('.test.js')) out.push(p);
  }
  return out.sort();
}

const root = resolve(process.argv[2] || 'tests');
const files = collect(root);
if (!files.length) {
  console.error(`No *.test.js files under ${root}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
