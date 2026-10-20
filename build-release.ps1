# ------------------------------------------------------------
# Impact Model - Build & Package Script
# Usage (from the project root):   .\build-release.ps1
# Output: release\Impact-Model-Build-<date>.zip
# ------------------------------------------------------------
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$date = Get-Date -Format 'yyyyMMdd-HHmm'
$name = "Impact-Model-Build-$date"
$root = Join-Path $PSScriptRoot "release\$name"

Write-Host "`n[1/4] Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Write-Host "`n[2/4] Building backend..." -ForegroundColor Cyan
Push-Location server
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Backend build failed" }
Pop-Location

Write-Host "`n[3/4] Assembling package..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$root\frontend", "$root\backend\prisma" -Force | Out-Null
Copy-Item "dist\*" "$root\frontend" -Recurse
Copy-Item "server\dist" "$root\backend\dist" -Recurse
Copy-Item "server\package.json", "server\.env" "$root\backend"
if (Test-Path "server\package-lock.json") { Copy-Item "server\package-lock.json" "$root\backend" }
Copy-Item "server\prisma\schema.prisma" "$root\backend\prisma"
Copy-Item "DEPLOYMENT.md" $root

Write-Host "`n[4/4] Creating zip (may take a few minutes because of the demo video)..." -ForegroundColor Cyan
Compress-Archive -Path "$root\*" -DestinationPath "release\$name.zip" -CompressionLevel Optimal

$zip = Get-Item "release\$name.zip"
Write-Host "`nDone: $($zip.FullName)  ($([math]::Round($zip.Length / 1MB, 1)) MB)" -ForegroundColor Green
