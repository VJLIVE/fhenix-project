# setup.ps1 — PowerShell helper to install template dependencies
param(
  [string]$ProjectRoot = "."
)

Push-Location $ProjectRoot
if (-not (Test-Path package.json)) {
  Write-Host "No package.json found in $ProjectRoot — copying template package.json into place..."
  Copy-Item -Path "$PSScriptRoot\templates\package.json" -Destination "$ProjectRoot\package.json"
}

Write-Host "Installing dependencies (this may take a minute)..."
npm install

Write-Host "Done. You can now run: npx hardhat compile"
Pop-Location
