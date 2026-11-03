# Generates the ECDSA P-256 PKI for MqttBroker1885.js and the devices.
#
#   .\generate_ecdsa_certs.ps1                     # devices from ../mqtt_device_certs.json
#   .\generate_ecdsa_certs.ps1 -Devices device1,iot_ai_control -ServerSan "DNS:mqtt.example.com"
#   .\generate_ecdsa_certs.ps1 -NewCA              # also replaces ca.key/ca.crt
#
# Output (in this folder):
#   ca.crt / ca.key           CA (keep ca.key offline)
#   server.crt / server.key   broker certificate (tlsOptions in MqttBroker1885.js)
#   <id>.crt / <id>.key       device certificate + PKCS#8 key (Node.js clients, testMqtt)
#   <id>.esp.key              same key as SEC1 without the public key: the
#                             smallest form, for the device EEPROM
# and updates the fingerprint256 of every device in ../mqtt_device_certs.json.
param(
    [string[]]$Devices,
    [string]$ServerCN = '103.1.238.175',
    [string]$ServerSan = 'DNS:localhost,IP:127.0.0.1,IP:103.1.238.175',  # keep in sync with pki.cnf [v3_server]
    [int]$Days = 3650,
    [switch]$NewCA
)

$ErrorActionPreference = 'Stop'
$env:MSYS_NO_PATHCONV = '1'
Set-Location -LiteralPath $PSScriptRoot

$openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
if (-not $openssl) { $openssl = 'C:\Program Files\Git\usr\bin\openssl.exe' }
if (-not (Test-Path -LiteralPath $openssl)) { throw 'openssl not found (install Git for Windows or OpenSSL).' }

# openssl reports progress on stderr; Windows PowerShell would treat that as
# an error under 'Stop', so only the exit code decides failure.
function Invoke-OpenSsl {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $openssl @args 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'self-signature ok|^subject=' }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    if ($code -ne 0) { throw "openssl $($args -join ' ') failed" }
}

function New-EcKey([string]$Path) {
    Invoke-OpenSsl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out $Path
}

# Device EEPROM regions (define_All.h: MTLS_*_MAX_LENGTH, without the '\0').
$limits = @{ ca = 703; cert = 767; key = 255 }

function Assert-Fits([string]$Path, [int]$Limit) {
    $size = (Get-Item -LiteralPath $Path).Length
    if ($size -gt $Limit) { throw "$Path is $size B; the device region holds $Limit B." }
    Write-Host ("  {0,-22} {1,4} B (max {2})" -f $Path, $size, $Limit)
}

function New-SignedCert([string]$Name, [string]$CommonName, [string[]]$Extensions) {
    $ext = "$Name.ext"
    $csr = "$Name.csr"
    [IO.File]::WriteAllLines((Join-Path $PSScriptRoot $ext), $Extensions)
    try {
        Invoke-OpenSsl req -new -key "$Name.key" -subj "/CN=$CommonName" -out $csr
        Invoke-OpenSsl x509 -req -in $csr -CA ca.crt -CAkey ca.key -CAcreateserial `
            -days $Days -sha256 -extfile $ext -out "$Name.crt"
    } finally {
        Remove-Item -LiteralPath $ext, $csr -ErrorAction SilentlyContinue
    }
}

$mapPath = Join-Path $PSScriptRoot '..\mqtt_device_certs.json'
$map = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
if (-not $Devices) { $Devices = @($map.devices | ForEach-Object { $_.clientId }) }

if ($NewCA -or -not (Test-Path ca.key) -or -not (Test-Path ca.crt)) {
    Write-Host 'Creating CA'
    New-EcKey ca.key
    Invoke-OpenSsl req -x509 -new -key ca.key -sha256 -days $Days -subj '/CN=Local MQTT CA' `
        -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' `
        -out ca.crt
}

Write-Host 'Creating broker certificate'
New-EcKey server.key
New-SignedCert 'server' $ServerCN @(
    'basicConstraints=critical,CA:FALSE',
    'keyUsage=critical,digitalSignature',
    'extendedKeyUsage=serverAuth',
    "subjectAltName=$ServerSan")

foreach ($id in $Devices) {
    Write-Host "Creating device certificate $id"
    New-EcKey "$id.key"
    New-SignedCert $id $id @(
        'basicConstraints=critical,CA:FALSE',
        'keyUsage=critical,digitalSignature',
        'extendedKeyUsage=clientAuth')
    Invoke-OpenSsl ec -in "$id.key" -no_public -out "$id.esp.key"

    $line = & $openssl x509 -in "$id.crt" -noout -fingerprint -sha256
    $fingerprint = ($line -split '=', 2)[1].Trim()
    $entry = $map.devices | Where-Object { $_.clientId -eq $id } | Select-Object -First 1
    if ($entry) {
        $entry | Add-Member -NotePropertyName fingerprint256 -NotePropertyValue $fingerprint -Force
    } else {
        $map.devices += [pscustomobject]@{ clientId = $id; fingerprint256 = $fingerprint }
    }
}

# UTF-8 without BOM: the broker parses this file with JSON.parse().
$json = $map | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($mapPath, $json + "`n", (New-Object Text.UTF8Encoding($false)))

Invoke-OpenSsl verify -CAfile ca.crt server.crt @($Devices | ForEach-Object { "$_.crt" })

Write-Host 'Device EEPROM sizes:'
Assert-Fits ca.crt $limits.ca
foreach ($id in $Devices) {
    Assert-Fits "$id.crt" $limits.cert
    Assert-Fits "$id.esp.key" $limits.key
}
Write-Host "Updated $mapPath. Provision ca.crt, <id>.crt and <id>.esp.key into the device EEPROM."
