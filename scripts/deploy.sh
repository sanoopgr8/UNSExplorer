#!/usr/bin/env bash
# =============================================================================
# UNS Explorer — Build & Deploy Script (Linux / macOS)
# =============================================================================
# Usage:
#   ./scripts/deploy.sh              # build installer for current platform
#   ./scripts/deploy.sh --dev        # start development mode (Vite + Electron)
#   ./scripts/deploy.sh --pack-only  # build unpacked app (no installer, faster)
#   ./scripts/deploy.sh --clean      # clean build artefacts before building
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

# ── Parse flags ───────────────────────────────────────────────────────────────
DEV_MODE=false
PACK_ONLY=false
CLEAN=false
for arg in "$@"; do
  case $arg in
    --dev)       DEV_MODE=true ;;
    --pack-only) PACK_ONLY=true ;;
    --clean)     CLEAN=true ;;
    --help|-h)
      echo -e "${BOLD}UNS Explorer deploy script${RESET}"
      echo "  ./scripts/deploy.sh              Build installer for current platform"
      echo "  ./scripts/deploy.sh --dev        Start development mode"
      echo "  ./scripts/deploy.sh --pack-only  Build unpacked app (no installer)"
      echo "  ./scripts/deploy.sh --clean      Clean dist/ and release/ first"
      exit 0 ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── Detect platform ───────────────────────────────────────────────────────────
PLATFORM="$(uname -s)"
case "$PLATFORM" in
  Linux*)  OS=linux  ;;
  Darwin*) OS=mac    ;;
  *)       error "Unsupported platform: $PLATFORM. Use deploy.ps1 on Windows." ;;
esac

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║       UNS Explorer — Deploy          ║"
echo "  ║   Platform: $(printf '%-26s' "$OS")  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ── Move to project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"
info "Project root: $PROJECT_ROOT"

# ── Check prerequisites ───────────────────────────────────────────────────────
step "Checking prerequisites"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is required but not found. $2"
  fi
  success "$1 $(${1} --version 2>&1 | head -1)"
}

check_cmd node  "Install from https://nodejs.org (v18+)"
check_cmd npm   "Install from https://nodejs.org"

NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if (( NODE_MAJOR < 18 )); then
  error "Node.js v18+ required, found $(node --version)"
fi

# macOS: check Xcode CLI tools needed by electron-builder
if [[ "$OS" == "mac" ]]; then
  if ! xcode-select -p &>/dev/null; then
    warn "Xcode Command Line Tools not found. Running: xcode-select --install"
    xcode-select --install 2>/dev/null || true
  fi
fi

# ── Clean artefacts ───────────────────────────────────────────────────────────
if [[ "$CLEAN" == true ]]; then
  step "Cleaning build artefacts"
  rm -rf dist release
  success "Cleaned dist/ and release/"
fi

# ── Install dependencies ──────────────────────────────────────────────────────
step "Installing dependencies"
if [[ ! -d node_modules ]] || [[ package.json -nt node_modules/.package-lock.json ]]; then
  npm ci --prefer-offline 2>&1 | grep -v "^npm warn"
  success "Dependencies installed"
else
  success "Dependencies up to date"
fi

# ── Development mode ──────────────────────────────────────────────────────────
if [[ "$DEV_MODE" == true ]]; then
  step "Starting development mode"
  info "Compiling main process..."
  npm run build:main
  info "Launching Vite + Electron..."
  npm run dev
  exit 0
fi

# ── Build main process ────────────────────────────────────────────────────────
step "Compiling main process (TypeScript)"
npm run build:main
success "Main process compiled → dist/src/main/"

# ── Build renderer ────────────────────────────────────────────────────────────
step "Building renderer (Vite)"
npm run build:renderer
success "Renderer built → dist/renderer/"

# ── Package with electron-builder ─────────────────────────────────────────────
step "Packaging with electron-builder"
if [[ "$PACK_ONLY" == true ]]; then
  info "Building unpacked app (--dir)"
  npx electron-builder --"$OS" --dir
  OUTPUT_DIR="release"
  success "Unpacked app ready in release/"
else
  info "Building installer for $OS"
  npx electron-builder --"$OS"
  OUTPUT_DIR="release"
  success "Installer ready in release/"
fi

# ── Show output ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ Build complete!${RESET}"
echo ""
echo -e "  ${BOLD}Output:${RESET}"
if [[ -d "$OUTPUT_DIR" ]]; then
  find "$OUTPUT_DIR" -maxdepth 2 \( -name "*.dmg" -o -name "*.AppImage" \
    -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" \) \
    -exec echo "    📦 {}" \;
  find "$OUTPUT_DIR" -maxdepth 3 -name "*.app" -prune \
    -exec echo "    📦 {}" \;
fi
echo ""
