# =============================================================================
# UNS Explorer — Build & Deploy Script (Windows PowerShell)
# =============================================================================
# Usage:
#   .\scripts\deploy.ps1              # build NSIS installer for Windows
#   .\scripts\deploy.ps1 -Dev        # start development mode (Vite + Electron)
#   .\scripts\deploy.ps1 -PackOnly   # build unpacked app (no installer, faster)
#   .\scripts\deploy.ps1 -Clean      # clean build artefacts before building
# =============================================================================

param(
    [switch]$Dev,
    [switch]$PackOnly,
    [switch]$Clean,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Colour helpers ────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n▶ $msg" -ForegroundColor Blue }
function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# ── Help ──────────────────────────────────────────────────────────────────────
if ($Help) {
    Write-Host "UNS Explorer deploy script (Windows)" -ForegroundColor White
    Write-Host "  .\scripts\deploy.ps1              Build NSIS installer"
    Write-Host "  .\scripts\deploy.ps1 -Dev         Start development mode"
    Write-Host "  .\scripts\deploy.ps1 -PackOnly    Build unpacked app (faster)"
    Write-Host "  .\scripts\deploy.ps1 -Clean       Clean dist\ and release\ first"
    exit 0
}

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  +========================================+" -ForegroundColor Blue
Write-Host "  |       UNS Explorer -- Deploy           |" -ForegroundColor Blue
Write-Host "  |   Platform: Windows                    |" -ForegroundColor Blue
Write-Host "  +========================================+" -ForegroundColor Blue
Write-Host ""

# ── Move to project root ──────────────────────────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot
Write-Info "Project root: $ProjectRoot"

# ── Check prerequisites ───────────────────────────────────────────────────────
Write-Step "Checking prerequisites"

function Require-Command {
    param($Cmd, $InstallHint)
    try {
        $ver = & $Cmd --version 2>&1 | Select-Object -First 1
        Write-Ok "$Cmd $ver"
    } catch {
        Write-Fail "$Cmd is required but not found. $InstallHint"
    }
}

Require-Command node "Install from https://nodejs.org (v18+)"
Require-Command npm  "Install from https://nodejs.org"

$nodeMajor = [int](node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if ($nodeMajor -lt 18) {
    Write-Fail "Node.js v18+ required, found $(node --version)"
}

# ── Clean artefacts ───────────────────────────────────────────────────────────
if ($Clean) {
    Write-Step "Cleaning build artefacts"
    if (Test-Path dist)    { Remove-Item -Recurse -Force dist }
    if (Test-Path release) { Remove-Item -Recurse -Force release }
    Write-Ok "Cleaned dist\ and release\"
}

# ── Install dependencies ──────────────────────────────────────────────────────
Write-Step "Installing dependencies"
$needsInstall = (-not (Test-Path node_modules)) -or
    ((Get-Item package.json).LastWriteTime -gt (Get-Item node_modules -ErrorAction SilentlyContinue)?.LastWriteTime)

if ($needsInstall) {
    npm ci --prefer-offline
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm ci failed" }
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "Dependencies up to date"
}

# ── Development mode ──────────────────────────────────────────────────────────
if ($Dev) {
    Write-Step "Starting development mode"
    Write-Info "Compiling main process..."
    npm run build:main
    if ($LASTEXITCODE -ne 0) { Write-Fail "Main process build failed" }
    Write-Info "Launching Vite + Electron..."
    npm run dev
    exit 0
}

# ── Build main process ────────────────────────────────────────────────────────
Write-Step "Compiling main process (TypeScript)"
npm run build:main
if ($LASTEXITCODE -ne 0) { Write-Fail "Main process compilation failed" }
Write-Ok "Main process compiled -> dist\src\main\"

# ── Build renderer ────────────────────────────────────────────────────────────
Write-Step "Building renderer (Vite)"
npm run build:renderer
if ($LASTEXITCODE -ne 0) { Write-Fail "Renderer build failed" }
Write-Ok "Renderer built -> dist\renderer\"

# ── Package with electron-builder ─────────────────────────────────────────────
Write-Step "Packaging with electron-builder"
if ($PackOnly) {
    Write-Info "Building unpacked app (--dir)"
    npx electron-builder --win --dir
} else {
    Write-Info "Building NSIS installer"
    npx electron-builder --win
}
if ($LASTEXITCODE -ne 0) { Write-Fail "electron-builder failed" }
Write-Ok "Package ready in release\"

# ── Show output ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Output:" -ForegroundColor White
Get-ChildItem -Path release -Recurse -Include "*.exe","*.msi" -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "    Package: $($_.FullName)" -ForegroundColor Cyan }
Write-Host ""
