#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git submodule update --init -- lib/ens-contracts lib/liquidity-launcher
git -C lib/ens-contracts submodule update --init --depth 1 --jobs 4
git -C lib/liquidity-launcher -c url.https://github.com/.insteadOf=git@github.com: submodule update --init --depth 1 --jobs 4 lib/uerc20-factory lib/v4-core lib/v4-periphery lib/openzeppelin-contracts lib/permit2 lib/solady
git -C lib/liquidity-launcher/lib/v4-core submodule update --init --depth 1 lib/solmate
npm ci
