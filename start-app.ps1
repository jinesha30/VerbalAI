# Learning Ability Assessment - Robust Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Learning Ability Assessment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) {
	New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Stop-PortListener {
	param([int]$Port)

	$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
	if (-not $listeners) {
		Write-Host "Port $Port is already free." -ForegroundColor DarkGray
		return
	}

	$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
	foreach ($procId in $pids) {
		try {
			Stop-Process -Id $procId -Force -ErrorAction Stop
			Write-Host "Stopped PID $procId on port $Port" -ForegroundColor Yellow
		}
		catch {
			if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
				Write-Host "Could not stop PID $procId on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
			}
			else {
				Write-Host "Port $Port is now free (stale PID entry ignored)." -ForegroundColor DarkGray
			}
		}
	}
}

function Start-DetachedService {
	param(
		[string]$Name,
		[string]$FilePath,
		[string[]]$Arguments,
		[string]$WorkingDir,
		[string]$StdOutLog,
		[string]$StdErrLog,
		[string]$PidFile
	)

	if (Test-Path $PidFile) {
		Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
	}

	$proc = Start-Process -FilePath $FilePath `
		-ArgumentList $Arguments `
		-WorkingDirectory $WorkingDir `
		-WindowStyle Hidden `
		-RedirectStandardOutput $StdOutLog `
		-RedirectStandardError $StdErrLog `
		-PassThru

	Set-Content -Path $PidFile -Value $proc.Id
	Write-Host "$Name started with PID $($proc.Id)" -ForegroundColor Green
}

function Wait-ForHealth {
	param(
		[string]$Url,
		[string]$Label,
		[int]$Retries = 45,
		[int]$DelaySeconds = 2
	)

	for ($i = 1; $i -le $Retries; $i++) {
		try {
			$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
			if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
				Write-Host "$Label is ready -> $Url ($($response.StatusCode))" -ForegroundColor Green
				return $true
			}
		}
		catch {
			Start-Sleep -Seconds $DelaySeconds
		}
	}

	Write-Host "$Label did not become ready in time -> $Url" -ForegroundColor Red
	return $false
}

Write-Host "Clearing service ports..." -ForegroundColor Yellow
Stop-PortListener -Port 5000
Stop-PortListener -Port 5001
Stop-PortListener -Port 3000

$backendOut = Join-Path $logDir "backend.out.log"
$backendErr = Join-Path $logDir "backend.err.log"
$whisperOut = Join-Path $logDir "whisper.out.log"
$whisperErr = Join-Path $logDir "whisper.err.log"
$frontendOut = Join-Path $logDir "frontend.out.log"
$frontendErr = Join-Path $logDir "frontend.err.log"

$backendPid = Join-Path $logDir "backend.pid"
$whisperPid = Join-Path $logDir "whisper.pid"
$frontendPid = Join-Path $logDir "frontend.pid"

Write-Host "" 
Write-Host "Starting Backend Server (5000)..." -ForegroundColor Green
Start-DetachedService -Name "Backend" -FilePath "node" -Arguments @("server.js") -WorkingDir "$scriptDir\backend" -StdOutLog $backendOut -StdErrLog $backendErr -PidFile $backendPid

Write-Host "Starting Whisper Service (5001)..." -ForegroundColor Green
Start-DetachedService -Name "Whisper" -FilePath "python" -Arguments @("whisper_service.py") -WorkingDir "$scriptDir\backend" -StdOutLog $whisperOut -StdErrLog $whisperErr -PidFile $whisperPid

Write-Host "Starting Frontend (3000)..." -ForegroundColor Green
Start-DetachedService -Name "Frontend" -FilePath "npm.cmd" -Arguments @("start") -WorkingDir "$scriptDir\frontend" -StdOutLog $frontendOut -StdErrLog $frontendErr -PidFile $frontendPid

Write-Host "" 
Write-Host "Waiting for services to become healthy..." -ForegroundColor Cyan
$backendOk = Wait-ForHealth -Url "http://localhost:5000/health" -Label "Backend"
$whisperOk = Wait-ForHealth -Url "http://localhost:5001/health" -Label "Whisper"
$frontendOk = Wait-ForHealth -Url "http://localhost:3000" -Label "Frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($backendOk -and $whisperOk -and $frontendOk) {
	Write-Host "All services started successfully!" -ForegroundColor Green
	Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
	Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
	Write-Host "Whisper:  http://localhost:5001" -ForegroundColor Yellow
	Start-Process "http://localhost:3000"
}
else {
	Write-Host "One or more services failed to start." -ForegroundColor Red
	Write-Host "Check logs in: $logDir" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
