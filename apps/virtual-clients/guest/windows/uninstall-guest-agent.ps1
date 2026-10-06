$ErrorActionPreference = 'Stop'

Unregister-ScheduledTask -TaskName 'M-Bedrock Virtual Guest Agent' -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'M-Bedrock Virtual Guest Agent' -ErrorAction SilentlyContinue

$root = Join-Path $env:ProgramData 'M-Bedrock\VirtualClients'
if (Test-Path -LiteralPath $root) {
  Remove-Item -LiteralPath $root -Recurse -Force
}
