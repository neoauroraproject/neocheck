# Hot-reload frontend dev server (no Docker rebuild needed for UI changes).
# Requires backend running via Docker on port 8081 (or set SERVER_PORT).
$ErrorActionPreference = "Stop"
$port = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "8081" }
$env:BACKEND_URL = "http://localhost:$port"
Set-Location "$PSScriptRoot\frontend"
Write-Host "Frontend dev server -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "API proxy -> http://localhost:$port/api/*" -ForegroundColor Cyan
npm run dev -- -p 3000
