#!/bin/bash

export PATH="/Users/cadenpiper/Library/Python/3.9/bin:$PATH"

echo "🔍 Briq Smart Contract Audit Suite"
echo "=================================="

mkdir -p audit/reports

echo "1. Running Slither static analysis..."
slither . --json audit/reports/slither-full.json 2>/dev/null
slither . --print human-summary > audit/reports/slither-summary.txt 2>/dev/null
slither . --print contract-summary > audit/reports/contract-summary.txt 2>/dev/null

echo "2. Running Foundry tests..."
forge test --gas-report > audit/reports/foundry-tests.txt 2>&1

echo "3. Generating coverage report..."
forge coverage --report lcov > audit/reports/coverage.txt 2>&1

echo "✅ Audit complete! Check audit/reports/ for detailed results."
