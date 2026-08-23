<#
.SYNOPSIS
    Installs the Aurelinx OS trusted root certificate on Windows.
.DESCRIPTION
    This script imports Aurelinx.cer into the Local Machine's Trusted Root Certification
    Authorities store so Windows Defender SmartScreen permanently trusts Aurelinx OS executables.
.NOTES
    Requires Administrator privileges.
#>

param (
    [string]$CertPath = "$PSScriptRoot\Aurelinx.cer"
)

# Elevate script to Administrator if not already elevated
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting Administrator privileges to trust Aurelinx OS certificate..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

if (-not (Test-Path -Path $CertPath)) {
    Write-Host "Error: Certificate file '$CertPath' not found." -ForegroundColor Red
    Pause
    exit 1
}

try {
    Write-Host "Installing Aurelinx OS Certificate into Windows Trusted Root Store..." -ForegroundColor Cyan
    $cert = Import-Certificate -FilePath $CertPath -CertStoreLocation Cert:\LocalMachine\Root
    Write-Host "Successfully installed Aurelinx OS Certificate!" -ForegroundColor Green
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor Gray
    Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Windows will now permanently trust Aurelinx OS desktop applications." -ForegroundColor Green
}
catch {
    Write-Host "Failed to install certificate: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
[Console]::ReadKey() | Out-Null
