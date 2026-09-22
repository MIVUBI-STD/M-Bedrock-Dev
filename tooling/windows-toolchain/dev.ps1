param(
    [Parameter(Position=0)]
    [ValidateSet("setup","check","test","inspect","finalize-local","help")]
    [string]$Command = "help",

    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Push-Location $Root
try {
    switch ($Command) {
        "setup" {
            npm install --no-audit --no-fund
        }
        "check" {
            npm run verify:full
        }
        "test" {
            npm test -- @Arguments
        }
        "inspect" {
            if (-not $Arguments -or $Arguments.Count -lt 1) {
                throw "Usage: DEV.cmd inspect <path-to-artifact>"
            }
            npm run cli -- inspect $Arguments[0]
        }
        "finalize-local" {
            npm run verify:full
        }
        default {
            Write-Host "M-Bedrock-Dev"
            Write-Host "  DEV.cmd setup"
            Write-Host "  DEV.cmd check"
            Write-Host "  DEV.cmd test [vitest args]"
            Write-Host "  DEV.cmd inspect <artifact>"
            Write-Host "  DEV.cmd finalize-local"
        }
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
