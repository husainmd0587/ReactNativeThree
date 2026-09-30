$ErrorDir = "E:\projects\errors"
$ErrorFile = Join-Path $ErrorDir "react-native-8082.log"
$Port = 8082

New-Item -ItemType Directory -Force -Path $ErrorDir | Out-Null

Write-Host "Checking port $Port..." -ForegroundColor Cyan

# Stop anything using 8082
$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($connection in $connections) {
        $processId = $connection.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "Stopping $($process.ProcessName) PID $processId on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }

    Start-Sleep -Seconds 1
}

# Clear old log
Remove-Item $ErrorFile -Force -ErrorAction SilentlyContinue

Write-Host "Starting Metro on PORT $Port..." -ForegroundColor Green

"============================================================" | Set-Content $ErrorFile
"React Native Metro Server" | Add-Content $ErrorFile
"Port: $Port" | Add-Content $ErrorFile
"Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Add-Content $ErrorFile
"Command: npx react-native start --port $Port" | Add-Content $ErrorFile
"============================================================" | Add-Content $ErrorFile

# IMPORTANT: explicitly pass 8082 to React Native CLI
npx react-native start --port $Port 2>&1 |
    ForEach-Object {
        $line = $_.ToString()
        $line = $line -replace '\x1B\[[0-9;?]*[ -/]*[@-~]', ''

        Write-Host $line
        Add-Content -Path $ErrorFile -Value $line -Encoding utf8
    }