#!/usr/bin/env node

import { mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const stateDir = path.join(rootDir, '.tmp-vite');
const stateFile = path.join(stateDir, 'dev-session.json');
const logFile = path.join(stateDir, 'dev-session.log');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function ensureStateDir() {
  mkdirSync(stateDir, { recursive: true });
}

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureStateDir();
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function clearState() {
  try {
    unlinkSync(stateFile);
  } catch {}
}

function isRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isGroupRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  if (process.platform === 'win32') {
    return isRunning(pid);
  }

  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalTree(pid, signal) {
  if (process.platform === 'win32') {
    const args = ['/pid', String(pid), '/t'];

    if (signal !== 'SIGINT') {
      args.push('/f');
    }

    const result = spawnSync('taskkill', args, { stdio: 'ignore' });
    return result.status === 0;
  }

  process.kill(-pid, signal);
  return true;
}

async function waitForExit(pid, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isGroupRunning(pid)) {
      return true;
    }

    await delay(250);
  }

  return !isGroupRunning(pid);
}

function getRunningState() {
  const state = readState();

  if (!state?.pid) {
    return null;
  }

  if (!isRunning(state.pid)) {
    clearState();
    return null;
  }

  return state;
}

async function start() {
  const runningState = getRunningState();

  if (runningState) {
    console.log(`WorldForge dev session is already running (pid ${runningState.pid}).`);
    console.log(`Log: ${runningState.logFile ?? logFile}`);
    return;
  }

  ensureStateDir();
  rmSync(logFile, { force: true });
  const logFd = openSync(logFile, 'w');

  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });

  child.unref();

  const state = {
    pid: child.pid,
    logFile,
    startedAt: new Date().toISOString(),
  };

  writeState(state);

  await delay(1500);

  if (!isRunning(child.pid)) {
    clearState();
    console.error('WorldForge dev session exited during startup.');
    console.error(`Inspect the log: ${logFile}`);
    process.exitCode = 1;
    return;
  }

  console.log('WorldForge dev session started.');
  console.log(`PID: ${child.pid}`);
  console.log(`Log: ${logFile}`);
}

async function stop() {
  const state = readState();

  if (!state?.pid) {
    console.log('WorldForge dev session is not running.');
    return;
  }

  if (!isRunning(state.pid)) {
    clearState();
    console.log('WorldForge dev session was already stopped. Removed stale state.');
    return;
  }

  console.log(`Stopping WorldForge dev session (pid ${state.pid})...`);

  try {
    signalTree(state.pid, 'SIGINT');
  } catch (error) {
    if (!isGroupRunning(state.pid)) {
      clearState();
      console.log('WorldForge dev session already exited.');
      return;
    }

    throw error;
  }

  if (await waitForExit(state.pid, 8000)) {
    clearState();
    console.log('WorldForge dev session stopped cleanly.');
    return;
  }

  console.log('WorldForge dev session did not exit after SIGINT. Sending SIGTERM...');
  signalTree(state.pid, 'SIGTERM');

  if (await waitForExit(state.pid, 4000)) {
    clearState();
    console.log('WorldForge dev session stopped after SIGTERM.');
    return;
  }

  console.log('WorldForge dev session still running. Sending SIGKILL...');
  signalTree(state.pid, 'SIGKILL');

  if (await waitForExit(state.pid, 2000)) {
    clearState();
    console.log('WorldForge dev session was force-stopped.');
    return;
  }

  console.error('Failed to stop the WorldForge dev session.');
  process.exitCode = 1;
}

function status() {
  const state = getRunningState();

  if (!state) {
    console.log('WorldForge dev session is not running.');
    return;
  }

  console.log('WorldForge dev session is running.');
  console.log(`PID: ${state.pid}`);
  console.log(`Started: ${state.startedAt}`);
  console.log(`Log: ${state.logFile ?? logFile}`);
}

async function restart() {
  await stop();

  if (process.exitCode && process.exitCode !== 0) {
    return;
  }

  await start();
}

function usage() {
  console.log('Usage: node scripts/dev-session.mjs <start|stop|restart|status>');
}

const command = process.argv[2];

switch (command) {
  case 'start':
    await start();
    break;
  case 'stop':
    await stop();
    break;
  case 'restart':
    await restart();
    break;
  case 'status':
    status();
    break;
  default:
    usage();
    process.exitCode = 1;
}
