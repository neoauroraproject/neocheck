# Rebuild and restart NeoCheck after frontend/backend code changes.
# Docker does NOT mount source code — you must rebuild the image to see UI changes.
param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($NoCache) {
    docker compose build --no-cache frontend
} else {
    docker compose build frontend
}

docker compose up -d
$port = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "8081" }
Write-Host ""
Write-Host "NeoCheck is running at http://localhost:$port" -ForegroundColor Green
Write-Host "For hot-reload UI dev, run: .\dev-frontend.ps1  then open http://localhost:3000" -ForegroundColor Cyan
Write-Host "Hard-refresh the browser (Ctrl+Shift+R) if the old UI is still cached." -ForegroundColor Yellow
