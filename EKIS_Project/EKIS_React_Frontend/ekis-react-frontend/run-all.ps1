$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found. Install Node.js 18+ first."
}

$backend = Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "backend\run.ps1") -PassThru
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; if (-not (Test-Path '.env')) { Copy-Item .env.example .env }; npm install; npm run dev -- --host 127.0.0.1" -PassThru

Write-Host "Backend process: $($backend.Id) -> http://127.0.0.1:8000"
Write-Host "Frontend process: $($frontend.Id) -> http://127.0.0.1:5173"
Write-Host "Close the two opened PowerShell windows to stop both services."
