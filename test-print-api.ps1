# Test Print Service API
Write-Host "Testing Print Service API..." -ForegroundColor Cyan

# Test data
$testData = @{
    tanggal = "25/01/2026 14:30"
    sales = "Test Sales"
    customerName = "Test Customer"
    customerPhone = "08123456789"
    items = @(
        @{
            nama = "Test Item 1"
            kode = "TEST001"
            kadar = "24K"
            berat = "10"
            jumlah = 1
            totalHarga = 5000000
        }
    )
    totalHarga = 5000000
    notes = "Test keterangan"
} | ConvertTo-Json -Depth 5

Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
    Write-Host "✅ Health Check OK" -ForegroundColor Green
    Write-Host $health | ConvertTo-Json
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Testing Print Invoice..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/print/invoice" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testData
    
    Write-Host "✅ Print Invoice Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
    
    if ($response.success -eq $true) {
        Write-Host "`n✅ SUCCESS: Print service is working correctly!" -ForegroundColor Green
        Write-Host "   - Job ID: $($response.jobID)" -ForegroundColor Cyan
        Write-Host "   - Printer: $($response.printer)" -ForegroundColor Cyan
        Write-Host "   - Method should be: 'service' (NOT 'browser')" -ForegroundColor Yellow
        
        if ($response.method -eq 'browser') {
            Write-Host "`n⚠️  WARNING: Response contains method='browser'" -ForegroundColor Red
            Write-Host "   This indicates fallback was used!" -ForegroundColor Red
        }
    } else {
        Write-Host "`n❌ FAILED: success=false in response" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Print Invoice Failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "StatusCode: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`n3. Testing Printers List..." -ForegroundColor Yellow
try {
    $printers = Invoke-RestMethod -Uri "http://localhost:3001/api/printers" -Method Get
    Write-Host "✅ Available Printers:" -ForegroundColor Green
    Write-Host ($printers | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "⚠️  Printers list failed: $_" -ForegroundColor Yellow
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
