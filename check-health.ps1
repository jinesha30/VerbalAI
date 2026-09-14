Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Learning Assessment Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$targets = @(
    @{ Label = 'Frontend'; Url = 'http://localhost:3000' },
    @{ Label = 'Backend'; Url = 'http://localhost:5000/health' },
    @{ Label = 'Whisper'; Url = 'http://localhost:5001/health' }
)

$allOk = $true

function Test-UrlWithRetry {
    param(
        [string]$Url,
        [int]$Retries = 10,
        [int]$DelaySeconds = 1
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            return Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 6
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    return $null
}

foreach ($target in $targets) {
    $response = Test-UrlWithRetry -Url $target.Url
    if ($response) {
        Write-Host "$($target.Label): $($response.StatusCode) -> $($target.Url)" -ForegroundColor Green
    } else {
        Write-Host "$($target.Label): FAIL -> $($target.Url)" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
if ($allOk) {
    Write-Host "All services are healthy." -ForegroundColor Green
}
else {
    Write-Host "Some services are down." -ForegroundColor Yellow
}
