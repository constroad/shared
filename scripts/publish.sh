#!/usr/bin/env bash
# Publishes a version of @constroad/planilla and takes it to every app in
# apps.conf. Run it on YOUR machine, never on the mini:
#
#   scripts/publish.sh 0.2.0
#
# 1. Tests, version bump on main, and a release commit OUTSIDE main with dist/
#    (the only commit that carries it); tag vX.Y.Z on it, pushed.
# 2. Each app: the dependency moves to the new tag and its constroad-gates run
#    (its tests, golden cases included) on that commit.
# 3. All green → each app is pushed (Torre's watcher deploys it). One red →
#    no app is pushed and each goes back to where it was: all or none.
set -euo pipefail

VERSION="${1:?usage: scripts/publish.sh X.Y.Z}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must be X.Y.Z"; exit 1; }
TAG="v$VERSION"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPENDENCY="@constroad/planilla@git+ssh://git@github.com/constroad/planilla.git#$TAG"
GATES="${GATES:-$(ls -d "$HOME"/.claude/plugins/cache/constroad-skills/constroad-gates/*/scripts/gates.sh 2>/dev/null | sort -V | tail -1)}"
[ -f "$GATES" ] || { echo "constroad-gates not found (set GATES=<path to gates.sh>)"; exit 1; }

require_clean_main() {
  local repo="$1"
  [ "$(git -C "$repo" rev-parse --abbrev-ref HEAD)" = main ] || { echo "$repo is not on main"; return 1; }
  [ -z "$(git -C "$repo" status --porcelain)" ] || { echo "$repo has uncommitted changes"; return 1; }
  git -C "$repo" pull --ff-only -q origin main || { echo "$repo cannot fast-forward to origin/main"; return 1; }
}

release() {
  require_clean_main "$ROOT" || exit 1
  cd "$ROOT"
  git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && { echo "$TAG already exists"; exit 1; }
  npm pkg set version="$VERSION"
  sed -i '' "s/PLANILLA_VERSION = '[^']*'/PLANILLA_VERSION = '$VERSION'/" src/version.ts
  npm test --silent
  npm run -s typecheck
  git diff --quiet || git commit -qam "release: $TAG"
  git push -q origin main
  npm run -s build
  git checkout -q --detach
  git add -f dist
  git commit -qm "build: dist de $TAG"
  git tag -a "$TAG" -m "$TAG"
  git push -q origin "$TAG"
  git checkout -q main
  rm -rf dist
  echo "✓ $TAG published"
}

PREPARED=()
BEFORE=()
rollback() {
  for index in "${!PREPARED[@]}"; do
    git -C "${PREPARED[$index]}" reset -q --hard "${BEFORE[$index]}"
    echo "↩ ${PREPARED[$index]} back to ${BEFORE[$index]:0:7}"
  done
}

bump_app() {
  local name="$1" repo="$2" dirs="$3"
  # Called inside `if !`, where `set -e` does not apply: every step returns on failure.
  require_clean_main "$repo" || return 1
  BEFORE+=("$(git -C "$repo" rev-parse HEAD)")
  PREPARED+=("$repo")
  IFS=',' read -ra packages <<<"$dirs"
  for dir in "${packages[@]}"; do
    (cd "$repo/$dir" && npm install --save --no-audit --no-fund --silent "$DEPENDENCY") || return 1
    git -C "$repo" add "$dir/package.json" "$dir/package-lock.json" || return 1
  done
  git -C "$repo" commit -qm "chore(planilla): $TAG" || return 1
  local log="/tmp/planilla-gates-$name.log"
  if (cd "$repo" && bash "$GATES" >"$log" 2>&1); then echo "✓ $name: gates green"; else echo "✗ $name: gates red (log: $log)"; return 1; fi
}

release
while read -r name repo dirs; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  repo="${repo/#\~/$HOME}"
  if ! bump_app "$name" "$repo" "$dirs"; then
    rollback
    echo "No app was pushed. $TAG exists but nobody uses it: fix and publish a new version."
    exit 1
  fi
done <"$ROOT/scripts/apps.conf"

for repo in "${PREPARED[@]}"; do
  git -C "$repo" push -q origin main
  echo "↑ $repo pushed"
done
