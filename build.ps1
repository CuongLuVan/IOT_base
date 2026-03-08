# GPIO Simulator Build Script for Windows
# Requires: g++ compiler (MinGW64)

Write-Host "==============================================="
Write-Host "  GPIO Simulator - Build Script"
Write-Host "==============================================="
Write-Host ""

# Check if g++ is installed
Write-Host "Checking for g++ compiler..."
try {
    $gppVersion = g++ --version
    Write-Host "[OK] g++ found"
} catch {
    Write-Host "[ERROR] g++ not found! Please install MinGW64"
    Write-Host "  Download from: https://www.msys2.org/"
    exit 1
}

# Create build directory
Write-Host "Creating build directory..."
if (!(Test-Path "build")) {
    mkdir build | Out-Null
    Write-Host "[OK] Build directory created"
} else {
    Write-Host "[OK] Build directory exists"
}

# Compile
Write-Host ""
Write-Host "Compiling source files..."
Write-Host ""

# collect source files
$sourceFiles = "main.cpp gpio/VirtualGPIO.cpp TaskSensor.cpp TaskDevice.cpp TaskNetwork.cpp WifiNetwork.cpp RealTimeControl.cpp"
# you may also use wildcard if shell supports: $(Get-ChildItem -Filter *.cpp -Recurse | Select-Object -ExpandProperty FullName -join ' ')
$outputFile = "build/app.exe"
$flags = "-std=c++17 -Wall -Wextra -pthread"

$compileCmd = "g++ $flags -o $outputFile $sourceFiles"
Write-Host "Command: $compileCmd"
Write-Host ""

Invoke-Expression $compileCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Compilation successful!"
    Write-Host ""
    Write-Host "Running application..."
    Write-Host ""
    Write-Host "==============================================="
    Write-Host ""
    
    & ".\build\app.exe"
    
    Write-Host ""
    Write-Host "==============================================="
    Write-Host "[OK] Execution complete"
} else {
    Write-Host ""
    Write-Host "[ERROR] Compilation failed!"
    exit 1
}
