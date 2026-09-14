Write-Host "Stopping Learning Ability Assessment services..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $scriptDir "logs"

function Stop-PidFileProcess {
    param(
        [string]$Name,
        [string]$PidFile
    )

    if (-not (Test-Path $PidFile)) {
        return
    }

    try {
        $procId = [int](Get-Content $PidFile -ErrorAction Stop)
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Stopped $Name PID $procId from pid file" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Could not stop $Name from pid file: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
    finally {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

function Stop-PortListener {
    param([int]$Port)
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        Write-Host "Port $Port already free." -ForegroundColor DarkGray
        return
    }

    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Stopped PID $procId on port $Port" -ForegroundColor Green
        }
        catch {
            if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
                Write-Host "Could not stop PID $procId on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
            } else {
                Write-Host "Port $Port is now free (stale PID entry ignored)." -ForegroundColor DarkGray
            }
        }
    }
}

Stop-PidFileProcess -Name "Frontend" -PidFile (Join-Path $logDir "frontend.pid")
Stop-PidFileProcess -Name "Backend" -PidFile (Join-Path $logDir "backend.pid")
Stop-PidFileProcess -Name "Whisper" -PidFile (Join-Path $logDir "whisper.pid")

Stop-PortListener -Port 3000
Stop-PortListener -Port 5000
Stop-PortListener -Port 5001

Write-Host "Done." -ForegroundColor Cyan
