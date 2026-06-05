#!/usr/bin/env node
/**
 * UNS Explorer — Cross-platform deploy entry point
 * Delegates to deploy.ps1 on Windows, deploy.sh on Linux/macOS.
 *
 * Usage:
 *   node scripts/deploy.js [--dev] [--pack-only] [--clean]
 *   npm run deploy -- [--dev] [--pack-only] [--clean]
 */

const { execFileSync } = require('child_process')
const path = require('path')
const os = require('os')

const args = process.argv.slice(2)
const scriptsDir = __dirname

if (os.platform() === 'win32') {
  // Windows — run PowerShell script
  const ps1 = path.join(scriptsDir, 'deploy.ps1')
  const psArgs = args.map(a => {
    if (a === '--dev')       return '-Dev'
    if (a === '--pack-only') return '-PackOnly'
    if (a === '--clean')     return '-Clean'
    if (a === '--help')      return '-Help'
    return a
  })
  execFileSync(
    'powershell.exe',
    ['-ExecutionPolicy', 'Bypass', '-File', ps1, ...psArgs],
    { stdio: 'inherit', cwd: path.dirname(scriptsDir) }
  )
} else {
  // Linux / macOS — run bash script
  const sh = path.join(scriptsDir, 'deploy.sh')
  execFileSync('bash', [sh, ...args], {
    stdio: 'inherit',
    cwd: path.dirname(scriptsDir),
  })
}
