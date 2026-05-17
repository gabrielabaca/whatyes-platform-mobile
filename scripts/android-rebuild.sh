#!/usr/bin/env bash
# Rebuild Android sin `gradlew clean`: ese comando borra codegen JNI y luego
# CMake falla al limpiar referencias a carpetas que ya no existen (RN 0.76+).
set -euo pipefail

GRADLE_TASK="${1:-:app:assembleDebug}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"

echo "→ Eliminando caché CMake (.cxx)…"
rm -rf app/.cxx

echo "→ Regenerando codegen (:app:preBuild)…"
./gradlew :app:preBuild

echo "→ Compilando ($GRADLE_TASK)…"
./gradlew "$GRADLE_TASK"
