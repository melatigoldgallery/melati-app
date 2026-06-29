[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')

# 1. Resize assets/png.png (214x214) to 256x256
$srcPath = "assets/png.png"
$destPngPath = "assets/png_temp.png"
$destIcoPath = "assets/ico.ico"

Write-Host "Resizing original PNG to 256x256..."
$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Draw stretched/scaled image to 256x256
$g.DrawImage($src, 0, 0, 256, 256)

$g.Dispose()
$bmp.Save($destPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$src.Dispose()

# 2. Package the 256x256 PNG as a valid .ico file
Write-Host "Packaging 256x256 PNG into Windows .ico container..."
$pngBytes = [System.IO.File]::ReadAllBytes($destPngPath)
$pngSize = $pngBytes.Length

# Create 22-byte ICO header
$icoHeader = New-Object Byte[] 22
# Icon Header (6 bytes)
$icoHeader[0] = 0x00 # Reserved
$icoHeader[1] = 0x00
$icoHeader[2] = 0x01 # Type (1 = Icon)
$icoHeader[3] = 0x00
$icoHeader[4] = 0x01 # Image count (1 image)
$icoHeader[5] = 0x00

# Directory Entry (16 bytes)
$icoHeader[6] = 0x00 # Width (0 = 256)
$icoHeader[7] = 0x00 # Height (0 = 256)
$icoHeader[8] = 0x00 # Color palette (0)
$icoHeader[9] = 0x00 # Reserved

$icoHeader[10] = 0x01 # Planes (1)
$icoHeader[11] = 0x00
$icoHeader[12] = 0x20 # Bits per pixel (32)
$icoHeader[13] = 0x00

# Image size (4 bytes - Little Endian)
$icoHeader[14] = [byte]($pngSize -band 0xFF)
$icoHeader[15] = [byte](($pngSize -shr 8) -band 0xFF)
$icoHeader[16] = [byte](($pngSize -shr 16) -band 0xFF)
$icoHeader[17] = [byte](($pngSize -shr 24) -band 0xFF)

# Image offset (4 bytes - Little Endian: 22 decimal = 0x16)
$icoHeader[18] = 0x16
$icoHeader[19] = 0x00
$icoHeader[20] = 0x00
$icoHeader[21] = 0x00

# Combine header and PNG bytes
$icoBytes = New-Object Byte[] (22 + $pngSize)
[System.Buffer]::BlockCopy($icoHeader, 0, $icoBytes, 0, 22)
[System.Buffer]::BlockCopy($pngBytes, 0, $icoBytes, 22, $pngSize)

# Write output ICO
[System.IO.File]::WriteAllBytes($destIcoPath, $icoBytes)

# 3. Clean up and overwrite assets/png.png with 256x256 version
Remove-Item $srcPath -Force
Rename-Item $destPngPath "png.png" -Force

Write-Host "Success! Generated 256x256 PNG and ICO files in assets/."
