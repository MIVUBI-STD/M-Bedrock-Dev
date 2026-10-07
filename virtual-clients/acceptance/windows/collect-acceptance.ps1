param(
  [string]$VirtualClients = 'virtual-clients.exe',
  [string]$OutputDirectory = '',
  [switch]$VerifyIdentities
)

$ErrorActionPreference = 'Stop'

if (!$OutputDirectory) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutputDirectory = Join-Path $env:TEMP "M-Bedrock-VirtualClients-Acceptance-$stamp"
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Invoke-VirtualClientsJson {
  param(
    [Parameter(Mandatory = $true)] [string]$Name,
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )

  $stdout = Join-Path $OutputDirectory "$Name.json"
  $stderr = Join-Path $OutputDirectory "$Name.stderr.txt"
  $process = Start-Process -FilePath $VirtualClients -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  if ($process.ExitCode -ne 0) {
    $detail = if (Test-Path -LiteralPath $stderr) { (Get-Content -LiteralPath $stderr -Raw).Trim() } else { '' }
    throw "$Name failed with exit code $($process.ExitCode): $detail"
  }

  try {
    return Get-Content -LiteralPath $stdout -Raw | ConvertFrom-Json
  } catch {
    throw "$Name did not return valid JSON."
  }
}

$doctor = (Invoke-VirtualClientsJson -Name 'doctor' -Arguments @('doctor')).data
$status = (Invoke-VirtualClientsJson -Name 'status' -Arguments @('status')).data

$identityProof = $null
if ($VerifyIdentities) {
  $identityProof = (Invoke-VirtualClientsJson -Name 'verify-identities' -Arguments @('verify-identities')).data
  $doctor = (Invoke-VirtualClientsJson -Name 'doctor-after-verify' -Arguments @('doctor')).data
  $status = (Invoke-VirtualClientsJson -Name 'status-after-verify' -Arguments @('status')).data
}

$diagnostics = (Invoke-VirtualClientsJson -Name 'diagnostics' -Arguments @('diagnostics')).data
$resources = (Invoke-VirtualClientsJson -Name 'resources-3' -Arguments @('resources', '3')).data

$virtuals = @($status.clients | Where-Object { $_.native -eq $false })
if ($virtuals.Count -ne 3) {
  throw "Expected exactly three Virtual clients, found $($virtuals.Count)."
}

if ($VerifyIdentities) {
  foreach ($virtual in $virtuals) {
    if ([string]$virtual.vmIdentity -ne 'UNIQUE' -or [string]$virtual.windowsIdentity -ne 'UNIQUE') {
      throw "$($virtual.id) did not remain identity-unique after verify-identities."
    }
  }
}

$summary = [ordered]@{
  schema = 1
  capturedAt = (Get-Date).ToString('o')
  appVersion = $diagnostics.appVersion
  platform = $doctor.platform
  provider = $doctor.provider
  baseState = $doctor.baseState
  readyForProvisioning = [bool]$doctor.readyForProvisioning
  runtimeProfileParity = [string]$doctor.runtimeProfile.parity
  pressure = [string]$status.pressure.level
  virtuals = @(
    $virtuals | ForEach-Object {
      [ordered]@{
        id = $_.id
        state = [string]$_.state
        readySnapshot = $_.readySnapshot
        guestToolsReady = $_.guestToolsReady
        guestAgentReady = $_.guestAgentReady
        guestAgentVersion = $_.guestAgentVersion
        connectionHealth = $_.connectionHealth
        interactiveLauncherReady = $_.interactiveLauncherReady
        minecraftRunning = $_.minecraftRunning
        minecraftVersion = $_.minecraftVersion
        lineageParity = [string]$_.lineageParity
        versionParity = [string]$_.versionParity
        vmIdentity = [string]$_.vmIdentity
        windowsIdentity = [string]$_.windowsIdentity
      }
    }
  )
  virtualHardware = @(
    $diagnostics.virtualHardware | ForEach-Object {
      [ordered]@{
        id = $_.id
        networkMode = $_.networkMode
        networkConfigurationObserved = $_.networkConfigurationObserved
        multiplayerVerified = $_.multiplayerVerified
        graphics3dEnabled = $_.graphics3dEnabled
        graphicsPolicyReady = $_.graphicsPolicyReady
      }
    }
  )
  host = [ordered]@{
    logicalCpus = $diagnostics.host.logicalCpus
    totalMemoryMb = $diagnostics.host.totalMemoryMb
    availableMemoryMb = $diagnostics.host.availableMemoryMb
    hypervisorPresent = $diagnostics.host.hypervisorPresent
    vbsStatus = $diagnostics.host.vbsStatus
    graphics = @($diagnostics.host.graphics)
  }
  resources = [ordered]@{
    requestedVirtualClients = $resources.requestedVirtualClients
    runningVirtualClients = $resources.runningVirtualClients
    suspendedVirtualClients = $resources.suspendedVirtualClients
    stoppedVirtualClients = $resources.stoppedVirtualClients
    virtualMemoryLimitMb = $resources.virtualMemoryLimitMb
    observedWorkingSetMb = $resources.observedWorkingSetMb
    observedWorkingSetInstances = $resources.observedWorkingSetInstances
  }
  identityVerificationRequested = [bool]$VerifyIdentities
  identityVerificationCaptured = ($null -ne $identityProof)
}

$summaryPath = Join-Path $OutputDirectory 'summary.json'
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding utf8

[ordered]@{
  outputDirectory = $OutputDirectory
  summary = $summaryPath
  files = @(Get-ChildItem -LiteralPath $OutputDirectory -File | Sort-Object Name | Select-Object -ExpandProperty Name)
} | ConvertTo-Json -Depth 5
