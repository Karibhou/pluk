// Boolean flags given an explicit value: only true/false are accepted.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = join(process.cwd(), 'dist', 'cli.js');

let scratch;
let stubBin;
let tmuxLog;

before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'pluk-bool-'));
  stubBin = join(scratch, 'bin');
  mkdirSync(stubBin, { recursive: true });
  tmuxLog = join(scratch, 'tmux.log');
  // Append each argv line so tests can assert which send-keys calls happened.
  writeFileSync(join(stubBin, 'tmux'), `#!/bin/sh\necho "$@" >> "${tmuxLog}"\nexit 0\n`);
  chmodSync(join(stubBin, 'tmux'), 0o755);
});

after(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function tmuxCalls() {
  if (!existsSync(tmuxLog)) return [];
  return readFileSync(tmuxLog, 'utf-8').split('\n').filter(Boolean);
}

function runCli(args) {
  rmSync(tmuxLog, { force: true });
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 15000,
    env: { ...process.env, NO_COLOR: '1', PATH: `${stubBin}:${process.env.PATH}` },
  });
  return { code: res.status, stderr: res.stderr ?? '' };
}

test('--enter=1 is rejected with exit 2 and a boolean hint', () => {
  const { code, stderr } = runCli(['send', 's', '--text=x', '--enter=1']);
  assert.equal(code, 2);
  assert.match(stderr, /--enter is a boolean flag: use --enter or --enter=false/);
});

test('--dangerous=on is rejected with exit 2', () => {
  const { code, stderr } = runCli(['sessions', '--dangerous=on']);
  assert.equal(code, 2);
  assert.match(stderr, /--dangerous is a boolean flag/);
});

test('--enter=false is accepted and sends no Enter keypress', () => {
  const { code, stderr } = runCli(['send', 's', '--text=x', '--enter=false']);
  assert.equal(code, 0, stderr);
  const sendKeys = tmuxCalls().filter((c) => c.startsWith('send-keys'));
  assert.ok(sendKeys.length > 0, 'expected the text to be sent');
  assert.ok(!sendKeys.some((c) => /\bEnter$/.test(c)), `unexpected Enter keypress: ${sendKeys}`);
});

test('--enter=true is accepted and sends a separate Enter keypress', () => {
  const { code, stderr } = runCli(['send', 's', '--text=x', '--enter=true']);
  assert.equal(code, 0, stderr);
  const sendKeys = tmuxCalls().filter((c) => c.startsWith('send-keys'));
  assert.ok(sendKeys.some((c) => /\bEnter$/.test(c)), `expected an Enter keypress: ${sendKeys}`);
});
