#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef SourceDir
  #error SourceDir is required
#endif

[Setup]
AppId={{9C43645A-B9CF-4D02-B0D7-8EA26D53BA42}
AppName=M-Bedrock Virtual Clients
AppVersion={#AppVersion}
AppPublisher=MIVUBI-STD
DefaultDirName={localappdata}\Programs\M-Bedrock Virtual Clients
DefaultGroupName=M-Bedrock Virtual Clients
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=dist
OutputBaseFilename=M-Bedrock-Virtual-Clients-{#AppVersion}-windows-x86_64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=M-Bedrock Virtual Clients
VersionInfoVersion={#AppVersion}

[Files]
Source: "{#SourceDir}\virtual-clients.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\virtual-clients-bridge.exe"; DestDir: "{app}\bridge"; Flags: ignoreversion
Source: "{#SourceDir}\virtual-guest-agent.exe"; DestDir: "{app}\guest"; Flags: ignoreversion
Source: "..\..\guest\windows\*.ps1"; DestDir: "{app}\guest\windows"; Flags: ignoreversion
Source: "..\..\acceptance\windows\*.ps1"; DestDir: "{app}\acceptance\windows"; Flags: ignoreversion
Source: "..\release-channel.json"; DestDir: "{app}\distribution"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Software\MIVUBI-STD\M-Bedrock Virtual Clients"; ValueType: string; ValueName: "InstallDir"; ValueData: "{app}"; Flags: uninsdeletekey

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
