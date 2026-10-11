# Run: powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
$ErrorActionPreference = 'Stop'
$useOsc8 = $Host.Name -eq 'ConsoleHost' -and
    -not [Console]::IsOutputRedirected -and $MyInvocation.PipelineLength -eq 1

function Write-Link([string]$Label, [string]$Url) {
    if ($useOsc8) {
        $esc = [char]27
        Write-Output ("${esc}]8;;${Url}${esc}\${Label}${esc}]8;;${esc}\ : ${Url}")
    } else {
        Write-Output ("${Label} : ${Url}")
    }
}

try {
    Set-Location -LiteralPath $PSScriptRoot
    & docker compose up -d --build --wait
    if ($LASTEXITCODE -ne 0) { throw 'Echec du demarrage Docker Compose.' }
    $publications = @(& docker compose port link-converter 80)
    if ($LASTEXITCODE -ne 0) { throw 'Impossible de lire la publication Docker.' }

    # Prefer IPv4 when Docker returns both address families.
    $publication = $publications | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+:\d+$' } | Select-Object -First 1
    if (-not $publication) {
        $publication = $publications | Where-Object { $_ } | Select-Object -First 1
    }
    if (-not $publication -or $publication -notmatch '^(.*):(\d+)$') {
        throw 'Publication Docker invalide.'
    }
    $bind = $Matches[1].Trim('[', ']')
    $port = 0
    if (-not [int]::TryParse($Matches[2], [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
        throw 'Port Docker invalide.'
    }
    $boundIP = $null
    if (-not [System.Net.IPAddress]::TryParse($bind, [ref]$boundIP)) {
        throw 'Adresse de publication Docker invalide.'
    }
    Write-Output 'Acces non garanti : verifier le pare-feu et le reseau.'
    if ([System.Net.IPAddress]::IsLoopback($boundIP)) {
        if ($bind -eq '127.0.0.1' -or $bind -eq '::1') {
            Write-Link 'Local' "http://localhost:$port"
        } else {
            Write-Link 'Local' "http://${bind}:$port"
        }
        Write-Output 'Bind loopback : aucun acces depuis une autre machine.'
        exit 0
    }
    if ($boundIP.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        Write-Output 'Publication IPv6 : detection du lien reseau IPv4 non prise en charge.'
        Write-Output "Local : http://localhost:$port (disponibilite non verifiee avec ce bind IPv6)"
        exit 0
    }
    if ($bind -ne '0.0.0.0') {
        Write-Output "Local : http://localhost:$port (indisponible avec ce bind)"
        Write-Link 'Reseau' "http://${bind}:$port"
        exit 0
    }

    Write-Link 'Local' "http://localhost:$port"
    $address = $null
    try {
        $config = Get-NetIPConfiguration |
            Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
            Sort-Object { $_.NetIPv4Interface.InterfaceMetric } |
            Select-Object -First 1
        $address = $config.IPv4Address | ForEach-Object { $_.IPAddress } | Select-Object -First 1
    } catch {
        # Discovery failure must not turn into a fabricated address.
        $address = $null
    }
    $detectedIP = $null
    if ($address -and [System.Net.IPAddress]::TryParse($address, [ref]$detectedIP) -and
        $detectedIP.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
        $detectedIP.GetAddressBytes()[0] -ne 0 -and $detectedIP.GetAddressBytes()[0] -lt 224 -and
        -not [System.Net.IPAddress]::IsLoopback($detectedIP)) {
        Write-Link 'Reseau' "http://${address}:$port"
    } else {
        Write-Output 'IPv4 du reseau non detectee : aucun lien distant propose.'
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
