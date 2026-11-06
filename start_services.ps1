Write-Host "=================================================" -ForegroundColor Red
Write-Host " Starting Airtel Business SYNC Full-Stack System " -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Red

# 1. Start FastAPI Backend on Port 8000
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000" -NoNewWindow

Start-Sleep -Seconds 3

# 2. Start Next.js Frontend on Port 3000
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
Set-Location -Path "frontend"
npm run dev
