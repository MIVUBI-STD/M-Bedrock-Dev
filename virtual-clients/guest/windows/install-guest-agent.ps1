param(
  [Parameter(Mandatory = $true)]
  [string]$AgentSource
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path -LiteralPath $AgentSource -PathType Leaf)) {
  throw "Guest Agent binary not found: $AgentSource"
}

$vmtoolsd = Join-Path $env:ProgramFiles 'VMware\VMware Tools\vmtoolsd.exe'
if (!(Test-Path -LiteralPath $vmtoolsd -PathType Leaf)) {
  throw "VMware Tools is required before installing the Guest Agent: $vmtoolsd"
}

$root = Join-Path $env:ProgramData 'M-Bedrock\VirtualClients'
$agent = Join-Path $root 'virtual-guest-agent.exe'
New-Item -ItemType Directory -Path $root -Force | Out-Null
Copy-Item -LiteralPath $AgentSource -Destination $agent -Force

$action = New-ScheduledTaskAction -Execute $agent
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'M-Bedrock Virtual Guest Agent' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$publicDesktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
$interactiveSetup = Join-Path $publicDesktop 'Enable Virtual Clients Launcher.cmd'
@"
@echo off
"$agent" --register-interactive-launcher
if errorlevel 1 (
  echo.
  echo Virtual Clients launcher setup failed.
  pause
  exit /b 1
)
echo.
echo Virtual Clients launcher is enabled for this Windows user.
echo Sign out and back in once before continuing account setup.
pause
"@ | Set-Content -LiteralPath $interactiveSetup -Encoding ASCII

$rule = Get-NetFirewallRule -DisplayName 'M-Bedrock Virtual Guest Agent' -ErrorAction SilentlyContinue
if ($rule) {
  $rule | Remove-NetFirewallRule
}
New-NetFirewallRule -DisplayName 'M-Bedrock Virtual Guest Agent' -Direction Inbound -Action Allow -Program $agent -Protocol TCP -LocalPort 47831 -RemoteAddress LocalSubnet -Profile Any | Out-Null

