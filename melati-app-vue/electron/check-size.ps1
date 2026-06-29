[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
$img = [System.Drawing.Image]::FromFile('../public/img/Melati.jfif')
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()
