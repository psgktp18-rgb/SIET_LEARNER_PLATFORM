Write-Host "Starting Lecture Lens Native Deployment on Windows..." -ForegroundColor Cyan

$backupDir = "backups"
if (-Not (Test-Path -Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "prisma\dev.db" -Destination "$backupDir\dev_$timestamp.sqlite3" -ErrorAction SilentlyContinue

npm ci
npx prisma generate
npx prisma db push
npm run build
npm run start
