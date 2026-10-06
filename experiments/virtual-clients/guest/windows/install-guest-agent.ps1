param(
  [Parameter(Mandatory = $true)]
  [string]$AgentSource
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path -LiteralPath $AgentSource -PathType Leaf)) {
  throw "Guest Agent binary not found: $AgentSource"
}

$root = Join-Path $env:ProgramData 'M-Bedrock\VirtualClients'
$agent = Join-Path $root 'virtual-guest-agent.exe'
New-Item -ItemType Directory -Path $root -Force | Out-Null
Copy-Item -LiteralPath $AgentSource -Destination $agent -Force

$action = New-ScheduledTaskAction -Execute $agent
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'M-Bedrock Virtual Guest Agent' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$rule = Get-NetFirewallRule -DisplayName 'M-Bedrock Virtual Guest Agent' -ErrorAction SilentlyContinue
if (!$rule) {
  New-NetFirewallRule -DisplayName 'M-Bedrock Virtual Guest Agent' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 47831 -RemoteAddress LocalSubnet -Profile Any | Out-Null
}

Start-ScheduledTask -TaskName 'M-Bedrock Virtual Guest Agent'
