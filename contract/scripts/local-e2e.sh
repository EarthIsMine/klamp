#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
port="${KLAMP_LOCAL_PORT:-18546}"
log_dir="$(mktemp -d)"
anvil --silent --port "$port" >"$log_dir/anvil.log" 2>&1 &
anvil_pid=$!
trap 'kill "$anvil_pid" 2>/dev/null || true; rm -rf "$log_dir"' EXIT
export RPC_URL="http://127.0.0.1:$port"
export OPERATOR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
for attempt in $(seq 1 50); do
  kill -0 "$anvil_pid" 2>/dev/null || { cat "$log_dir/anvil.log"; exit 1; }
  if cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1; then break; fi
  sleep 0.1
done
mkdir -p deployments
forge script script/LocalPhase1.s.sol:LocalPhase1 --rpc-url "$RPC_URL" --broadcast --unlocked --slow >"$log_dir/deploy.log" 2>&1 || { cat "$log_dir/deploy.log"; exit 1; }
npx tsx scripts/local-smoke.ts
