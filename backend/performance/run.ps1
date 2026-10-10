# Runs a short warm-up and three bounded production load tests.
[CmdletBinding()]
param([string]$BaseUrl = 'https://api-brn.stratiumhub.com', [int]$ProductId = 3)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) { throw 'Install k6 before running this script.' }
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force results | Out-Null
    $runId = Get-Date -Format 'yyyyMMdd-HHmmss'
    & k6 run --quiet -e "BASE_URL=$BaseUrl" -e "PRODUCT_ID=$ProductId" -e VUS=2 -e DURATION=30s -e "RESULT_FILE=results/$runId-warmup.json" api.js
    if ($LASTEXITCODE -notin @(0, 99)) { throw 'Warm-up failed.' }
    foreach ($users in @(10, 50, 100)) {
        $result = "results/$runId-vus-$users.json"
        & k6 run --quiet -e "BASE_URL=$BaseUrl" -e "PRODUCT_ID=$ProductId" -e "VUS=$users" -e DURATION=60s -e "RESULT_FILE=$result" api.js
        if ($LASTEXITCODE -notin @(0, 99)) { throw 'Test stopped; inspect the result before continuing.' }
        $report = Get-Content -LiteralPath $result -Raw | ConvertFrom-Json
        if (@($report.rows | Where-Object { $_.error_rate -ge 0.05 -or $_.p95_ms -ge 5000 }).Count -gt 0) {
            throw 'Safety limit reached; higher loads were skipped.'
        }
    }
    Get-ChildItem -Path "results/$runId-vus-*.json" | ForEach-Object {
        (Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json).rows
    } | Sort-Object vus, endpoint | Export-Csv -LiteralPath "results/$runId-summary.csv" -NoTypeInformation -Encoding utf8
    Write-Host "Results saved in $PSScriptRoot/results ($runId)."
} finally { Pop-Location }
